# 소개 페이지 개편 구현 계획 (디자인 정돈 1단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비로그인 첫 화면(`/`)에 운영자의 실제 공개 맵을 미리보기로 끼우고, 사용법 네 단계를 가로 한 줄로 바꾼다.

**Architecture:** 미리보기는 그림이 아니라 `PublicMapViewer`와 같은 순서로 공개 맵을 스토어에 올려
`MindMapCanvas`로 그린 것이다. 조작은 막고 칸 전체를 운영자 공개 목록으로 가는 링크로 만든다.
불러오지 못하면 칸을 숨겨 지금처럼 글만 남는다. 화면을 떠날 때 스토어를 빈 맵으로 되돌린다.

**Tech Stack:** React 19, zustand, @xyflow/react v12, Tailwind v4, Vitest v2, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-10-04-design-refresh-design.md` (1단계)

## Global Constraints

- 주석과 UI 문구는 한국어로 쓴다. 기존 코드 스타일을 따른다.
- **새 의존성을 추가하지 않는다.** 아이콘·로고는 SVG를 직접 쓴다.
- 미리보기는 조작할 수 없다(`pointer-events-none`). 칸 전체가 `/u/myh`로 가는 링크다.
- 불러오지 못하면 미리보기 칸을 숨긴다. 대체 그림은 만들지 않는다.
- 큰 버튼은 "예시 맵 열어 보기" 하나만 둔다. 로그인은 머리줄의 `AccountMenu`가 맡는다.
- "공개는 켜야 켜집니다" 단락과 처리방침 링크는 그대로 둔다.
- 색 클래스는 지금처럼 `slate-*`/`indigo-*`를 쓴다 (3단계에서 변수 값만 바꿔 라이트를 만든다).
- React Flow 저작권 표시(`.react-flow__attribution`)는 숨기지 않는다.
- 테스트는 `npx vitest run --no-file-parallelism` 으로 돌린다 (이 PC는 병렬 워커가 메모리 부족으로 죽는다).
- 게이트: `npx tsc -b` → `npx vitest run --no-file-parallelism` → `npm run lint`. 셋 다 통과해야 한다.
- 작업은 `feat/intro-preview` 브랜치에서 한다. `main`에 올리는 것은 사용자가 브라우저에서 확인한 뒤다.

## Review Focus

1. **다른 탭에서 로그인하면 이 탭이 새로고침 없이 편집 앱으로 바뀐다.** 그때 스토어에 운영자 맵이
   남아 있으면, 맵이 하나도 없는 새 사용자는 그 맵을 자기 것처럼 편집·저장하게 된다.
   → 미리보기가 사라질 때 스토어를 빈 맵으로 되돌리고 `readOnly`를 끈다. (Task 1 테스트)
2. **운영자가 `자바` 맵의 공개를 끄거나 이름을 바꾼다.** `loadPublicMap`이 `null`을 준다.
   → 미리보기 칸이 사라지고 나머지 화면은 그대로다. (Task 1 테스트)
3. **Supabase가 일시정지 상태이거나 네트워크가 끊겼다.** `loadPublicMap`이 던진다.
   → 위와 같다. 에러 문구를 띄우지 않는다. (Task 1 테스트)
4. **불러오는 동안.** 칸 자리는 미리 잡혀 있어 맵이 뜰 때 글이 밀리지 않는다. (Task 1 테스트)
5. **좁은 화면(휴대폰).** 미리보기가 글 아래로 내려가고 가로 스크롤이 생기지 않는다.
   (자동 테스트 없음 — Task 3에서 브라우저 폭을 줄여 확인)

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| 새 `src/components/Logo.tsx` | 트리 표시 + "NoteTree". 2단계에서 툴바·공개 화면도 쓴다 |
| 새 `src/pages/IntroPreview.tsx` | 공개 맵 하나를 불러 조작 불가 미리보기로 그린다 |
| 새 `src/pages/IntroPreview.test.tsx` | 불러오기 성공/없음/실패, 떠날 때 스토어 정리 |
| 수정 `src/pages/Intro.tsx` | 두 칸 배치, 버튼 하나, 사용법 가로 한 줄 |
| 새 `src/pages/Intro.test.tsx` | 버튼 주소, 네 단계, 남겨 둔 단락 |

---

### Task 0: 브랜치

- [ ] **Step 1: 브랜치를 만든다**

```bash
git switch -c feat/intro-preview
```

- [ ] **Step 2: 설계 문서와 이 계획을 커밋한다**

```bash
git add docs/superpowers/specs/2026-10-04-design-refresh-design.md docs/superpowers/plans/2026-10-04-intro-page.md
git commit -m "docs: 디자인 정돈 + 라이트 모드 설계, 소개 페이지 구현 계획"
```

(`.claude/settings.local.json`은 커밋하지 않는다.)

---

### Task 1: 미리보기 (`IntroPreview`)

**Files:**
- Create: `src/pages/IntroPreview.tsx`
- Test: `src/pages/IntroPreview.test.tsx`

**Interfaces:**
- Consumes: `loadPublicMap(handle, slug): Promise<PublicMap | null>` (`src/db/publish.ts`),
  `pickInitialDepth(data, budget)` (`src/utils/initialDepth.ts`),
  `useMindMapStore`의 `openMap`, `expandToLevel`, `readOnly`, `createEmptyMindMap(title)`
- Produces: `IntroPreview({ handle, slug }: { handle: string; slug: string })` —
  불러오는 중에는 빈 칸, 성공하면 맵, 실패하면 `null`을 그린다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/pages/IntroPreview.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { MindMapData } from '../types';

const loadPublicMap = vi.fn();
vi.mock('../db/publish', () => ({ loadPublicMap: (h: string, s: string) => loadPublicMap(h, s) }));
// 캔버스(React Flow)는 jsdom에서 크기를 재지 못한다. 여기서 볼 것은 "언제 그리는가"뿐이다.
vi.mock('../components/MindMapCanvas/MindMapCanvas', () => ({
  MindMapCanvas: () => <div data-testid="canvas" />,
}));

import { IntroPreview } from './IntroPreview';
import { useMindMapStore } from '../store/useMindMapStore';

const SHOWCASE: MindMapData = {
  id: 'showcase-map',
  title: '자바',
  rootId: 'r',
  nodes: { r: { id: 'r', label: '자바', type: 'text' }, a: { id: 'a', label: '컬렉션', type: 'text' } },
  children: { r: ['a'], a: [] },
} as unknown as MindMapData;

const found = { map: SHOWCASE, owner: { handle: 'myh', maps: [] } };

beforeEach(() => {
  loadPublicMap.mockReset();
  useMindMapStore.setState({ readOnly: false });
});

describe('IntroPreview', () => {
  it('공개 맵을 불러오면 캔버스를 그리고, 칸 전체가 운영자 공개 목록으로 가는 링크다', async () => {
    loadPublicMap.mockResolvedValue(found);
    render(<IntroPreview handle="myh" slug="자바" />);

    expect(await screen.findByTestId('canvas')).toBeInTheDocument();
    expect(loadPublicMap).toHaveBeenCalledWith('myh', '자바');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/u/myh');
    expect(useMindMapStore.getState().mindMapData.id).toBe('showcase-map');
    expect(useMindMapStore.getState().readOnly).toBe(true);
  });

  it('불러오는 동안에도 칸 자리는 잡혀 있다 — 맵이 뜰 때 글이 밀리지 않게', () => {
    loadPublicMap.mockReturnValue(new Promise(() => {}));
    render(<IntroPreview handle="myh" slug="자바" />);

    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('그런 공개 맵이 없으면 아무것도 그리지 않는다', async () => {
    loadPublicMap.mockResolvedValue(null);
    const { container } = render(<IntroPreview handle="myh" slug="자바" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('불러오기가 실패해도 에러 문구 없이 사라진다', async () => {
    loadPublicMap.mockRejectedValue(new Error('network'));
    const { container } = render(<IntroPreview handle="myh" slug="자바" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('화면을 떠나면 운영자 맵을 스토어에서 비우고 읽기전용을 끈다 — 남아 있으면 로그인한 새 사용자가 그 맵을 편집하게 된다', async () => {
    loadPublicMap.mockResolvedValue(found);
    const { unmount } = render(<IntroPreview handle="myh" slug="자바" />);
    await screen.findByTestId('canvas');

    unmount();

    expect(useMindMapStore.getState().mindMapData.id).not.toBe('showcase-map');
    expect(useMindMapStore.getState().readOnly).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/pages/IntroPreview.test.tsx`
