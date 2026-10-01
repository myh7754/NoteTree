import { useEffect } from 'react';
import { useMindMapStore, type NavDirection } from '../store/useMindMapStore';
import { actionFor, comboOf } from '../utils/shortcuts';

// LR 배치 기준: 오른쪽=자식 방향, 왼쪽=부모 방향, 위아래=형제
const ARROW_TO_DIR: Record<string, NavDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * 키 이벤트 하나를 처리한다. 훅과 분리해 둔 이유는 테스트에서
 * 실제 DOM 이벤트를 만들지 않고도 분기를 직접 검증하기 위해서다.
 *
 * 사용자가 바꿀 수 있는 동작은 utils/shortcuts.ts의 표에서 찾고(actionFor),
 * 바꿀 수 없는 키(되돌리기, 방향키, Esc, Ctrl+1~4)는 여기 직접 적혀 있다.
 */
export function handleShortcut(
  e: KeyboardEvent,
  undo: () => void,
  redo: () => void
): void {
  const target = e.target as HTMLElement | null;
  // 입력 필드 / 노트 에디터(contentEditable) 안에서는 단축키를 가로채지 않는다
  const inField =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable === true;

  const store = useMindMapStore.getState();
  const action = actionFor(comboOf(e), store.shortcutOverrides);
  const ctrl = e.ctrlKey || e.metaKey;

  // 검색과 설정은 입력 중에도 열 수 있어야 한다 (노트 쓰다가 바로 검색).
  // 단, 조합 키 없이 글자 하나로 바꿔 둔 경우에는 입력 중에 글자를 먹으면 안 된다.
  if ((action === 'search' || action === 'settings') && (ctrl || e.altKey || !inField)) {
    e.preventDefault();
    if (action === 'search') store.setSearchOpen(true);
    else store.setSettingsOpen(true);
    return;
  }

  // Escape는 입력 중에도 처리해야 한다. 겹쳐 떠 있을 때는 위에 있는 것부터 닫는다:
  // 설정창 → 도움말 모달 → 검색창 → 선택 해제.
  if (e.key === 'Escape' && store.isSettingsOpen) {
    e.preventDefault();
    store.setSettingsOpen(false);
    return;
  }
  if (e.key === 'Escape' && store.isShortcutsOpen) {
    e.preventDefault();
    store.setShortcutsOpen(false);
    return;
  }
  if (e.key === 'Escape' && store.isSearchOpen) {
    e.preventDefault();
    store.setSearchOpen(false);
    return;
  }

  // 라벨/노트/검색 입력 중에는 나머지 단축키를 무시한다 (되돌리기도 입력창 자체 것에 맡긴다)
  if (inField) return;

  const sel = store.selectedNodeId;

  if (action) {
    // 읽기전용에서는 생성·편집만 막는다. 접기·펼치기·도움말은 살린다.
    if (store.readOnly && (action === 'addChild' || action === 'addSibling' || action === 'rename')) return;
    e.preventDefault(); // Tab의 포커스 이동, Space의 스크롤 등 기본 동작 방지
    if (action === 'addChild') {
      // 만든 뒤 곧바로 편집 모드
      if (sel) store.setEditingNodeId(store.addChildNode(sel));
    } else if (action === 'addSibling') {
      const newId = sel && store.addSiblingNode(sel);
      if (newId) store.setEditingNodeId(newId);
    } else if (action === 'rename') {
      // 표 노드는 인라인 라벨 입력이 없으므로 텍스트 노드만 편집 모드로
      if (sel && store.mindMapData.nodes[sel]?.type === 'text') store.setEditingNodeId(sel);
    } else if (action === 'toggleCollapse') {
      if (sel) store.toggleCollapse(sel);
    } else if (action === 'expandAll') {
      store.setAllCollapsed(false);
    } else if (action === 'collapseAll') {
      store.setAllCollapsed(true);
    } else if (action === 'help') {
      store.setShortcutsOpen(true);
    }
    return;
  }

  // ── 바꿀 수 없는 Ctrl 조합: 되돌리기·다시실행, 단계별 펼치기 ──
  if (ctrl) {
    if (e.key === 'z' || e.key === 'y') {
      if (store.readOnly) return;
      e.preventDefault();
      if (e.key === 'z') undo();
      else redo();
    } else if (e.key >= '1' && e.key <= '4') {
      // Ctrl+1~4 = 그 단계까지만 펼치기. 5 이상은 "전체 펼치기"와 사실상
      // 같아지므로 넣지 않는다 — 손가락이 닿는 범위만 준다.
      e.preventDefault();
      store.expandToLevel(Number(e.key));
    }
    return;
  }

  if (ARROW_TO_DIR[e.key]) {
    // 방향키 = 트리 탐색 (기본 스크롤 방지)
    e.preventDefault();
    store.selectRelative(ARROW_TO_DIR[e.key]);
  } else if (e.key === 'Escape') {
    store.setSelectedNodeId(null);
  }
}

/** 전역 단축키를 window에 붙인다. */
export function useGlobalShortcuts(undo: () => void, redo: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleShortcut(e, undo, redo);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);
}
