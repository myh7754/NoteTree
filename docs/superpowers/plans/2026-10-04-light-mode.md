# 라이트 모드 구현 계획 (디자인 정돈 3단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 색 모드(시스템 따름 / 다크 / 라이트)를 설정에서 고를 수 있게 하고, 라이트일 때 화면 전체가 밝은 색으로 바뀐다.

**Architecture:** `<html data-theme="dark|light">` 하나로 전환한다. Tailwind v4가 `bg-slate-900`을
`var(--color-slate-900)`으로 내므로(개발 서버 CSS에서 확인함) 컴포넌트 클래스는 고치지 않고 `index.css`에서
라이트일 때 변수 값만 바꾼다. 클래스가 아닌 색(`mapTheme.ts`의 인라인 스타일, 노트 CSS, React Flow, BlockNote,
PNG 내보내기)만 따로 변수로 뺀다.

**Tech Stack:** React 19, zustand, Tailwind v4, @xyflow/react v12 (`colorMode` prop), BlockNote (`theme` prop), Vitest v2

**Spec:** `docs/superpowers/specs/2026-10-04-design-refresh-design.md` (3단계)

## Global Constraints

- 주석과 UI 문구는 한국어. 새 의존성 없음.
- `colorMode: 'system' | 'dark' | 'light'`, 기본 `system`, `localStorage` 키 `color-mode`.
- 색 모드와 맵 모양(상자/글자만/밑줄)은 독립이다. 여섯 조합 모두 읽혀야 한다.
- 다크 모드의 모양은 지금과 같아야 한다 (React Flow 확대 버튼·미니맵이 어두워지는 것은 예외 — 지금은 밝은 색으로 떠 있다).
- 사용자가 칠하는 색 일곱 개는 바꾸지 않는다.
- 코드 블록은 라이트에서도 어두운 바탕을 유지한다 (구문 강조 색이 어두운 바탕용이다).
- 방문자(공개 뷰어·프로필·소개·처리방침)는 저장한 값이 없으므로 시스템 설정을 따른다.
- 게이트: `npx tsc -b` → `npx vitest run --no-file-parallelism` → `npm run lint`.
- 브랜치 `feat/light-mode`.

## Review Focus

1. **저장된 값이 이상하다**(`localStorage`에 `"blue"`). 시스템 따름으로 돌아간다. (Task 1 테스트)
2. **시스템 따름인 채로 운영체제 설정을 바꾼다.** 새로고침 없이 따라간다. (Task 1 테스트)
3. **첫 그림 전에 테마가 붙는다.** 라이트 사용자에게 어두운 화면이 번쩍이지 않는다. (`main.tsx`에서 렌더 전에 적용 — 브라우저 확인)
4. **어두운 바탕을 전제로 한 `text-white`.** 라이트에서 흰 바탕에 흰 글씨가 되는 곳이 없어야 한다. (Task 3에서 전수 확인)
5. **PNG 내보내기.** 라이트에서 내보내면 밝은 바탕으로 나온다. (브라우저 확인)

---

### Task 1: 색 모드 값과 적용

**Files:** Create `src/utils/colorMode.ts`, `src/utils/colorMode.test.ts` / Modify `src/store/useMindMapStore.ts`, `src/main.tsx`

**Interfaces — Produces:**
- `type ColorMode = 'system' | 'dark' | 'light'`
- `readColorMode(v: string | null): ColorMode` — 모르는 값은 `'system'`
- `resolveTheme(mode: ColorMode, prefersDark: boolean): 'dark' | 'light'`
- `applyColorMode(mode: ColorMode): void` — `<html data-theme>`를 붙인다
- `watchSystemTheme(getMode: () => ColorMode): () => void` — 운영체제 설정이 바뀌면 다시 적용
- `useResolvedTheme(): 'dark' | 'light'` — 지금 실제로 적용된 테마 (BlockNote에 넘긴다)
- 스토어: `colorMode: ColorMode`, `setColorMode(mode)` — 저장하고 적용한다

