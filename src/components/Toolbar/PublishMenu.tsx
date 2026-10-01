import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMindMapStore } from '../../store/useMindMapStore';
import { syncNow } from '../../db/cloudSync';
import { getMyHandle, getPublishState, setMapPublic, type PublishState } from '../../db/publish';
import { mapUrl, handleUrl } from '../../utils/publish';
import { track } from '../../lib/analytics';
import { HandleForm } from './HandleForm';

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
  // 설정창에서 공개 여부나 닉네임을 바꾸면 오른다 → 여기 들고 있는 값을 다시 읽는다
  const revision = useMindMapStore((s) => s.publishRevision);
  const bumpRevision = useMindMapStore((s) => s.bumpPublishRevision);

  const [isOpen, setIsOpen] = useState(false);
  // 어느 맵의 결과인지 함께 들고 있는다. 맵이 바뀌면 값이 저절로 "모름"이 되므로
  // 효과 안에서 초기화할 필요가 없고, 옛 맵의 상태가 잠깐 비치는 일도 없다.
  const [loaded, setLoaded] = useState<{
    mapId: string;
    revision: number;
    value: PublishState | null;
  } | null>(null);
  const state =
    loaded?.mapId === mapId && loaded.revision === revision ? loaded.value : undefined;
  // 닉네임도 같은 방식 — 설정창에서 정했는데 여기서 또 입력란을 띄우면 안 된다
  const [loadedHandle, setLoadedHandle] = useState<{
    revision: number;
    value: string | null;
  } | null>(null);
  const handle = loadedHandle?.revision === revision ? loadedHandle.value : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * 공개 여부는 **패널을 열기 전에도** 정확해야 한다.
   *
   * 예전에는 패널을 열 때만 읽어서 쿼리를 아꼈는데, 읽기 전까지 상태가 비어 있어
   * 버튼이 "비공개"로 보였다. 실제로는 공개 중인 맵에서도 그랬다. 개인정보 기능에서
   * "공개인데 비공개로 보이는" 오류는 사용자를 안심시킨 채 노출시키므로 가장 나쁘다.
   * 맵을 열 때 가벼운 쿼리 하나를 더 쏘는 값은 그에 비하면 싸다.
   */
  useEffect(() => {
    if (!session) return;
    let alive = true; // 맵을 빠르게 바꾸면 옛 응답이 나중에 도착할 수 있다
    getPublishState(mapId)
      .then((s) => alive && setLoaded({ mapId, revision, value: s }))
      .catch(() => alive && setLoaded({ mapId, revision, value: null }));
    return () => {
      alive = false;
    };
  }, [session, mapId, revision]);

  // 닉네임은 패널을 열 때만 필요하다.
  useEffect(() => {
    if (!isOpen || !session || handle !== undefined) return;
    let alive = true;
    getMyHandle()
      .then((h) => alive && setLoadedHandle({ revision, value: h }))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [isOpen, session, handle, revision]);

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

  const toggle = (next: boolean) =>
    run(async () => {
      // 켤 때만 올린다. 끄는 건 서버 상태만 바꾸는 일이라 기다릴 이유가 없다.
      if (next) await syncNow();
      await setMapPublic(mapId, title, next);
      if (next) track('map_published', { map_id: mapId });
      // 값을 직접 넣지 않고 신호만 올린다 → 이 버튼도 설정창도 DB에서 다시 읽는다
      bumpRevision();
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
          state === undefined
            ? 'bg-slate-800 text-slate-500'
            : live
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
        {state === undefined ? '공개 설정…' : live ? '🌐 공개 중' : '🔒 비공개'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className={PANEL}>
            <div className="text-sm font-semibold text-slate-100">공개 발행</div>

            {handle === undefined ? (
              <p className="mt-2 text-[11px] text-slate-500">불러오는 중…</p>
            ) : handle === null ? (
              <HandleForm onClaimed={bumpRevision} />
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
                  disabled={busy || state == null}
                >
                  {busy ? '처리 중…' : live ? '공개 끄기' : '공개 켜기'}
                </button>

                {live && state?.slug && (
                  <div className="mt-3 space-y-1">
                    <LinkRow label="이 맵" url={mapUrl(handle, state.slug)} onCopy={copy} />
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
