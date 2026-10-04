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