Expected: FAIL — `Failed to resolve import "./IntroPreview"`

- [ ] **Step 3: 구현한다**

`src/pages/IntroPreview.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { MindMapCanvas } from '../components/MindMapCanvas/MindMapCanvas';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useMindMapStore, createEmptyMindMap } from '../store/useMindMapStore';
import { loadPublicMap } from '../db/publish';
import { pickInitialDepth } from '../utils/initialDepth';

/** 미리보기 칸은 전체 화면의 절반도 안 된다. 공개 뷰어(25개)보다 적게 펼쳐야 글자가 읽힌다. */
const PREVIEW_BUDGET = 12;

/**
 * 소개 페이지에 끼우는 공개 맵 미리보기.
 *
 * 그림 파일이 아니라 실제 맵이다 — 운영자가 맵을 고치면 여기도 같이 바뀐다.
 * 조작은 막고(pointer-events-none) 칸 전체를 공개 목록으로 가는 링크로 둔다.
 * 불러오지 못하면 아무것도 그리지 않는다. 소개 페이지는 글만으로도 성립한다.
 */
export function IntroPreview({ handle, slug }: { handle: string; slug: string }) {
  const openMap = useMindMapStore((s) => s.openMap);
  const expandToLevel = useMindMapStore((s) => s.expandToLevel);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let alive = true;
    useMindMapStore.setState({ readOnly: true });
    loadPublicMap(handle, slug)
      .then((found) => {
        if (!alive) return;
        if (!found) {
          setState('failed');
          return;
        }
        // 저장된 좌표는 쓰지 않는다 — 공개 뷰어와 같이 항상 정돈된 배치로 보여 준다
        openMap(found.map, {});
        expandToLevel(pickInitialDepth(found.map, PREVIEW_BUDGET));
        setState('ready');
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
      // 다른 탭에서 로그인하면 이 탭은 새로고침 없이 편집 앱으로 바뀐다. 운영자 맵이 스토어에
      // 남아 있으면 맵이 없는 새 사용자가 그것을 자기 맵처럼 편집·저장하게 된다.
      useMindMapStore.getState().openMap(createEmptyMindMap('새 마인드맵'), {});
      useMindMapStore.setState({ readOnly: false });
    };
  }, [handle, slug, openMap, expandToLevel]);

  if (state === 'failed') return null;

  return (
    <a
      href={`/u/${encodeURIComponent(handle)}`}
      aria-label="예시 맵 열어 보기"
      className="relative block h-80 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600"
    >
      <span className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-emerald-300">공개 중</span>
        운영자의 공부 기록 · 읽기 전용
      </span>
      {state === 'ready' && (
        // 확대 버튼과 미니맵은 누를 수 없으니 숨긴다
        <div
          className="pointer-events-none h-full [&_.react-flow__controls]:hidden [&_.react-flow__minimap]:hidden"
          aria-hidden="true"
        >
          <ErrorBoundary label="미리보기를 표시하지 못했습니다.">
            <MindMapCanvas />
          </ErrorBoundary>
        </div>
      )}
    </a>
  );
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/pages/IntroPreview.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋한다**

```bash
git add src/pages/IntroPreview.tsx src/pages/IntroPreview.test.tsx
git commit -m "feat: 소개 페이지용 공개 맵 미리보기"
```

---

### Task 2: 로고와 소개 페이지 배치

**Files:**
- Create: `src/components/Logo.tsx`
- Modify: `src/pages/Intro.tsx` (전체)
- Test: `src/pages/Intro.test.tsx`

**Interfaces:**
- Consumes: `IntroPreview({ handle, slug })` (Task 1)
- Produces: `Logo()` — 트리 표시와 "NoteTree" 글자. props 없음.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/pages/Intro.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// 미리보기와 계정 메뉴는 각자의 테스트가 있다. 여기서는 소개 페이지의 글과 링크만 본다.
vi.mock('./IntroPreview', () => ({
  IntroPreview: ({ handle, slug }: { handle: string; slug: string }) => (
    <div data-testid="preview">{`${handle}/${slug}`}</div>
  ),
}));
vi.mock('../components/Toolbar/AccountMenu', () => ({ AccountMenu: () => null }));

import { Intro } from './Intro';

describe('Intro', () => {
  it('큰 버튼은 하나이고 운영자 공개 목록으로 간다', () => {
    render(<Intro />);
    expect(screen.getByRole('link', { name: '예시 맵 열어 보기' })).toHaveAttribute('href', '/u/myh');
    expect(screen.queryByRole('link', { name: '사용법' })).not.toBeInTheDocument();
  });

  it('운영자의 자바 맵을 미리보기로 넘긴다', () => {
    render(<Intro />);
    expect(screen.getByTestId('preview')).toHaveTextContent('myh/자바');
  });

  it('사용법 네 단계가 모두 있다', () => {
    render(<Intro />);
    for (const title of ['가지를 친다', '노트를 단다', '찾는다', '보여준다']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('공개 안내 단락과 처리방침 링크를 그대로 둔다', () => {
    render(<Intro />);
    expect(screen.getByText('공개는 켜야 켜집니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '개인정보 처리방침' })).toHaveAttribute('href', '/privacy');
  });

  it('로고는 NoteTree다', () => {
    render(<Intro />);
    expect(screen.getByText('NoteTree')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run --no-file-parallelism src/pages/Intro.test.tsx`
