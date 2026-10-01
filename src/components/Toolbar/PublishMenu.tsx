import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMindMapStore } from '../../store/useMindMapStore';
import { syncNow } from '../../db/cloudSync';
import {
  getMyHandle,
  getPublishState,
  claimHandle,
  setMapPublic,
  type PublishState,
} from '../../db/publish';
import { validateHandle, normalizeHandle, mapUrl, handleUrl } from '../../utils/publish';
import { track } from '../../lib/analytics';

const PANEL =
  'absolute top-full right-0 mt-1 z-40 w-72 whitespace-normal rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-3';

/**
 * 공개 발행 스위치.
 *
 * 공개를 켜기 전에 **반드시 동기화를 먼저 한다.** 맵은 평소 브라우저(IndexedDB)에만 있고
 * 서버에는 마지막으로 올린 판본이 있다. 그대로 공개하면 방문자가 옛날 내용을 보게 된다.
 */
export function PublishMenu() {
  const { session, cloudEnabled } = useAuth();
  const mapId = useMindMapStore((s) => s.mindMapData.id);
  const title = useMindMapStore((s) => s.mindMapData.title);

  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<PublishState | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 패널을 열 때만 읽는다 — 툴바가 뜰 때마다 쿼리 두 개를 쏘지 않기 위해.
  useEffect(() => {
    if (!isOpen || !session) return;
    Promise.all([getPublishState(mapId), getMyHandle()])
      .then(([s, h]) => {
        setState(s);
        setHandle(h);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [isOpen, session, mapId]);

  if (!cloudEnabled || !session) return null;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitHandle = () =>
    run(async () => {
      const normalized = normalizeHandle(handleInput);
      const reason = validateHandle(normalized);
      if (reason) throw new Error(reason);
      await claimHandle(normalized);
      setHandle(normalized);
    });

  const toggle = (next: boolean) =>
    run(async () => {
      // 켤 때만 올린다. 끄는 건 서버 상태만 바꾸는 일이라 기다릴 이유가 없다.
      if (next) await syncNow();
      const result = await setMapPublic(mapId, title, next);
      setState(result);
      if (next) track('map_published', { map_id: mapId });
    });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const live = state?.isPublic === true;

  return (
    <div className="relative">
      <button
        className={`px-2 py-1.5 rounded text-xs ${
          live
            ? 'bg-emerald-800/60 text-emerald-200 hover:bg-emerald-800'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        onClick={() => {
          setError(null); // 지난번 실패 문구를 들고 다시 열지 않는다
          setIsOpen((v) => !v);
        }}
        aria-expanded={isOpen}
        title="이 맵을 공개할지 정합니다"
      >
        {live ? '🌐 공개 중' : '🔒 비공개'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className={PANEL}>
            <div className="text-sm font-semibold text-slate-100">공개 발행</div>

            {handle === null ? (
              <>
                <p className="mt-1 mb-2 text-[11px] leading-relaxed text-slate-400">
                  공개하려면 먼저 닉네임이 필요합니다. 공개 주소에 쓰이고, 나중에 바꾸기
                  어렵습니다.
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>/u/</span>
                  <input
                    className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-600"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitHandle()}
                    placeholder="my-handle"
                    autoFocus
                  />
                </div>
                <button
                  className="mt-2 h-8 w-full rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  onClick={submitHandle}
                  disabled={busy}
                >
                  {busy ? '저장 중…' : '닉네임 정하기'}
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 mb-3 text-[11px] leading-relaxed text-slate-400">
                  {live
                    ? '링크를 받은 사람은 로그인 없이 읽을 수 있습니다. 고칠 수는 없습니다.'
                    : '켜면 이 맵의 내용이 링크로 공개됩니다. 언제든 다시 끌 수 있습니다.'}
                </p>

                <button
                  className={`h-8 w-full rounded-md text-xs font-medium disabled:opacity-50 ${
                    live
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-emerald-700 text-white hover:bg-emerald-600'
                  }`}
                  onClick={() => toggle(!live)}
                  disabled={busy || state === null}
                >
                  {busy ? '처리 중…' : live ? '공개 끄기' : '공개 켜기'}
                </button>

                {live && state?.slug && (
                  <div className="mt-3 space-y-1">
                    <LinkRow label="이 맵" url={mapUrl(state.slug)} onCopy={copy} />
                    <LinkRow label="내 목록" url={handleUrl(handle)} onCopy={copy} />
                    {copied && <div className="text-[10px] text-emerald-400">복사했습니다</div>}
                  </div>
                )}
              </>
            )}

            {error && <div className="mt-2 text-[11px] text-red-300 break-words">{error}</div>}
          </div>
        </>
      )}
    </div>
  );
}

function LinkRow({
  label,
  url,
  onCopy,
}: {
  label: string;
  url: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-12 flex-shrink-0 text-[10px] text-slate-500">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-[11px] text-indigo-400 hover:text-indigo-300"
        title={url}
      >
        {url.replace(/^https?:\/\//, '')}
      </a>
      <button
        className="flex-shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
        onClick={() => onCopy(url)}
      >
        복사
      </button>
    </div>
  );
}
