import { useEffect, useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { useAuth } from '../../hooks/useAuth';
import { deleteAccount } from '../../db/account';
import { getMyHandle } from '../../db/publish';
import { handleUrl } from '../../utils/publish';

/**
 * 설정창.
 *
 * 새 설정을 만들려고 연 자리가 아니라, **흩어져 있던 것을 모으려고** 연 자리다.
 * 노트 패널 위치는 노트 창 안의 작은 토글에만 있었고(아는 사람만 알았다),
 * 회원 탈퇴와 처리방침은 계정 드롭다운 깊숙이 있었다.
 *
 * 여기 넣지 않는 것: **맵마다 다른 설정.** 공개 여부가 그렇다. 두 번 클릭해야
 * 보이는 자리에 두면 "내 맵이 공개인지 모르는" 상태가 생기고, 그건 방금 고친
 * 버그와 같은 사고다. 맵마다 다른 것은 툴바에 상시 노출한다.
 *
 * ponytail: 탭은 지금 채울 게 있는 둘뿐이다. 연동·결제·단축키 커스텀은 그 기능을
 * 만드는 날 탭을 더한다 — 빈 탭을 미리 두면 몇 달간 "준비 중"으로 남는다.
 */
type Tab = '화면' | '계정';

export function SettingsDialog() {
  const isOpen = useMindMapStore((s) => s.isSettingsOpen);
  const setOpen = useMindMapStore((s) => s.setSettingsOpen);
  const [tab, setTab] = useState<Tab>('화면');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="설정"
      >
        <div className="flex items-center gap-1 border-b border-slate-800 px-4 py-3">
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
          {(['화면', '계정'] as Tab[]).map((t) => (
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
          {tab === '화면' ? <ScreenTab /> : <AccountTab />}
        </div>
      </div>
    </div>
  );
}

function ScreenTab() {
  const side = useMindMapStore((s) => s.notePanelSide);
  const setSide = useMindMapStore((s) => s.setNotePanelSide);
  const width = useMindMapStore((s) => s.noteDrawerWidth);
  const setWidth = useMindMapStore((s) => s.setNoteDrawerWidth);
  const setShortcutsOpen = useMindMapStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useMindMapStore((s) => s.setSettingsOpen);

  return (
    <div className="space-y-5">
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

      <Row label="단축키" hint="Tab 자식 추가, Enter 형제 추가, Ctrl+F 검색 등">
        <button
          className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          onClick={() => {
            setSettingsOpen(false);
            setShortcutsOpen(true);
          }}
        >
          단축키 목록 보기
        </button>
      </Row>
    </div>
  );
}

function AccountTab() {
  const { session } = useAuth();
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMyHandle()
      .then(setHandle)
      .catch(() => setHandle(null));
  }, [session]);

  if (!session) {
    return (
      <p className="text-xs text-slate-400">
        로그인하면 닉네임과 계정 설정이 여기 표시됩니다.
      </p>
    );
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
      <Row label="계정" hint="GitHub 로그인으로 연결된 계정입니다.">
        <div className="truncate text-xs text-slate-300">{session.user.email ?? '이메일 없음'}</div>
      </Row>

      <Row label="닉네임" hint="공개 주소 /u/<닉네임> 에 쓰입니다. 처음 맵을 공개할 때 정합니다.">
        {handle === undefined ? (
          <div className="text-xs text-slate-500">불러오는 중…</div>
        ) : handle === null ? (
          <div className="text-xs text-slate-500">아직 없음 — 툴바의 공개 스위치에서 정합니다.</div>
        ) : (
          <a
            className="text-xs text-indigo-400 hover:text-indigo-300"
            href={`/u/${encodeURIComponent(handle)}`}
            target="_blank"
            rel="noreferrer"
          >
            {handleUrl(handle).replace(/^https?:\/\//, '')} ↗
          </a>
        )}
      </Row>

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
