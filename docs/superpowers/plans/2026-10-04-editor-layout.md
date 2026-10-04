# 편집 화면 배치 구현 계획 (디자인 정돈 2단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 툴바를 세 구역으로 정리하고, 노드에 하는 일을 고른 노드 위로 옮기고, 상자 모양에서 깊이가 모양으로 읽히게 한다.

**Architecture:** 노드 도구는 `@xyflow/react`의 `NodeToolbar`로 띄운다(확대 배율과 무관한 크기, 노드를 따라다님).
색 팔레트는 지금의 `NodeStyleBar`를 그대로 그 안에 넣는다. 노드 모양은 `mapTheme.ts`의 `classic` 분기만
바꾸고, 이모지는 `Icon.tsx`의 SVG로 바꾼다. 저장 형식과 배치 계산은 건드리지 않는다.

**Tech Stack:** React 19, zustand, @xyflow/react v12, Tailwind v4, Vitest v2, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-10-04-design-refresh-design.md` (2단계)

## Global Constraints

- 주석과 UI 문구는 한국어로 쓴다. 기존 코드 스타일을 따른다.
- **새 의존성을 추가하지 않는다.** 아이콘은 SVG를 직접 쓴다.
- 색 클래스는 지금처럼 `slate-*`/`indigo-*`를 쓴다 (3단계에서 변수 값만 바꿔 라이트를 만든다).
- 공개 여부(`PublishMenu`)는 툴바에 남는다. 단축키(`?`, `Ctrl+,`, `Tab` 등)는 그대로 동작한다.
- `글자만`, `밑줄` 모양은 바꾸지 않는다. 사용자가 직접 칠한 색은 어느 깊이에서든 우선한다.
- 노드 폭이 hover로 바뀌면 안 된다 (실측 크기가 달라져 배치가 다시 계산된다). 떠 있는 것은 전부 `absolute`나 포털이다.
- 테스트는 `npx vitest run --no-file-parallelism` 으로 돌린다.
- 게이트: `npx tsc -b` → `npx vitest run --no-file-parallelism` → `npm run lint`. 셋 다 통과해야 한다.
- 작업은 `feat/editor-layout` 브랜치에서 한다 (`feat/intro-preview` 위에 만든다 — `Logo`가 거기 있다).
  `main`에 올리는 것은 사용자가 브라우저에서 확인한 뒤다.

## Review Focus

1. **중심 주제를 골랐다.** 삭제 버튼이 없어야 한다 (스토어가 막지만 눌러도 아무 일이 없는 버튼은 고장으로 보인다). (Task 3 테스트)
2. **읽기전용(공개 뷰어, 소개 미리보기).** 노드 도구와 빈 맵 안내가 뜨지 않는다. (Task 3 테스트)
3. **접힌 가지 안에 또 접힌 가지가 있다.** 숫자는 숨은 후손 전부를 센다. (Task 2 테스트)
4. **상자 모양에서 직접 칠해 둔 노드.** 깊이와 상관없이 지금처럼 꽉 채운 상자로 남는다. (Task 1 테스트)
5. **화면 맨 위에 붙은 노드를 골랐다.** 노드 도구가 화면 밖으로 나가지 않고 노드 아래에 뜬다.
   여러 개를 박스로 골랐을 때는 뜨지 않는다. (자동 테스트 없음 — Task 6에서 브라우저로 확인)

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| 수정 `src/utils/mapTheme.ts` (+test) | 상자 모양을 깊이별로, 선은 가지 색 |
| 수정 `src/components/Settings/SettingsDialog.tsx` | 상자 모양 미리보기 그림을 새 모양에 맞춤 |
| 새 `src/components/Icon.tsx` | 선 아이콘 16개 |
| 수정 `src/store/useMindMapStore.ts` | `collectSubtree`를 export |
| 수정 `src/components/MindMapCanvas/TextNode.tsx` (+새 test) | 접기 버튼, 노드 도구 연결, hover 버튼 제거 |
| 새 `src/components/MindMapCanvas/NodeActionBar.tsx` (+test) | 고른 노드 위에 뜨는 도구 |
| 새 `src/components/MindMapCanvas/EmptyMapHint.tsx` (+test) | 노드가 하나뿐일 때 안내 한 줄 |
| 수정 `src/components/MindMapCanvas/TableNode.tsx`, `MindMapCanvas.tsx`, `NoteIconButton.tsx` | 노드 도구 연결, 안내 배치, 아이콘 |
| 수정 `src/components/Toolbar/Toolbar.tsx`, `FileMenu.tsx`, `ViewMenu.tsx`, `PublishMenu.tsx`, `MapSwitcher.tsx`, `NodeStyleBar.tsx` (+test 갱신) | 세 구역, ⋯ 메뉴, 아이콘 |
| 새 `src/utils/treePath.ts` (+test) | 노드의 조상 이름 목록 |
| 수정 `src/components/NoteDrawer/NoteDrawer.tsx` (+새 test) | 머리에 경로와 이름 |
| 수정 `src/PublicMapViewer.tsx`, `src/pages/PublicProfile.tsx` | 로고와 아이콘 |

---

### Task 0: 브랜치

- [ ] **Step 1**

```bash
git switch feat/intro-preview
git switch -c feat/editor-layout
git add docs/superpowers/plans/2026-10-04-editor-layout.md
git commit -m "docs: 편집 화면 배치 구현 계획"
```

---

### Task 1: 상자 모양을 깊이별로

**Files:**
- Modify: `src/utils/mapTheme.ts` (`CLASSIC_EDGE_COLORS` 삭제, `nodeLook`, `edgeLook`)
- Modify: `src/components/Settings/SettingsDialog.tsx` (`ThemePreview`)
- Test: `src/utils/mapTheme.test.ts`

**Interfaces:**
- Produces: `nodeLook(theme, depth, branch, custom?)`, `edgeLook(theme, depth, branch, custom?)` — 시그니처는 그대로, 결과만 바뀐다.

- [ ] **Step 1: 테스트를 바꾼다**

`src/utils/mapTheme.test.ts`에서 `'기본 테마는 예전 모양 그대로다'` 테스트 하나를 지우고 그 자리에 아래 셋을 넣는다:

```ts
  it('상자 모양은 깊이가 모양으로 읽힌다 — 중심은 채우고, 큰 가지는 가지 색 상자, 그 아래는 글자만', () => {
    expect(nodeLook('classic', 0, -1).style.background).toBe('#6366f1');

    const top = nodeLook('classic', 1, 0);
    expect(top.plain).toBe(false);
    expect(String(top.style.background)).toContain('#7aa2f7');
    expect(String(top.style.border)).toContain('#7aa2f7');

    const leaf = nodeLook('classic', 2, 0);
    expect(leaf.plain).toBe(true);
    expect(leaf.style.background).toBeUndefined();
  });

  it('상자 모양에서 직접 칠한 노드는 깊이와 상관없이 꽉 채운 상자로 남는다', () => {
    const { plain, style } = nodeLook('classic', 3, 0, '#ff0000');
    expect(plain).toBe(false);
    expect(style.background).toBe('#ff0000');
    expect(style.minWidth).toBe(120);
  });

  it('상자 모양의 선도 가지 색을 쓴다', () => {
    expect(edgeLook('classic', 0, 0)).toEqual({ color: '#7aa2f7', width: 2 });
    expect(edgeLook('classic', 1, 1).color).toBe('#9ece6a');
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/utils/mapTheme.test.ts`
Expected: 새 테스트 셋 중 `깊이가 모양으로`와 `선도 가지 색`이 FAIL (`#1e293b`, `#6366f1`이 나온다). `직접 칠한 노드`는 지금도 통과한다 (지켜야 할 동작이다).

- [ ] **Step 3: 구현한다**

`src/utils/mapTheme.ts`에서 `const CLASSIC_EDGE_COLORS = [...]` 줄을 지우고, `nodeLook`과 `edgeLook`을 아래로 바꾼다:

```ts
export function nodeLook(theme: MapTheme, depth: number, branch: number, custom?: string): NodeLook {
  // 중심 주제는 어느 모양에서든 크게 채운다
  if (depth === 0) {
    return {
      plain: false,
      anchor: 'mid',
      style: {
        background: custom ?? '#6366f1',
        border: '1px solid transparent',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: 14,
        ...text(19, 26, 700),
      },
    };
  }

  const c = custom ?? branchColor(branch);
  const top = depth === 1;

  if (theme === 'classic') {
    // 직접 칠한 노드는 깊이와 상관없이 꽉 채운 상자다 — 이미 칠해 둔 맵의 모양을 바꾸지 않는다
    if (custom) {
      return {
        plain: false,
        anchor: 'mid',
        style: {
          background: custom,
          border: `1px solid ${custom}80`,
          color: '#e2e8f0',
          minWidth: 120,
          padding: '8px 12px',
          borderRadius: 8,
          ...text(14, 20, 500),
        },
      };
    }
    // 큰 가지만 상자다. 가지 색을 옅게 깔아 어느 가지인지 보인다.
    if (top) {
      return {
        plain: false,
        anchor: 'mid',
        style: {
          background: `color-mix(in srgb, ${c} 15%, #0f172a)`,
          border: `1px solid color-mix(in srgb, ${c} 50%, #0f172a)`,
          color: '#f1f5f9',
          padding: '6px 12px',
          borderRadius: 8,
          ...text(14, 20, 600),
        },
      };
    }
    // 그 아래는 상자 없이 글자만 — 아래의 '글자만' 모양과 같다
  }

  const font = top ? text(15, 20, 600) : text(13, 18, 400);
  const color = top ? '#f8fafc' : '#cbd5e1';

  if (theme === 'underline') {
    return {
      plain: true,
      anchor: 'bottom',
      style: { borderBottom: `${top ? 3 : 1.5}px solid ${c}`, color, padding: top ? '5px 6px' : '4px 6px', ...font },
    };
  }

  // 상자 없이 글자만. 직접 색을 칠했으면 그 색이 보이도록 옅은 상자를 준다.
  return {
    plain: !custom,
    anchor: 'mid',
    style: {
      background: custom ? custom + '26' : undefined,
      border: `1px solid ${custom ?? 'transparent'}`,
      color,
      padding: top ? '4px 8px' : '3px 8px',
      borderRadius: 6,
      ...font,
    },
  };
}

