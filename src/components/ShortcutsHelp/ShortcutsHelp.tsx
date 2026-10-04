import { useMindMapStore } from '../../store/useMindMapStore';
import { useState } from 'react';
import { checkCombo, comboOf, shortcutGroups, type ActionId } from '../../utils/shortcuts';

/**
 * 단축키 도움말 모달.
 *
 * 툴바 한 줄에 밀어넣던 안내 문구(`min-[1800px]`에서만 보이던 것)를 대체한다.
 * 그 방식은 화면이 조금만 좁아도 통째로 사라져서, 사실상 아무도 못 보는
 * 안내였다. Esc 처리는 useGlobalShortcuts가 맡는다 (겹친 창의 우선순위를
 * 한곳에서 결정해야 하기 때문).
 */
export function ShortcutsHelp() {
  const isOpen = useMindMapStore((s) => s.isShortcutsOpen);
  const setOpen = useMindMapStore((s) => s.setShortcutsOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="shortcuts-backdrop"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-label="단축키"
        className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-100">단축키</h2>
          <button
            className="text-slate-400 hover:text-slate-200 text-lg leading-none px-1"
            onClick={() => setOpen(false)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <ShortcutList className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 px-5 py-4" />

        <div className="px-5 py-2.5 border-t border-slate-800 text-[10px] text-slate-500">
          Esc 또는 바깥을 눌러 닫기
        </div>
      </div>
    </div>
  );
}

const KEY_CLASS =
  'inline-block px-1.5 py-0.5 rounded border bg-slate-800 text-[11px] font-mono text-slate-200 whitespace-nowrap';

/**
 * 단축키 목록 본문. 이 도움말 창과 설정창의 단축키 탭이 같이 쓴다.
 *
 * editable이면 바꿀 수 있는 키가 버튼이 된다: 누른 뒤 새 키를 누르면 바뀐다.
 */
export function ShortcutList({ className, editable = false }: { className: string; editable?: boolean }) {
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  const setShortcut = useMindMapStore((s) => s.setShortcut);
  const resetShortcuts = useMindMapStore((s) => s.resetShortcuts);
  const [capturing, setCapturing] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onKeyDown = (e: React.KeyboardEvent, action: ActionId) => {
    // 이 버튼에서 누른 키가 전역 단축키로 새지 않게 한다 (Enter가 노드를 만들면 안 된다)
    e.stopPropagation();
    if (capturing !== action) return;
    e.preventDefault();
    if (e.key === 'Escape') return setCapturing(null);
    const combo = comboOf(e.nativeEvent);
    if (!combo) return; // Ctrl·Shift만 누른 상태 — 다음 키를 기다린다
    const problem = checkCombo(action, combo, overrides);
    setError(problem);
    if (problem) return;
    setShortcut(action, combo);
    setCapturing(null);
  };

  return (
    <div>
      {editable && (
        <div className="mb-4 space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-500">
            보라색 테두리가 있는 키를 누른 다음, 새로 쓸 키를 누르면 바뀝니다. 로그인 중이면 계정에
            저장되어 다른 기기에서도 같게 쓸 수 있습니다.
          </p>
          {error && (
            <p role="alert" className="text-[11px] text-amber-400">
              {error}
            </p>
          )}
          <button
            className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            disabled={Object.keys(overrides).length === 0}
            onClick={() => {
              resetShortcuts();
              setError(null);
            }}
          >
            기본값으로 되돌리기
          </button>
        </div>
      )}
      <div className={className}>
        {shortcutGroups(overrides).map((group) => (
          <section key={group.title}>
            <h3 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
              {group.title}
            </h3>
            {/* 키를 고정폭 열에 두어 설명의 왼쪽 끝을 맞춘다.
                설명을 오른쪽 정렬하면 줄마다 시작점이 달라져 훑어읽기가 어렵다. */}
            <dl className="space-y-1.5">
              {group.items.map((item) => {
                const action = item.action;
                return (
                  <div key={item.desc} className="flex items-baseline gap-3">
                    <dt className="shrink-0 w-[8.5rem]">
                      {editable && action ? (
                        <button
                          className={`${KEY_CLASS} ${
                            capturing === action
                              ? 'border-amber-400 text-amber-300'
                              : 'border-indigo-500 hover:bg-slate-700'
                          }`}
                          aria-label={`${item.desc} 단축키 바꾸기`}
                          onClick={() => {
                            setCapturing(action);
                            setError(null);
                          }}
                          onBlur={() => setCapturing(null)}
                          onKeyDown={(e) => onKeyDown(e, action)}
                        >
                          {capturing === action ? '새 키를 누르세요' : item.keys}
                        </button>
                      ) : (
                        <kbd className={`${KEY_CLASS} border-slate-600`}>{item.keys}</kbd>
                      )}
                    </dt>
                    <dd className="text-xs text-slate-300 leading-relaxed">{item.desc}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
