import { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { useAuth } from '../../hooks/useAuth';
import { deleteAccount } from '../../db/account';
import { syncNow } from '../../db/cloudSync';
import {
  getMyHandle,
  getAutoPublic,
  setAutoPublic,
  listMyMapsPublish,
  setMapPublic,
  type MyMapPublish,
} from '../../db/publish';
import { handleUrl, mapUrl } from '../../utils/publish';
import { track } from '../../lib/analytics';
import { HandleForm } from '../Toolbar/HandleForm';
import { MAP_THEMES, type MapTheme } from '../../utils/mapTheme';
import { ShortcutList } from '../ShortcutsHelp/ShortcutsHelp';
import { BYTES_PER_NODE, QUOTA_BYTES, getStorageUsed } from '../../db/storage';

/**
 * 설정창.
 *
 * 새 설정을 만들려고 연 자리가 아니라, **흩어져 있던 것을 모으려고** 연 자리다.
 * 노트 패널 위치는 노트 창 안의 작은 토글에만 있었고(아는 사람만 알았다),
 * 회원 탈퇴와 처리방침은 계정 드롭다운 깊숙이 있었다.
 *
 * 공개 여부는 **툴바와 여기 두 곳에** 있다. 역할이 다르다:
 * - 툴바: 지금 보는 맵이 공개인지 한눈에 (두 번 클릭해야 보이면 "공개인 줄 모르는"
 *   상태가 생긴다)
 * - 여기: 내 맵 전체에서 무엇을 공개했는지 한 화면에
 * 둘 다 DB에서 읽고, 한쪽에서 바꾸면 publishRevision 신호로 다른 쪽이 다시 읽는다.
 *
 * ponytail: 탭은 지금 채울 게 있는 것뿐이다. 연동·결제는 그 기능을
 * 만드는 날 탭을 더한다 — 빈 탭을 미리 두면 몇 달간 "준비 중"으로 남는다.
 */
type Tab = '화면' | '단축키' | '공개' | '계정';
const TABS: Tab[] = ['화면', '단축키', '공개', '계정'];

export function SettingsDialog() {
  const isOpen = useMindMapStore((s) => s.isSettingsOpen);
  const setOpen = useMindMapStore((s) => s.setSettingsOpen);
  const [tab, setTab] = useState<Tab>('화면');
  // 창을 끌어 옮긴 거리. 맵 모양을 바꾸면서 뒤의 맵을 볼 수 있게 한다.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragFrom = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="설정"
      >
        {/* 제목 줄을 잡고 끌면 창이 움직인다 */}
        <div
          className="flex cursor-move touch-none select-none items-center gap-1 border-b border-slate-800 px-4 py-3"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragFrom.current = { px: e.clientX, py: e.clientY, ...offset };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = dragFrom.current;
            if (d) setOffset({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py });
          }}
          onPointerUp={() => (dragFrom.current = null)}
        >
          <span className="text-sm font-semibold text-slate-100">설정</span>
          <div className="flex-1" />
          <button
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            onClick={() => setOpen(false)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-800 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t}
              className={`rounded-t px-3 py-1.5 text-xs ${
                tab === t
                  ? 'border-b-2 border-indigo-500 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {tab === '화면' ? (
            <ScreenTab />
          ) : tab === '단축키' ? (
            <ShortcutList className="space-y-5" editable />
          ) : tab === '공개' ? (
            <PublishTab />
          ) : (
            <AccountTab />
          )}
        </div>
      </div>
    </div>
  );
}

function ScreenTab() {
  const side = useMindMapStore((s) => s.notePanelSide);
  const setSide = useMindMapStore((s) => s.setNotePanelSide);
  const theme = useMindMapStore((s) => s.mapTheme);
  const setTheme = useMindMapStore((s) => s.setMapTheme);
  const width = useMindMapStore((s) => s.noteDrawerWidth);
  const setWidth = useMindMapStore((s) => s.setNoteDrawerWidth);

  return (
    <div className="space-y-5">
      <Row label="맵 모양" hint="노드와 선을 그리는 방식. 내용은 바뀌지 않습니다. 이 브라우저에만 저장됩니다.">
        <div className="grid grid-cols-3 gap-2">
          {MAP_THEMES.map((t) => (
            <button
              key={t.id}
              className={`flex flex-col items-center gap-1 rounded-lg border bg-slate-950 px-2 pb-1.5 pt-2 text-xs ${
                theme === t.id
                  ? 'border-indigo-500 font-semibold text-white ring-1 ring-indigo-500'
                  : 'border-slate-700 text-slate-200 hover:border-slate-500'
              }`}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
            >
              <ThemePreview theme={t.id} />
              {t.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="노트 패널 위치" hint="노트 창을 화면 어느 쪽에 붙일지. 이 브라우저에만 저장됩니다.">
        <div className="flex gap-1">
          {(['left', 'right'] as const).map((s) => (
            <button
              key={s}
              className={`rounded px-3 py-1.5 text-xs ${
                side === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => setSide(s)}
            >
              {s === 'left' ? '왼쪽' : '오른쪽'}
            </button>
          ))}
        </div>
      </Row>

      <Row label="노트 패널 너비" hint={`${Math.round(width)}px — 노트 창 가장자리를 끌어서도 바꿀 수 있습니다.`}>
        <input
          type="range"
          min={280}
          max={Math.round(window.innerWidth * 0.75)}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-full accent-indigo-500"
          aria-label="노트 패널 너비"
        />
      </Row>
    </div>
  );
}