/** 선 하나의 모양. depth는 **부모**의 깊이, branch는 자식이 속한 가지다. */
export function edgeLook(
  theme: MapTheme,
  depth: number,
  branch: number,
  custom?: string
): { color: string; width: number } {
  // 밑줄형은 선 굵기를 밑줄 굵기와 맞춰 한 줄로 이어 보이게 한다
  const trunk = theme === 'underline' ? 3 : theme === 'plain' ? 2.5 : 2;
  return { color: custom ?? branchColor(branch), width: depth === 0 ? trunk : 1.5 };
}
```

- [ ] **Step 4: 설정창의 상자 미리보기를 맞춘다**

`src/components/Settings/SettingsDialog.tsx`의 `ThemePreview`에서 세 군데를 바꾼다:

```tsx
  const rows = [
    { y: 15, label: '컬렉션', color: '#7aa2f7' },
    { y: 45, label: 'JVM', color: '#9ece6a' },
  ];
```

```tsx
          {classic && <rect x={56} y={y - 9} width={56} height={18} rx={4} fill="#1a2238" stroke={color} />}
```

```tsx
      <rect x={4} y={20} width={32} height={20} rx={5} fill="#6366f1" />
```

(마지막 것은 `fill={classic ? ...}`과 `stroke={classic ? ...}` 두 속성을 `fill="#6366f1"` 하나로 줄인 것이다.)

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/utils/mapTheme.test.ts src/components/Settings`
Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add src/utils/mapTheme.ts src/utils/mapTheme.test.ts src/components/Settings/SettingsDialog.tsx
git commit -m "feat: 상자 모양에서 깊이가 모양으로 읽히게 (중심·큰 가지·그 아래)"
```

---

### Task 2: 아이콘과 접기 버튼

**Files:**
- Create: `src/components/Icon.tsx`
- Modify: `src/store/useMindMapStore.ts:112` (`function collectSubtree` 앞에 `export`)
- Modify: `src/components/MindMapCanvas/TextNode.tsx` (접기 버튼)
- Test: `src/components/MindMapCanvas/TextNode.test.tsx` (새 파일)

**Interfaces:**
- Produces: `Icon({ name, size? }: { name: IconName; size?: number })`.
  `IconName` = `'plus' | 'table' | 'note' | 'trash' | 'undo' | 'redo' | 'search' | 'eye' | 'tidy' | 'more' | 'chev' | 'side' | 'close' | 'globe' | 'lock' | 'keyboard'`
- Produces: `collectSubtree(nodeId, children): Set<string>` (자기 자신 포함) — 스토어에서 export.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/MindMapCanvas/TextNode.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

// 연결점과 떠 있는 도구는 React Flow 캔버스 안에서만 동작한다. 여기서는 노드 자체만 본다.
vi.mock('@xyflow/react', async (orig) => ({
  ...(await orig<typeof import('@xyflow/react')>()),
  Handle: () => null,
  NodeToolbar: ({ children }: { children: React.ReactNode }) => <div data-testid="node-toolbar">{children}</div>,
  useStore: () => false,
}));

import { TextNode } from './TextNode';
import { useMindMapStore, createEmptyMindMap } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();

function renderNode(id: string, selected = false) {
  const props = { id, data: store().mindMapData.nodes[id], selected } as unknown as ComponentProps<typeof TextNode>;
  return render(<TextNode {...props} />);
}

let rootId: string;
let a: string;

beforeEach(() => {
  useMindMapStore.setState({ readOnly: false });
  store().openMap(createEmptyMindMap('t'), {});
  rootId = store().mindMapData.rootId;
  // root → a → (b → c), d
  a = store().addChildNode(rootId);
  const b = store().addChildNode(a);
  store().addChildNode(b);
  store().addChildNode(a);
  store().toggleCollapse(b);
  store().setEditingNodeId(null);
  store().setSelectedNodeId(null);
});

describe('TextNode 접기 버튼', () => {
  it('접힌 가지에는 숨은 후손 수를 적는다 — 안쪽에 접힌 가지가 있어도 전부 센다', () => {
    store().toggleCollapse(a);
    renderNode(a);
    expect(screen.getByRole('button', { name: '펼치기 (숨은 노드 3개)' })).toHaveTextContent('+3');
  });

  it('펼친 가지에는 접기 버튼이 있다', () => {
    renderNode(a);
    expect(screen.getByRole('button', { name: '접기' })).toHaveTextContent('−');
  });

  it('자식이 없으면 버튼이 없다', () => {
    const leaf = store().mindMapData.children[a][1];
    renderNode(leaf);
    expect(screen.queryByRole('button', { name: /접기|펼치기/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/MindMapCanvas/TextNode.test.tsx`