- [ ] 테스트: `readColorMode`(정상 셋, 이상한 값, null), `resolveTheme` 네 조합, `applyColorMode`가 `data-theme`를 붙이는 것,
      `watchSystemTheme`이 system일 때만 따라가는 것, `setColorMode`가 `localStorage`에 쓰고 `data-theme`를 바꾸는 것
- [ ] 실패 확인 → 구현 → 통과 확인
- [ ] `main.tsx`: `ReactDOM.createRoot` 전에 `applyColorMode(useMindMapStore.getState().colorMode)`와 `watchSystemTheme(...)`
- [ ] 커밋

### Task 2: 설정창에 색 모드

**Files:** Modify `src/components/Settings/SettingsDialog.tsx`, `SettingsDialog.test.tsx`

- [ ] 테스트: `화면` 탭에 "시스템 따름 / 다크 / 라이트"가 있고, 라이트를 누르면 스토어와 `data-theme`가 바뀐다
- [ ] 실패 확인 → `ScreenTab` 맨 위에 `Row label="색 모드"` 추가 → 통과 확인 → 커밋

### Task 3: 라이트 색

**Files:** Modify `src/index.css`, `src/utils/mapTheme.ts`(+test), `src/components/MindMapCanvas/BezierEdge.tsx`,
`MindMapCanvas.tsx`, `TextNode.tsx`, `src/components/NoteDrawer/BlockNoteEditor.tsx`, `src/utils/exportImage.ts`,
`src/components/Settings/SettingsDialog.tsx`(미리보기 그림), `text-white`가 어두운 바탕 위에 있는 곳

- [ ] `index.css`: `:root`에 `color-scheme: dark`와 맵·노트 변수(`--branch-0..5`, `--node-surface`, `--node-strong`,
      `--node-text`, `--note-*`)를 정의하고, `:root[data-theme='light']`에서 `--color-slate-*`(밝기 뒤집기),
      `--color-indigo-300/400`, `--color-emerald-*`, `--color-red-*`, `--color-amber-300`과 위 변수의 라이트 값을 준다.
      노트 모양 규칙의 색을 `--note-*`로 바꾼다. React Flow 변수(`--xy-background-pattern-dots-color-default`,
      `--xy-minimap-*`)도 여기서 준다.
- [ ] `mapTheme.ts`: 가지 색과 글자·바탕 색을 `var(--…)`로. 테스트의 기대값도 `var(--branch-0)` 등으로 바꾼다 (실패 확인 후 구현).
- [ ] `BezierEdge.tsx`: 색을 `stroke` 속성 대신 `style`로 준다 (SVG 속성에서는 `var()`가 보장되지 않는다).
- [ ] `MindMapCanvas.tsx`: `<ReactFlow colorMode={colorMode}>`, `Background`·`MiniMap`의 색 prop 제거.
- [ ] `BlockNoteEditor.tsx`: `theme={useResolvedTheme()}`.
- [ ] `exportImage.ts`: 바탕색을 `--color-slate-950`의 계산된 값에서 읽는다.
- [ ] `text-white` 전수 확인: 남보라·빨강 버튼 위는 그대로, 어두운 바탕 위는 `text-slate-50` 또는 `text-inherit`으로.
- [ ] 설정창 미리보기 그림: 고정 색을 Tailwind `fill-*`/`stroke-*` 클래스나 `style`의 변수로.
- [ ] 게이트 → 커밋

### Task 4: 브라우저 확인

- [ ] 다크/라이트 × 상자/글자만/밑줄 여섯 조합, 노트 창, 설정창, 검색, 더보기 메뉴, 노드 도구, 소개 페이지, 공개 뷰어, PNG 내보내기
- [ ] 다크 모드가 2단계 직후와 같은 모양인지
- [ ] 안 읽히는 곳을 고치고 커밋