/**
 * 내 맵 전체의 공개 여부를 한 화면에서 본다.
 *
 * 켤 때는 툴바와 똑같이 **동기화를 먼저** 한다 — 맵은 평소 브라우저에만 있어서,
 * 그냥 켜면 방문자가 서버에 마지막으로 올라간 옛 내용을 본다.
 */
function PublishTab() {
  const { session } = useAuth();
  const revision = useMindMapStore((s) => s.publishRevision);
  const bump = useMindMapStore((s) => s.bumpPublishRevision);

  // 어느 시점(revision)의 결과인지 함께 든다 → 바뀌면 저절로 "불러오는 중"이 된다
  const [loaded, setLoaded] = useState<{
    revision: number;
    handle: string | null;
    autoPublic: boolean;
    maps: MyMapPublish[];
  } | null>(null);
  const data = loaded?.revision === revision ? loaded : null;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 전체 공개는 한 번에 모든 맵을 드러내므로 확인 단계를 거친다 (탈퇴와 같은 방식)
  const [confirmingAll, setConfirmingAll] = useState(false);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    Promise.all([getMyHandle(), getAutoPublic(), listMyMapsPublish()])
      .then(
        ([handle, autoPublic, maps]) => alive && setLoaded({ revision, handle, autoPublic, maps })
      )
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [session, revision]);

  if (!session) {
    return <p className="text-xs text-slate-400">로그인하면 맵을 공개할 수 있습니다.</p>;
  }
  if (!data) {
    return (
      <p className="text-xs text-slate-500">
        {error ?? '불러오는 중…'}
      </p>
    );
  }

  const toggle = async (map: MyMapPublish) => {
    if (busyId) return;
    const next = !map.isPublic;
    setBusyId(map.id);
    setError(null);
    try {
      if (next) await syncNow();
      await setMapPublic(map.id, map.title, next);
      if (next) track('map_published', { map_id: map.id });
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  /**
   * 전체 공개 / 전체 비공개.
   *
   * 전체 공개는 "지금 있는 맵을 다 켠다"에서 끝나지 않고 **모드**로 남는다 —
   * 켜 두면 앞으로 만드는 맵도 공개된다. 맵 하나를 개별로 끄면 모드도 꺼진다.
   *
   * 이미 원하는 상태인 맵은 건드리지 않는다. 하나가 실패하면 거기서 멈추고,
   * 그때까지 바뀐 것은 그대로 둔 채 목록을 다시 읽어 실제 상태를 보여준다 —
   * "전부 됐다"거나 "전부 안 됐다"고 뭉개지 않는다.
   */
  const setAll = async (next: boolean) => {
    if (busyId) return;
    const targets = data.maps.filter((m) => m.isPublic !== next);
    setConfirmingAll(false);
    setBusyId('*');
    setError(null);
    try {
      // 동기화는 맵마다 하지 않고 한 번만 — 전체를 올리는 동작이라 한 번이면 충분하다
      if (next) await syncNow();
      for (const m of targets) {
        await setMapPublic(m.id, m.title, next);
        if (next) track('map_published', { map_id: m.id });
      }
      // 전부 성공한 뒤에만 모드를 바꾼다. 중간에 실패했는데 "전체 공개"로 표시되면 거짓이다.
      await setAutoPublic(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
      bump(); // 성공이든 중간 실패든 실제 상태를 다시 읽는다
    }
  };

  const copy = async (map: MyMapPublish) => {
    if (!map.slug) return;
    if (!data.handle) return;
    await navigator.clipboard.writeText(mapUrl(data.handle, map.slug));
    setCopiedId(map.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const publicCount = data.maps.filter((m) => m.isPublic).length;
  // 토글은 "전부 공개인가"가 아니라 **전체 공개 모드인가**를 보여준다.
  // 모드가 켜져 있으면 앞으로 만드는 맵도 공개된다.
  const allPublic = data.autoPublic;

  return (
    <div className="space-y-5">
      <Row label="닉네임" hint="공개 주소 /u/<닉네임> 에 쓰입니다.">
        {data.handle === null ? (
          <HandleForm onClaimed={bump} />
        ) : (
          <a
            className="text-xs text-indigo-400 hover:text-indigo-300"
            href={`/u/${encodeURIComponent(data.handle)}`}
            target="_blank"
            rel="noreferrer"
          >
            {handleUrl(data.handle).replace(/^https?:\/\//, '')} ↗
          </a>
        )}
      </Row>

      <Row
        label={`내 맵 (${publicCount}개 공개 중 / 전체 ${data.maps.length}개)`}
        hint="공개한 맵은 링크를 받은 사람이 로그인 없이 읽을 수 있습니다. 고칠 수는 없습니다."
      >
        {data.maps.length === 0 ? (
          <p className="text-xs text-slate-500">
            서버에 올라간 맵이 없습니다. 툴바의 동기화를 먼저 눌러 주세요.
          </p>
        ) : (
          <>
          {/* 전체 토글 = 전체 공개 모드. 켜 두면 새로 만드는 맵도 공개된다.
              맵 하나를 개별로 끄면 이 모드도 같이 꺼진다. */}
          <div className="mb-2 rounded-lg border border-slate-800 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-200">전체 공개</div>
                <div className="text-[10px] text-slate-500">
                  켜 두면 앞으로 만드는 맵도 자동으로 공개됩니다.
                </div>
              </div>
              {publicCount > 0 && !allPublic && (
                <button
                  className="text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-40"
                  onClick={() => setAll(false)}
                  disabled={busyId !== null}
                >
                  모두 끄기
                </button>
              )}
              <button
                role="switch"
                aria-checked={allPublic}
                aria-label="전체 공개"
                disabled={busyId !== null || data.handle === null}
                onClick={() => (allPublic ? setAll(false) : setConfirmingAll(true))}
                className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                  allPublic ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    allPublic ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            {confirmingAll && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-amber-300">
                  지금 있는 맵 {data.maps.length}개와 앞으로 만드는 맵이 모두 공개됩니다.
                </span>
                <button
                  className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] text-white hover:bg-emerald-600"
                  onClick={() => setAll(true)}
                >
                  모두 공개
                </button>
                <button
                  className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                  onClick={() => setConfirmingAll(false)}
                >
                  취소
                </button>
              </div>
            )}
          </div>
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {data.maps.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-slate-200">{m.title}</div>
                  {m.isPublic && m.slug && (
                    <button
                      className="mt-0.5 max-w-full truncate text-left text-[10px] text-indigo-400 hover:text-indigo-300"
                      onClick={() => copy(m)}
                      title="눌러서 링크 복사"
                    >
                      {copiedId === m.id ? '복사했습니다' : `/m/${data.handle}/${m.slug} · 복사`}
                    </button>
                  )}
                </div>
                <button
                  role="switch"
                  aria-checked={m.isPublic}
                  aria-label={`${m.title} 공개`}
                  disabled={busyId !== null || data.handle === null}
                  onClick={() => toggle(m)}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                    m.isPublic ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      m.isPublic ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
        {busyId && <p className="mt-2 text-[11px] text-slate-500">처리 중… (켤 때는 먼저 동기화합니다)</p>}
        {data.handle === null && data.maps.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">닉네임을 먼저 정해야 공개할 수 있습니다.</p>
        )}
        {error && <div className="mt-2 break-words text-[11px] text-red-300">{error}</div>}
      </Row>
    </div>
  );
}

/**
 * 클라우드 저장 공간을 얼마나 썼는지. 노드 개수에는 제한이 없고 전체 용량에만 상한이 있어서,
 * "노드로 치면 얼마나 더 들어가는지"를 어림으로 같이 보여 준다.
 */
function StorageRow() {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getStorageUsed()
      .then((v) => alive && setUsed(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (used === null) return null; // 못 읽었으면 틀린 숫자를 보여 주느니 숨긴다
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  const percent = Math.min(100, (used / QUOTA_BYTES) * 100);
  const nodesLeft = Math.max(0, Math.floor((QUOTA_BYTES - used) / BYTES_PER_NODE / 100) * 100);
  return (
    <Row
      label="저장 공간"
      hint={`노드 개수에는 제한이 없습니다. 노트를 포함한 노드로 약 ${nodesLeft.toLocaleString()}개 더 넣을 수 있습니다.`}
    >
      <div
        className="h-2 overflow-hidden rounded bg-slate-800"
        role="progressbar"
        aria-label="저장 공간 사용량"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded ${percent > 90 ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.max(percent, 1)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {mb(used)}MB / {mb(QUOTA_BYTES)}MB 사용 ({percent.toFixed(1)}%)
      </div>
    </Row>
  );
}

function AccountTab() {
  const { session } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <p className="text-xs text-slate-400">로그인하면 계정 설정이 여기 표시됩니다.</p>;
  }

  const runDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      location.reload(); // 계정이 사라졌으니 처음 화면으로
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5">
      <Row label="계정" hint="로그인에 쓴 GitHub 또는 Google 계정입니다.">
        <div className="truncate text-xs text-slate-300">{session.user.email ?? '이메일 없음'}</div>
      </Row>

      <StorageRow />

      <Row label="개인정보" hint="수집 항목, 보관 기간, 국외 이전 사업자를 적어 두었습니다.">
        <a className="text-xs text-indigo-400 hover:text-indigo-300" href="/privacy">
          개인정보 처리방침 ↗
        </a>
      </Row>

      <div className="border-t border-slate-800 pt-4">
        <div className="text-xs font-medium text-slate-300">회원 탈퇴</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          계정과 모든 맵이 지워집니다. 되돌릴 수 없습니다.
        </p>
        {!confirming ? (
          <button
            className="mt-2 rounded bg-slate-800 px-3 py-1.5 text-[11px] text-slate-400 hover:bg-red-900/40 hover:text-red-300"
            onClick={() => setConfirming(true)}
          >
            탈퇴하기
          </button>
        ) : (
          <div className="mt-2 flex gap-2">
            <button
              className="rounded bg-red-900/60 px-3 py-1.5 text-[11px] text-red-100 hover:bg-red-900 disabled:opacity-50"
              onClick={runDelete}
              disabled={deleting}
            >
              {deleting ? '지우는 중…' : '정말 탈퇴'}
            </button>
            <button
              className="rounded bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700"
              onClick={() => setConfirming(false)}
            >
              취소
            </button>
          </div>
        )}
        {error && <div className="mt-2 break-words text-[11px] text-red-300">{error}</div>}
      </div>
    </div>
  );
}

/** 맵 모양을 고르기 전에 차이를 보여 주는 작은 그림: 중심 주제 하나와 가지 둘. */
function ThemePreview({ theme }: { theme: MapTheme }) {
  const classic = theme === 'classic';
  const underline = theme === 'underline';
  const rows = [
    { y: 15, label: '컬렉션', color: classic ? '#6366f1' : '#7aa2f7' },
    { y: 45, label: 'JVM', color: classic ? '#6366f1' : '#9ece6a' },
  ];
  // 밑줄형은 선이 글자 아래(밑줄)로 들어간다
  const drop = underline ? 8 : 0;
  return (
    <svg viewBox="0 0 120 60" className="w-full" aria-hidden="true">
      {rows.map(({ y, label, color }) => (
        <g key={y}>
          <path
            d={`M 36 30 H 46 V ${y + drop} H ${underline ? 112 : 56}`}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            strokeLinejoin="round"
          />
          {classic && <rect x={56} y={y - 9} width={56} height={18} rx={4} fill="#1e293b" stroke="#475569" />}
          <text x={classic ? 63 : 60} y={y} dominantBaseline="central" fontSize={10} fontWeight={500} fill="#f1f5f9">
            {label}
          </text>
        </g>
      ))}
      <rect
        x={4}
        y={20}
        width={32}
        height={20}
        rx={5}
        fill={classic ? '#1e293b' : '#6366f1'}
        stroke={classic ? '#475569' : 'none'}
      />
      <text x={20} y={30} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#ffffff">
        자바
      </text>
    </svg>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-300">{label}</div>
      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