Expected: FAIL — `펼치기 (숨은 노드 3개)` 버튼을 찾지 못한다 (지금 이름은 `펼치기`, 글자는 `+`).

- [ ] **Step 3: 아이콘을 만든다**

`src/components/Icon.tsx`:

```tsx
/**
 * 선 아이콘. 이모지(🔍 ⌨ ⚙ 📝)는 운영체제마다 모양과 굵기가 달라서 SVG로 직접 그린다.
 * ponytail: 쓰는 것만 있다. 스무 개를 넘기면 아이콘 라이브러리를 검토한다.
 */
const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  table: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M10 10v9" />
    </>
  ),
  note: (
    <>
      <path d="M6 4h9l4 4v12H6z" />
      <path d="M9 12h7M9 16h5" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  tidy: <path d="M4 12h5M9 6h11M9 18h11M9 6v12" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  chev: <path d="m6 9 6 6 6-6" />,
  side: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M15 5v14" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  keyboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="shrink-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 4: `collectSubtree`를 export한다**

`src/store/useMindMapStore.ts`:

```ts
// 전
function collectSubtree(nodeId: string, children: Record<string, string[]>): Set<string> {
// 후
export function collectSubtree(nodeId: string, children: Record<string, string[]>): Set<string> {
```

- [ ] **Step 5: 접기 버튼을 바꾼다**

`src/components/MindMapCanvas/TextNode.tsx`에서

import를 바꾼다:

```tsx
import { useMindMapStore, collectSubtree } from '../../store/useMindMapStore';
```

`const handleStyle = ...` 줄 아래에 더한다:

```tsx
  // 접힌 가지가 얼마나 큰지 펼치지 않고도 알 수 있게 숨은 후손 수를 적는다 (자기 자신은 뺀다)
  const hiddenCount = data.collapsed ? collectSubtree(id, mindMapData.children).size - 1 : 0;
```

`{hasChildren && (<button ... </button>)}` 블록 전체를 아래로 바꾼다:

```tsx
      {hasChildren && (
        <button
          // 노드 밖에 떠 있어(absolute) 숫자가 길어져도 노드 폭은 그대로다.
          // before:-inset-2 = 보이는 크기는 그대로 두고 클릭 판정만 사방 8px 넓힌다.
          // 펼친 가지의 −는 마우스를 올리거나 골랐을 때만 보인다 — 늘 보이면 맵이 버튼으로 뒤덮인다.
          className={`absolute ${onLeft ? 'right-full mr-1' : 'left-full ml-1'} top-1/2 -translate-y-1/2 h-5 min-w-5 px-1 rounded-full bg-slate-700 border border-slate-500 text-[10px] leading-none flex items-center justify-center text-slate-200 hover:bg-indigo-600 hover:border-indigo-400 z-10 before:absolute before:-inset-2 before:content-[''] ${
            data.collapsed || selected ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
          onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
          title={data.collapsed ? `펼치기 (숨은 노드 ${hiddenCount}개)` : '접기'}
          aria-label={data.collapsed ? `펼치기 (숨은 노드 ${hiddenCount}개)` : '접기'}
        >
          {data.collapsed ? `+${hiddenCount}` : '−'}
        </button>
      )}
```

- [ ] **Step 6: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/MindMapCanvas/TextNode.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: 커밋한다**

```bash
git add src/components/Icon.tsx src/store/useMindMapStore.ts src/components/MindMapCanvas/TextNode.tsx src/components/MindMapCanvas/TextNode.test.tsx
git commit -m "feat: 접힌 가지에 숨은 노드 수 표시, 선 아이콘 추가"
```

---

### Task 3: 노드 도구와 빈 맵 안내

**Files:**
- Create: `src/components/MindMapCanvas/NodeActionBar.tsx`, `src/components/MindMapCanvas/EmptyMapHint.tsx`
- Modify: `src/components/MindMapCanvas/TextNode.tsx`, `TableNode.tsx`, `MindMapCanvas.tsx`, `NoteIconButton.tsx`, `src/components/Toolbar/NodeStyleBar.tsx`
- Test: `src/components/MindMapCanvas/NodeActionBar.test.tsx`, `EmptyMapHint.test.tsx`, `TextNode.test.tsx`(추가)

**Interfaces:**
- Consumes: `Icon` (Task 2), `NodeStyleBar()` (기존 — `selectedNodeId`의 색을 바꾼다), `keysFor(action, overrides)`
- Produces: `NodeActionBar({ id }: { id: string })`, `EmptyMapHint()`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/MindMapCanvas/NodeActionBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@xyflow/react', async (orig) => ({
  ...(await orig<typeof import('@xyflow/react')>()),
  NodeToolbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useStore: () => false,
}));

import { NodeActionBar } from './NodeActionBar';
import { useMindMapStore, createEmptyMindMap } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();
let rootId: string;
let a: string;

beforeEach(() => {
  store().openMap(createEmptyMindMap('t'), {});
  rootId = store().mindMapData.rootId;
  a = store().addChildNode(rootId);
  store().setEditingNodeId(null);
  store().setSelectedNodeId(a);
});

describe('NodeActionBar', () => {
  it('자식 추가는 그 노드 밑에 글자 노드를 만든다', () => {
    render(<NodeActionBar id={a} />);
    fireEvent.click(screen.getByRole('button', { name: /자식/ }));
    const kids = store().mindMapData.children[a];
    expect(kids).toHaveLength(1);
    expect(store().mindMapData.nodes[kids[0]].type).toBe('text');
  });

  it('표 추가는 그 노드 밑에 표 노드를 만든다', () => {
    render(<NodeActionBar id={a} />);
    fireEvent.click(screen.getByRole('button', { name: /표/ }));
    const kids = store().mindMapData.children[a];
    expect(store().mindMapData.nodes[kids[0]].type).toBe('table');
  });

  it('노트를 누르면 그 노드의 노트 창이 열린다', () => {
    render(<NodeActionBar id={a} />);
    fireEvent.click(screen.getByRole('button', { name: /노트/ }));
    expect(store().isNoteDrawerOpen).toBe(true);
    expect(store().selectedNodeId).toBe(a);
  });

  it('색을 고르면 그 노드에 칠해진다', () => {
    render(<NodeActionBar id={a} />);
    fireEvent.click(screen.getByRole('button', { name: '파랑' }));
    expect(store().mindMapData.nodes[a].style?.color).toBe('#1d4ed8');
  });

  it('삭제는 그 노드를 지운다', () => {
    render(<NodeActionBar id={a} />);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(store().mindMapData.nodes[a]).toBeUndefined();
  });

  it('중심 주제에는 삭제 버튼이 없다 — 눌러도 아무 일이 없는 버튼은 고장으로 보인다', () => {
    render(<NodeActionBar id={rootId} />);
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });
});
```

`src/components/MindMapCanvas/EmptyMapHint.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyMapHint } from './EmptyMapHint';
import { useMindMapStore, createEmptyMindMap } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();

beforeEach(() => {
  useMindMapStore.setState({ readOnly: false });
  store().openMap(createEmptyMindMap('t'), {});
});

describe('EmptyMapHint', () => {
  it('노드가 하나뿐이면 가지 치는 법을 알려 준다', () => {
    render(<EmptyMapHint />);
    expect(screen.getByText(/가지를 칩니다/)).toBeInTheDocument();
    expect(screen.getByText('Tab')).toBeInTheDocument();
  });

  it('노드가 둘 이상이면 사라진다', () => {
    store().addChildNode(store().mindMapData.rootId);
    const { container } = render(<EmptyMapHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it('읽기전용에서는 뜨지 않는다', () => {
    useMindMapStore.setState({ readOnly: true });
    const { container } = render(<EmptyMapHint />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`src/components/MindMapCanvas/TextNode.test.tsx` 맨 아래에 더한다:

```tsx
describe('TextNode 노드 도구', () => {
  it('고른 노드에만 뜬다', () => {
    renderNode(a, true);
    expect(screen.getByTestId('node-toolbar')).toBeInTheDocument();
  });

  it('고르지 않은 노드에는 없다 — 마우스를 올려도 삭제 버튼이 나오지 않는다', () => {
    renderNode(a, false);
    expect(screen.queryByTestId('node-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('삭제')).not.toBeInTheDocument();
  });

  it('읽기전용에서는 골라도 뜨지 않는다', () => {
    useMindMapStore.setState({ readOnly: true });
    renderNode(a, true);
    expect(screen.queryByTestId('node-toolbar')).not.toBeInTheDocument();
  });

  it('이름을 고치는 중에는 뜨지 않는다 — 입력칸을 가린다', () => {
    store().setEditingNodeId(a);
    renderNode(a, true);
    expect(screen.queryByTestId('node-toolbar')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/MindMapCanvas`
Expected: FAIL — `./NodeActionBar`, `./EmptyMapHint`를 찾지 못하고, `TextNode 노드 도구`의 첫 테스트가 `node-toolbar`를 찾지 못한다.

- [ ] **Step 3: 노드 도구를 만든다**

`src/components/MindMapCanvas/NodeActionBar.tsx`:

```tsx
import { NodeToolbar, Position, useStore } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { keysFor } from '../../utils/shortcuts';
import { NodeStyleBar } from '../Toolbar/NodeStyleBar';
import { Icon } from '../Icon';

const btn =
  'flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white';
const sep = <span className="mx-1 h-4 w-px bg-slate-700" />;
/** 노드 위쪽에 이만큼(px) 자리가 없으면 도구를 아래에 띄운다 */
const ROOM_ABOVE = 56;

/**
 * 고른 노드 위에 뜨는 도구: 자식·표 추가, 노트, 색, 삭제.
 *
 * 전에는 추가 버튼과 색 팔레트가 툴바에 있어서, 고른 노드와 그 도구가 화면 양 끝에 있었다.
 * NodeToolbar는 확대 배율과 상관없이 같은 크기로 그려지고, 여러 개를 골랐을 때는 스스로 숨는다.
 */
export function NodeActionBar({ id }: { id: string }) {
  const addChildNode = useMindMapStore((s) => s.addChildNode);
  const openNoteDrawer = useMindMapStore((s) => s.openNoteDrawer);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const isRoot = useMindMapStore((s) => s.mindMapData.rootId === id);
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  // 화면 맨 위에 붙은 노드는 위에 띄울 자리가 없다
  const below = useStore((s) => {
    const node = s.nodeLookup.get(id);
    return !!node && node.internals.positionAbsolute.y * s.transform[2] + s.transform[1] < ROOM_ABOVE;
  });

  return (
    <NodeToolbar position={below ? Position.Bottom : Position.Top} align="start" offset={8} className="nodrag nopan">
      <div
        className="flex items-center gap-0.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
        role="toolbar"
        aria-label="노드 도구"
      >
        <button className={btn} onClick={() => addChildNode(id, 'text')} title="글자 자식 추가">
          <Icon name="plus" size={14} />
          자식
          <kbd className="rounded border border-slate-600 bg-slate-900 px-1 font-mono text-[10px] text-slate-400">
            {keysFor('addChild', overrides)}
          </kbd>
        </button>
        <button className={btn} onClick={() => addChildNode(id, 'table')} title="표 자식 추가">
          <Icon name="table" size={14} />표
        </button>
        <button className={btn} onClick={() => openNoteDrawer(id)} title="노트 열기">
          <Icon name="note" size={14} />
          노트
        </button>
        {sep}
        <NodeStyleBar />
        {!isRoot && (
          <>
            {sep}
            <button
              className={`${btn} hover:!bg-red-600`}
              onClick={() => deleteNode(id)}
              title="삭제"
              aria-label="삭제"
            >
              <Icon name="trash" size={14} />
            </button>
          </>
        )}
      </div>
    </NodeToolbar>
  );
}
```

`src/components/Toolbar/NodeStyleBar.tsx`에서 색 지우기 버튼의 글자 `✕`를 아이콘으로 바꾼다:

```tsx
// 파일 위쪽
import { Icon } from '../Icon';
```

```tsx
// 색 없음 버튼 안의 ✕ 를 아래로
        <Icon name="close" size={9} />
```

그리고 그 버튼의 `className`에 `flex items-center justify-center`를 더한다 (아이콘을 가운데 놓는다).

- [ ] **Step 4: 빈 맵 안내를 만든다**

`src/components/MindMapCanvas/EmptyMapHint.tsx`:

```tsx
import { useMindMapStore } from '../../store/useMindMapStore';
import { keysFor } from '../../utils/shortcuts';

/**
 * 노드가 하나뿐인 맵에서 다음에 할 일을 알려 준다.
 * 추가 버튼이 툴바에서 노드 도구로 옮겨 가서, 아무것도 고르지 않은 새 맵에는 "추가"가 보이지 않는다.
 */
export function EmptyMapHint() {
  const single = useMindMapStore((s) => Object.keys(s.mindMapData.nodes).length === 1);
  const readOnly = useMindMapStore((s) => s.readOnly);
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  if (!single || readOnly) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
      노드를 고르고{' '}
      <kbd className="rounded border border-slate-600 bg-slate-800 px-1 font-mono text-[10px] text-slate-300">
        {keysFor('addChild', overrides)}
      </kbd>
      으로 가지를 칩니다
    </div>
  );
}
```

`src/components/MindMapCanvas/MindMapCanvas.tsx` 맨 아래의 `MindMapCanvas`를 바꾼다:

```tsx
import { EmptyMapHint } from './EmptyMapHint';
```

```tsx
export function MindMapCanvas() {
  return (
    <div className="relative flex-1 h-full bg-slate-950">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
      <EmptyMapHint />
    </div>
  );
}
```

- [ ] **Step 5: 노드에 연결하고 hover 버튼을 없앤다**

`src/components/MindMapCanvas/TextNode.tsx`:

```tsx
import { NodeActionBar } from './NodeActionBar';
```

`{/* 액션 버튼은 노드 '위에 떠서' 나온다 ... */}` 주석과 그 아래 `<div className="hidden group-hover:flex ...">…</div>` 블록 전체를 아래로 바꾼다 (`deleteNode`는 더 쓰지 않으니 구조분해에서도 뺀다):

```tsx
      {/* 노드에 하는 일은 고른 노드 위에 뜬다. 이름을 고치는 중에는 입력칸을 가리므로 숨긴다. */}
      {selected && !readOnly && !editing && <NodeActionBar id={id} />}
```

`src/components/MindMapCanvas/TableNode.tsx`:

```tsx
import { NodeActionBar } from './NodeActionBar';
import { Icon } from '../Icon';
```

- `const { updateNodeTableData, openNoteDrawer, deleteNode, readOnly } = useMindMapStore();` → `deleteNode`를 뺀다.
- `<div className="hidden group-hover:flex gap-1">…</div>` 블록 전체를 지운다.
- `<span className="text-xs text-slate-400 font-medium">` 을 `<span className="flex items-center gap-1 text-xs text-slate-400 font-medium">` 로, 그 안의 `📊 {data.label}` 을 아래로 바꾼다:

```tsx
          <Icon name="table" size={12} />
          {data.label}
```

- `<Handle type="source" ...>` 바로 위에 더한다:

```tsx
      {selected && !readOnly && <NodeActionBar id={id} />}
```

`src/components/MindMapCanvas/NoteIconButton.tsx`:

```tsx
import { Icon } from '../Icon';
```

- 버튼 안의 `📝` → `<Icon name="note" size={12} />`
- 카드 제목의 `📝 {title}` → `{title}`
- 파일 위 주석의 "노드의 📝 아이콘" → "노드의 노트 아이콘"

- [ ] **Step 6: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/MindMapCanvas && npx tsc -b`
Expected: PASS (NodeActionBar 6, EmptyMapHint 3, TextNode 7), tsc 오류 없음

- [ ] **Step 7: 커밋한다**

```bash
git add src/components/MindMapCanvas src/components/Toolbar/NodeStyleBar.tsx
git commit -m "feat: 노드 도구를 고른 노드 위에 띄움, 빈 맵 안내"
```

---

### Task 4: 툴바 세 구역

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx` (전체), `FileMenu.tsx`, `ViewMenu.tsx`, `PublishMenu.tsx`, `MapSwitcher.tsx`
- Test: `src/components/Toolbar/Toolbar.test.tsx`, `FileMenu.test.tsx` (갱신)

**Interfaces:**
- Consumes: `Icon` (Task 2), `Logo` (`src/components/Logo.tsx`), `keysFor`
- Produces: 없음 (화면만)

- [ ] **Step 1: 테스트를 바꾼다**

`src/components/Toolbar/Toolbar.test.tsx`에서 `'매번 쓰는 것들은 그대로 밖에 있다'`와 `'단축키 버튼을 누르면 도움말이 열린다'` 두 테스트를 지우고 아래 넷을 넣는다. `beforeEach`에 `store().setSettingsOpen(false);`도 더한다:

```tsx
  it('매번 쓰는 것들은 그대로 밖에 있다', () => {
    render(<Toolbar />);
    for (const name of ['실행 취소', '다시 실행', '검색', /보기/, '정렬', '더보기']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  /**
   * 추가 버튼과 색 팔레트는 고른 노드 위의 노드 도구로 갔다.
   * 툴바에 남아 있으면 노드를 고를 때마다 툴바 모양이 바뀐다.
   */
  it('노드를 골라도 툴바에 추가 버튼과 색 팔레트가 없다', () => {
    store().setSelectedNodeId(store().mindMapData.rootId);
    render(<Toolbar />);
    expect(screen.queryByRole('button', { name: /텍스트/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '파랑' })).not.toBeInTheDocument();
  });

  it('더보기 → 단축키를 누르면 도움말이 열린다', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByText('단축키'));
    expect(store().isShortcutsOpen).toBe(true);
  });

  it('더보기 → 설정을 누르면 설정창이 열린다', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByText('설정'));
    expect(store().isSettingsOpen).toBe(true);
  });
```

`src/components/Toolbar/FileMenu.test.tsx`에서 `openMenu`를 바꾼다:

```tsx
function openMenu() {
  render(<FileMenu />);
  fireEvent.click(screen.getByRole('button', { name: '더보기' }));
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/Toolbar/Toolbar.test.tsx src/components/Toolbar/FileMenu.test.tsx`
Expected: FAIL — `더보기` 버튼을 찾지 못한다.

- [ ] **Step 3: ⋯ 메뉴를 만든다**

`src/components/Toolbar/FileMenu.tsx`:

```tsx
import { Icon } from '../Icon';
```

컴포넌트 안에 두 줄을 더한다:

```tsx
  const setShortcutsOpen = useMindMapStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useMindMapStore((s) => s.setSettingsOpen);
```

파일 위 주석 `파일 입출력 메뉴.`를 `더보기(⋯) 메뉴: 파일 입출력, 단축키, 설정.`으로 바꾸고, `return (` 부터 `Item` 함수 끝까지를 아래로 바꾼다:

```tsx
  return (
    <div className="relative">
      <button
        className="flex items-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        onClick={() => setIsOpen((v) => !v)}
        title="파일 · 단축키 · 설정"
        aria-label="더보기"
        aria-expanded={isOpen}
      >
        <Icon name="more" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-40 w-52 rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1">
            <Item label="열기" onClick={() => run(handleLoadJson)} />
            <Item label="JSON 저장" onClick={() => run(() => exported('json', () => downloadJson(mindMapData)))} />

            <div className="my-1 border-t border-slate-800" />

            <Item label="MD 가져오기" onClick={() => run(handleImportMarkdown)} />
            <Item label="MD 내보내기" onClick={() => run(() => exported('markdown', handleExportMarkdown))} />
            <Item label="PNG로 저장" onClick={() => run(() => exported('png', () => exportToPng(rfNodes, mindMapData.title)))} />

            <div className="my-1 border-t border-slate-800" />

            <Item label="단축키" onClick={() => run(() => setShortcutsOpen(true))} />
            <Item label="설정" onClick={() => run(() => setSettingsOpen(true))} />
          </div>
        </>
      )}
    </div>
  );
}

function Item({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: 툴바를 바꾼다**

`src/components/Toolbar/Toolbar.tsx` 전체를 아래로 바꾼다:

```tsx
import { useMindMapStore, useUndoRedo } from '../../store/useMindMapStore';
import { keysFor } from '../../utils/shortcuts';
import { Logo } from '../Logo';
import { Icon } from '../Icon';
import { SaveStatus } from './SaveStatus';
import { MapSwitcher } from './MapSwitcher';
import { AccountMenu } from './AccountMenu';
import { ViewMenu } from './ViewMenu';
import { FileMenu } from './FileMenu';
import { PublishMenu } from './PublishMenu';

const ghost =
  'flex items-center gap-1.5 rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * 세 구역: 왼쪽은 어디에 있는지(맵 이름·저장 상태), 가운데는 맵 전체에 하는 일,
 * 오른쪽은 공개와 계정. 노드에 하는 일(추가·색·삭제)은 고른 노드 위의 NodeActionBar에 있다 —
 * 그래서 이 툴바는 무엇을 골랐든 모양이 같다.
 */
export function Toolbar() {
  const applyLayout = useMindMapStore((s) => s.applyLayout);
  const setSearchOpen = useMindMapStore((s) => s.setSearchOpen);
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return (
    // 좁은 화면에서는 버튼을 다음 줄로 흘려보낸다(flex-wrap).
    // whitespace-nowrap + [&>*]:shrink-0 = 버튼 글자가 단어 중간에 끊기거나 찌그러지지 않게.
    //
    // ⚠️ overflow-x-auto 를 다시 넣지 말 것. overflow는 한 축만 visible이 아니어도
    // 나머지 축의 visible이 auto로 바뀐다(CSS 명세) → 높이 45px인 툴바가 세로로도
    // 클리핑 컨테이너가 되어, 이 안의 드롭다운(맵 목록·보기·더보기·계정)이 통째로 잘려
    // "DOM에는 있는데 화면에 안 보이는" 상태가 된다.
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex-shrink-0 whitespace-nowrap [&>*]:shrink-0">
      <Logo />
      <MapSwitcher />
      <SaveStatus />

      <div className="flex-1" />

      <button className={ghost} disabled={!canUndo} onClick={undo} title="실행 취소 (Ctrl+Z)" aria-label="실행 취소">
        <Icon name="undo" />
      </button>
      <button className={ghost} disabled={!canRedo} onClick={redo} title="다시 실행 (Ctrl+Y)" aria-label="다시 실행">
        <Icon name="redo" />
      </button>
      {/* 검색은 입력칸처럼 넓게 — 가장 자주 쓰는 맵 전체 동작이라 눈에 먼저 들어오게 한다 */}
      <button
        className="mx-1 flex w-52 items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-700 hover:text-slate-300"
        onClick={() => setSearchOpen(true)}
        title="노드·노트 검색"
        aria-label="검색"
      >
        <Icon name="search" size={14} />
        <span className="flex-1 text-left">노드·노트 검색</span>
        <kbd className="rounded border border-slate-700 bg-slate-900 px-1 font-mono text-[10px] text-slate-400">
          {keysFor('search', overrides)}
        </kbd>
      </button>
      <ViewMenu />
      <button className={ghost} onClick={applyLayout} title="자동 레이아웃 재정렬" aria-label="정렬">
        <Icon name="tidy" />
        정렬
      </button>

      <div className="flex-1" />

      <PublishMenu />
      <AccountMenu />
      <FileMenu />
    </div>
  );
}
```

- [ ] **Step 5: 나머지 메뉴의 이모지를 바꾼다**

`src/components/Toolbar/ViewMenu.tsx` — `import { Icon } from '../Icon';`를 더하고 여는 버튼을 바꾼다:

```tsx
      <button
        className="flex items-center gap-1.5 rounded-md p-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        onClick={() => setIsOpen((v) => !v)}
        title="펼치기 / 접기"
      >
        <Icon name="eye" />
        보기
      </button>
```

`src/components/Toolbar/PublishMenu.tsx` — `import { Icon } from '../Icon';`를 더하고, 여는 버튼의 `className` 맨 앞 `px-2 py-1.5 rounded text-xs`를 `flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs`로, 버튼 안의 글자를 아래로 바꾼다:

```tsx
        {state === undefined ? (
          '공개 설정…'
        ) : live ? (
          <>
            <Icon name="globe" size={14} />
            공개 중
          </>
        ) : (
          <>
            <Icon name="lock" size={14} />
            비공개
          </>
        )}
```

`src/components/Toolbar/MapSwitcher.tsx` — `import { Icon } from '../Icon';`를 더하고:
- 목록 여는 버튼 안의 `▾` → `<Icon name="chev" size={14} />`
- 삭제 버튼 안의 `🗑` → `<Icon name="trash" size={13} />`

- [ ] **Step 6: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/components/Toolbar && npx tsc -b`
Expected: PASS, tsc 오류 없음

- [ ] **Step 7: 커밋한다**

```bash
git add src/components/Toolbar
git commit -m "feat: 툴바를 세 구역으로, 파일·단축키·설정은 더보기 메뉴로"
```

---

### Task 5: 노트 창 머리, 공개 화면의 로고와 아이콘

**Files:**
- Create: `src/utils/treePath.ts`
- Modify: `src/components/NoteDrawer/NoteDrawer.tsx`, `src/PublicMapViewer.tsx`, `src/pages/PublicProfile.tsx`
- Test: `src/utils/treePath.test.ts`, `src/components/NoteDrawer/NoteDrawer.test.tsx` (새 파일)

**Interfaces:**
- Produces: `pathLabels(id: string, data: Pick<MindMapData, 'children' | 'nodes'>): string[]` —
  루트부터 부모까지의 이름. 루트 자신이면 빈 배열.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/treePath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pathLabels } from './treePath';
import type { MindMapData } from '../types';

const data = {
  children: { r: ['a'], a: ['b'], b: [] },
  nodes: { r: { label: '자바의신' }, a: { label: '객체지향' }, b: { label: '다형성' } },
} as unknown as MindMapData;

describe('pathLabels', () => {
  it('루트부터 부모까지의 이름을 순서대로 준다', () => {
    expect(pathLabels('b', data)).toEqual(['자바의신', '객체지향']);
  });

  it('루트는 조상이 없다', () => {
    expect(pathLabels('r', data)).toEqual([]);
  });

  it('없는 노드나 순환하는 데이터에서도 멈춘다', () => {
    expect(pathLabels('nope', data)).toEqual([]);
    const loop = { children: { x: ['y'], y: ['x'] }, nodes: { x: { label: 'x' }, y: { label: 'y' } } } as unknown as MindMapData;
    expect(pathLabels('x', loop)).toEqual(['y']);
  });
});
```

`src/components/NoteDrawer/NoteDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// 편집기(BlockNote)는 1MB가 넘고 jsdom에서 돌지 않는다. 여기서 볼 것은 머리줄뿐이다.
vi.mock('./BlockNoteEditor', () => ({ BlockNoteEditor: () => <div data-testid="editor" /> }));
vi.mock('./LinkPanel', () => ({ LinkPanel: () => null }));

import { NoteDrawer } from './NoteDrawer';
import { useMindMapStore, createEmptyMindMap } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();

beforeEach(() => {
  store().openMap(createEmptyMindMap('자바의신'), {});
});

describe('NoteDrawer 머리줄', () => {
  it('노드 이름 위에 그 노드까지의 경로를 보여 준다', () => {
    const root = store().mindMapData.rootId;
    const a = store().addChildNode(root);
    store().updateNodeLabel(a, '객체지향');
    const b = store().addChildNode(a);
    store().updateNodeLabel(b, '다형성');
    store().openNoteDrawer(b);

    render(<NoteDrawer />);

    expect(screen.getByRole('heading', { name: '다형성' })).toBeInTheDocument();
    expect(screen.getByText('자바의신 › 객체지향')).toBeInTheDocument();
  });

  it('중심 주제에는 경로가 없다', () => {
    store().openNoteDrawer(store().mindMapData.rootId);
    render(<NoteDrawer />);
    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it('닫기 버튼으로 닫힌다', () => {
    store().openNoteDrawer(store().mindMapData.rootId);
    render(<NoteDrawer />);
    screen.getByRole('button', { name: '닫기' }).click();
    expect(store().isNoteDrawerOpen).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/utils/treePath.test.ts src/components/NoteDrawer`
Expected: FAIL — `./treePath`가 없고, `다형성` 제목(heading)과 경로를 찾지 못한다.

- [ ] **Step 3: 경로 함수를 만든다**

`src/utils/treePath.ts`:

```ts
import type { MindMapData } from '../types';

/**
 * 루트부터 부모까지의 이름. 루트 자신이면 빈 배열.
 * 노트 창이 "이 노트가 맵의 어디에 달린 것인지"를 보여 주는 데 쓴다.
 */
export function pathLabels(id: string, data: Pick<MindMapData, 'children' | 'nodes'>): string[] {
  const parent = new Map<string, string>();
  for (const [pid, kids] of Object.entries(data.children)) {
    for (const kid of kids) parent.set(kid, pid);
  }
  const out: string[] = [];
  const seen = new Set([id]); // 순환 방어
  for (let p = parent.get(id); p !== undefined && !seen.has(p); p = parent.get(p)) {
    seen.add(p);
    out.unshift(data.nodes[p]?.label ?? '');
  }
  return out;
}
```

- [ ] **Step 4: 노트 창 머리를 바꾼다**

`src/components/NoteDrawer/NoteDrawer.tsx`:

```tsx
import { pathLabels } from '../../utils/treePath';
import { Icon } from '../Icon';
```

`const note = selectedNode?.note ?? '';` 아래에 더한다:

```tsx
  const path = selectedNodeId ? pathLabels(selectedNodeId, mindMapData) : [];
```

`{/* 헤더 */}` 아래의 `<div className="flex items-center justify-between px-4 py-3 ...">…</div>` 블록 전체를 아래로 바꾼다:

```tsx
          <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-700 flex-shrink-0">
            <div className="min-w-0 flex-1">
              {/* 이 노트가 맵의 어디에 달린 것인지 — 노트만 읽고 있어도 자리를 잃지 않게 */}
              {path.length > 0 && (
                <div className="truncate text-[11px] text-slate-500">{path.join(' › ')}</div>
              )}
              <h2 className="truncate text-base font-bold text-slate-100">
                {selectedNode ? selectedNode.label : '노트'}
              </h2>
            </div>
            <button
              className="mt-0.5 text-slate-400 hover:text-slate-200"
              onClick={toggleSide}
              title={side === 'right' ? '왼쪽으로 옮기기' : '오른쪽으로 옮기기'}
              aria-label={side === 'right' ? '왼쪽으로 옮기기' : '오른쪽으로 옮기기'}
            >
              <Icon name="side" />
            </button>
            <button
              className="mt-0.5 text-slate-400 hover:text-slate-200"
              onClick={closeNoteDrawer}
              title="닫기"
              aria-label="닫기"
            >
              <Icon name="close" />
            </button>
          </div>
```

- [ ] **Step 5: 공개 화면의 로고와 아이콘을 바꾼다**

`src/PublicMapViewer.tsx`:

```tsx
import { Logo } from './components/Logo';
import { Icon } from './components/Icon';
```

- 홈 링크:

```tsx
        <a href="/" title="홈으로">
          <Logo />
        </a>
```

- `const btn = ...` 를 `const btn = 'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600';` 로
- `🔍 검색` → `<Icon name="search" size={14} />검색`
- `⤢ 전체 펼치기` → `전체 펼치기`
- 단축키 버튼 안의 `⌨` → `<Icon name="keyboard" />`

`src/pages/PublicProfile.tsx`:

```tsx
import { Logo } from '../components/Logo';
```

```tsx
// 전
        <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
          ← NoteTree
        </a>
// 후
        <a href="/" title="홈으로">
          <Logo />
        </a>
```

- [ ] **Step 6: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/utils/treePath.test.ts src/components/NoteDrawer && npx tsc -b`
Expected: PASS (treePath 3, NoteDrawer 3), tsc 오류 없음

- [ ] **Step 7: 남은 이모지를 확인한다**

Run: `grep -rnE "🗺|🌳|🔍|⌨|⚙|📝|📊|🗑|👁|🌐|🔒|📂|💾|📥|🖼|⟳|↩|↪" src --include=*.tsx | grep -v test`
Expected: 주석에만 남는다 (`Logo.tsx`, `Icon.tsx`의 설명). 버튼·글자로 그려지는 것은 없다.

- [ ] **Step 8: 커밋한다**

```bash
git add src/utils/treePath.ts src/utils/treePath.test.ts src/components/NoteDrawer src/PublicMapViewer.tsx src/pages/PublicProfile.tsx
git commit -m "feat: 노트 창 머리에 경로 표시, 공개 화면에 로고와 선 아이콘"
```

---

### Task 6: 게이트와 브라우저 확인

**Files:** 없음 (확인만)

- [ ] **Step 1: 게이트를 돌린다**

```bash
npx tsc -b
npx vitest run --no-file-parallelism
npm run lint
```

Expected: 셋 다 오류 없음.

- [ ] **Step 2: 로컬에서 편집 화면을 띄운다**

```bash
npm run dev -- --port 5174
```

(`npm run dev`는 클라우드가 꺼진 로컬 모드라 로그인 없이 편집 화면이 뜬다. 공개·계정 버튼은 이 모드에서 보이지 않는다.)

- [ ] **Step 3: 눈으로 확인한다**

- 툴바가 한 줄이고, 노드를 고르거나 풀어도 툴바 모양이 그대로다.
- 노드를 고르면 그 위에 노드 도구가 뜬다. 자식·표·노트·색·삭제가 각각 동작한다. 캔버스를 확대/축소해도 도구 크기는 같다.
- 도구를 눌러도 선택이 풀리지 않고, 도구 위에서 끌어도 박스 선택이 시작되지 않는다.
- 화면 맨 위에 붙은 노드를 고르면 도구가 노드 아래에 뜬다.
- 빈 곳을 끌어 여러 개를 고르면 도구가 뜨지 않는다.
- 상자 모양: 중심은 채운 상자, 큰 가지는 가지 색 상자, 그 아래는 글자만. 선은 가지 색.
  설정창에서 `글자만`, `밑줄`로 바꿔도 전과 같다. 색을 칠한 노드는 꽉 채운 상자다.
- 가지를 접으면 `+N`이 뜨고, 펼친 가지의 `−`는 마우스를 올리거나 골랐을 때만 보인다.
  마우스를 올려도 맵이 출렁이지 않는다.
- 새 맵을 만들면 아래에 "노드를 고르고 Tab으로 가지를 칩니다"가 보이고, 가지를 하나 치면 사라진다.
- 더보기(⋯)에서 파일 다섯 가지, 단축키, 설정이 열린다. `?`와 `Ctrl+,`도 그대로 동작한다.
- 노트 창 머리에 경로와 이름이 보인다.
- 창 폭을 줄이면 툴바가 두 줄로 넘어가되 드롭다운이 잘리지 않는다.

- [ ] **Step 4: 사용자에게 확인을 요청하고 멈춘다**

`main` 병합과 푸시(= 운영 배포)는 사용자가 브라우저에서 확인한 뒤에 한다.