Expected: FAIL — `Failed to resolve import "./IntroPreview"`가 아니라(Task 1에서 생김)
`예시 맵 열어 보기` 링크를 찾지 못해 실패한다.

- [ ] **Step 3: 로고를 만든다**

`src/components/Logo.tsx`:

```tsx
/**
 * NoteTree 로고: 뿌리 하나에서 가지 둘이 뻗는 트리 표시 + 이름.
 * 이모지(🗺, 🌳)는 운영체제마다 모양이 달라서 SVG로 직접 그린다.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="5" cy="12" r="2.2" fill="currentColor" />
        <path d="M7 12h4M11 5.5h3M11 18.5h3M11 5.5v13" />
        <circle cx="17" cy="5.5" r="2.2" />
        <circle cx="17" cy="18.5" r="2.2" />
      </svg>
      NoteTree
    </span>
  );
}
```

- [ ] **Step 4: 소개 페이지를 바꾼다**

`src/pages/Intro.tsx` 전체를 아래로 바꾼다:

```tsx
import { AccountMenu } from '../components/Toolbar/AccountMenu';
import { Logo } from '../components/Logo';
import { IntroPreview } from './IntroPreview';

/**
 * 비로그인 첫 화면 (/).
 *
 * 예전에는 여기가 운영자 맵 뷰어였다. 공개 발행이 생기면서 그 자리는 /u/<닉네임>으로
 * 옮겼고, 이 페이지는 서비스 소개가 됐다. 다만 이력서에 이미 뿌린 '/' 링크가 끊기면
 * 안 되므로, 운영자 공개 목록으로 가는 버튼을 가장 크게 둔다.
 *
 * 글만 있던 첫 화면에 실제 공개 맵을 끼웠다(2026-10-04) — 무엇을 하는 앱인지 읽기 전에 보인다.
 */

/** 운영자 닉네임. 소개 페이지의 "예시 맵 열어 보기"가 여기로 간다. */
const SHOWCASE_HANDLE = 'myh';
/** 미리보기로 보여 줄 운영자의 공개 맵. 공개를 끄거나 이름을 바꾸면 미리보기만 사라진다. */
const SHOWCASE_SLUG = '자바';

export function Intro() {
  return (
    <div className="min-h-full overflow-y-auto bg-slate-950">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <Logo />
        <div className="flex-1" />
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* 좁은 화면에서는 미리보기가 글 아래로 내려간다 */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="lg:w-[420px] lg:flex-shrink-0">
            <h1 className="text-3xl font-bold leading-snug text-slate-50 sm:text-4xl">
              공부한 걸 트리로 정리하고, 그대로 남에게 보여주세요
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              마인드맵으로 구조를 잡고, 각 노드에 노트를 답니다. 브라우저에 바로 저장되고,
              로그인하면 다른 기기에서도 이어서 볼 수 있습니다.
            </p>
            <a
              href={`/u/${SHOWCASE_HANDLE}`}
              className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              예시 맵 열어 보기
            </a>
          </div>
          <IntroPreview handle={SHOWCASE_HANDLE} slug={SHOWCASE_SLUG} />
        </div>

        {/* 번호 대신 그 단계에서 실제로 누르는 키를 앞에 둔다 */}
        <section className="mt-12 grid gap-x-6 gap-y-8 border-t border-slate-800 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Step keys={['Tab', 'Enter']} title="가지를 친다">
            자식과 형제를 만듭니다. 배치는 자동이라 선을 끌 일이 없습니다.
          </Step>
          <Step keys={['더블클릭']} title="노트를 단다">
            노드 옆 창에 설명, 코드, 링크를 적습니다. 창은 왼쪽으로 옮길 수 있습니다.
          </Step>
          <Step keys={['Ctrl', 'F']} title="찾는다">
            노드 이름과 노트 본문을 한꺼번에 찾습니다. 접혀 있던 가지도 알아서 펼쳐집니다.
          </Step>
          <Step keys={['공개 스위치']} title="보여준다">
            링크를 받은 사람은 로그인 없이 읽을 수 있고, 고칠 수는 없습니다.
          </Step>
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-100">공개는 켜야 켜집니다</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            모든 맵은 처음에 <b className="text-slate-300">비공개</b>입니다. 공개로 켠 맵만
            남이 볼 수 있고, 언제든 다시 끌 수 있습니다. 공개 페이지에 이메일은 나오지
            않습니다 — 보이는 것은 직접 정한 닉네임과 맵 내용뿐입니다.
          </p>
        </section>

        <footer className="mt-20 border-t border-slate-900 pt-6">
          <a href="/privacy" className="text-[11px] text-slate-600 hover:text-slate-400">
            개인정보 처리방침
          </a>
        </footer>
      </main>
    </div>
  );
}

function Step({ keys, title, children }: { keys: string[]; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
          >
            {k}
          </kbd>
        ))}
      </div>
      <b className="mt-2.5 block text-sm text-slate-200">{title}</b>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run --no-file-parallelism src/pages/Intro.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: 커밋한다**

```bash
git add src/components/Logo.tsx src/pages/Intro.tsx src/pages/Intro.test.tsx
git commit -m "feat: 소개 페이지에 실제 맵 미리보기, 사용법을 가로 한 줄로"
```

---

### Task 3: 게이트와 브라우저 확인

**Files:** 없음 (확인만)

- [ ] **Step 1: 게이트를 돌린다**

```bash
npx tsc -b
npx vitest run --no-file-parallelism
npm run lint
```

Expected: 셋 다 오류 없음. 기존 테스트 수에서 10개가 늘어난다.

- [ ] **Step 2: 로컬에서 소개 페이지를 띄운다**

이 저장소에는 `.env.production`만 있어서 `npm run dev`로는 클라우드가 꺼져 소개 페이지가 뜨지 않는다.
운영 설정으로 개발 서버를 띄운다 (5173이어야 로그인 리다이렉트가 돌아온다):

```bash
npx vite --mode production --port 5173
```

로그아웃 상태(또는 시크릿 창)로 `http://localhost:5173/`을 연다.

- [ ] **Step 3: 눈으로 확인한다**

- 제목 오른쪽에 `자바` 맵이 그려지고 글자가 읽힌다. 확대 버튼과 미니맵은 보이지 않는다.
- 미리보기를 끌거나 눌러도 맵이 움직이지 않고, 누르면 `/u/myh`로 간다.
- 사용법 네 단계가 한 줄로 보이고, 1280×720 창에서 스크롤 없이 네 단계 제목까지 들어온다.
- 창 폭을 400px로 줄이면 미리보기가 글 아래로 내려가고 가로 스크롤이 없다.
- 개발자 도구에서 네트워크를 오프라인으로 두고 새로고침하면 미리보기 칸만 사라지고 글은 그대로다.
- 머리줄 로고가 선 아이콘 + NoteTree다. 로그인 메뉴가 지금처럼 열린다.

- [ ] **Step 4: 사용자에게 확인을 요청하고 멈춘다**

`main` 병합과 푸시(= 운영 배포)는 사용자가 브라우저에서 확인한 뒤에 한다.
