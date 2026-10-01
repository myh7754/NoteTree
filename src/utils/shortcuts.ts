/**
 * 단축키 — 화면에 보여 주는 목록과 실제 처리의 **단일 출처**.
 *
 * 예전에는 이 파일이 사람이 읽는 목록일 뿐이고 실제 키는 `useGlobalShortcuts.ts`에
 * 따로 적혀 있었다. 사용자가 키를 바꿀 수 있게 하면서, 바꿀 수 있는 동작은 여기
 * ACTIONS 표 하나에서 목록과 처리가 같이 나오게 했다.
 *
 * 키 조합은 'Ctrl+Shift+E' 같은 문자열 하나로 적는다 (comboOf 참고).
 */
export interface Shortcut {
  keys: string;
  desc: string;
  /** 있으면 사용자가 바꿀 수 있는 항목이다 */
  action?: ActionId;
}

export interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

/** 사용자가 키를 바꿀 수 있는 동작 */
export const ACTIONS = {
  addChild: { desc: '자식 노드 추가', keys: 'Tab' },
  addSibling: { desc: '형제 노드 추가', keys: 'Enter' },
  rename: { desc: '이름 고치기', keys: 'F2' },
  toggleCollapse: { desc: '가지 접기 / 펼치기', keys: 'Space' },
  expandAll: { desc: '모두 펼치기', keys: 'Ctrl+E' },
  collapseAll: { desc: '모두 접기', keys: 'Ctrl+Shift+E' },
  search: { desc: '노드 · 노트 검색', keys: 'Ctrl+F' },
  settings: { desc: '설정', keys: 'Ctrl+,' },
  help: { desc: '단축키 창 열기', keys: '?' },
} as const;

export type ActionId = keyof typeof ACTIONS;
export type ShortcutOverrides = Partial<Record<ActionId, string>>;

const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];

/**
 * 바꿀 수 없게 고정한 키와, 브라우저가 먼저 가져가서 앱까지 오지 않는 키.
 * 다른 동작에 지정하지 못하게 막는다.
 */
const RESERVED = new Set([
  'Delete', 'Backspace', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Ctrl+Z', 'Ctrl+Y', 'Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4',
  'Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+R', 'Ctrl+Shift+W', 'Ctrl+Shift+T', 'Ctrl+Shift+N',
  'Ctrl+Tab', 'Ctrl+Shift+Tab', 'F5', 'F11', 'F12',
]);

/**
 * 키 이벤트 → 조합 문자열. 조합 키(Ctrl 등)만 누른 상태면 null.
 *
 * - Mac의 ⌘는 Ctrl로 친다.
 * - 글자는 대문자로 맞춘다 (Shift를 누르면 key가 'E'로, 아니면 'e'로 온다).
 * - 기호('?' 등)는 Shift를 따로 적지 않는다 — 기호 자체가 이미 Shift를 반영한다.
 */
export function comboOf(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): string | null {
  const { key } = e;
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null;
  const isLetter = key.length === 1 && key.toLowerCase() !== key.toUpperCase();
  const name = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
  const symbol = key.length === 1 && key !== ' ' && !isLetter;
  return [
    e.ctrlKey || e.metaKey ? 'Ctrl+' : '',
    e.altKey ? 'Alt+' : '',
    e.shiftKey && !symbol ? 'Shift+' : '',
    name,
  ].join('');
}

/** 'Ctrl+Shift+E' → 'Ctrl + Shift + E' (화면 표시용) */
export const formatCombo = (combo: string) => combo.replace(/\+(?=.)/g, ' + ');

/** 기본값에 사용자가 바꾼 것을 덮어쓴, 지금 실제로 쓰는 키 */
export function resolveBindings(overrides: ShortcutOverrides = {}): Record<ActionId, string> {
  const out = {} as Record<ActionId, string>;
  for (const id of ACTION_IDS) out[id] = overrides[id] ?? ACTIONS[id].keys;
  return out;
}

export function actionFor(combo: string | null, overrides?: ShortcutOverrides): ActionId | undefined {
  if (!combo) return undefined;
  const bindings = resolveBindings(overrides);
  return ACTION_IDS.find((id) => bindings[id] === combo);
}

/** 이 키를 이 동작에 지정해도 되는가. 안 되면 사용자에게 보여 줄 이유를 돌려준다. */
export function checkCombo(action: ActionId, combo: string, overrides?: ShortcutOverrides): string | null {
  if (RESERVED.has(combo)) return `${formatCombo(combo)}은(는) 바꿀 수 없는 키라 지정할 수 없습니다.`;
  const taken = actionFor(combo, overrides);
  if (taken && taken !== action) {
    return `${formatCombo(combo)}은(는) 이미 "${ACTIONS[taken].desc}"에 쓰고 있습니다.`;
  }
  return null;
}

/**
 * 저장소(localStorage·계정)에서 읽은 값을 믿을 수 있는 형태로 거른다.
 * 모르는 동작, 문자열이 아닌 값, 지정할 수 없는 키, 서로 겹치는 키는 버린다.
 */
export function sanitizeOverrides(raw: unknown): ShortcutOverrides {
  const out: ShortcutOverrides = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of ACTION_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v !== 'string' || v.length === 0 || v.length > 30) continue;
    if (v === ACTIONS[id].keys || checkCombo(id, v, out)) continue;
    out[id] = v;
  }
  return out;
}

/** 화면에 보여 줄 목록. 바꿀 수 있는 항목에는 지금 쓰는 키가 들어간다. */
export function shortcutGroups(overrides?: ShortcutOverrides): ShortcutGroup[] {
  const b = resolveBindings(overrides);
  const a = (action: ActionId): Shortcut => ({ keys: formatCombo(b[action]), desc: ACTIONS[action].desc, action });
  return [
    {
      title: '노드 만들기',
      items: [a('addChild'), a('addSibling'), a('rename'), { keys: 'Delete', desc: '노드 삭제' }],
    },
    {
      title: '보기',
      items: [
        a('toggleCollapse'),
        a('expandAll'),
        a('collapseAll'),
        { keys: 'Ctrl + 1 ~ 4', desc: '그 단계까지만' },
      ],
    },
    {
      title: '이동 · 찾기',
      items: [
        { keys: '← ↑ ↓ →', desc: '선택 옮기기' },
        a('search'),
        a('settings'),
        { keys: '좌 + 우 드래그', desc: '화면 이동' },
      ],
    },
    {
      title: '되돌리기',
      items: [
        { keys: 'Ctrl + Z', desc: '실행 취소' },
        { keys: 'Ctrl + Y', desc: '다시 실행' },
      ],
    },
    {
      title: '기타',
      items: [a('help'), { keys: 'Esc', desc: '창 닫기 · 선택 해제' }],
    },
  ];
}

/** 툴바 메뉴에서 항목 옆에 키를 표시할 때 쓴다 */
export const keysFor = (action: ActionId, overrides?: ShortcutOverrides) =>
  formatCombo(resolveBindings(overrides)[action]);
