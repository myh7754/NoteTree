import { NodeToolbar, Position, useStore } from '@xyflow/react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { keysFor } from '../../utils/shortcuts';
import { NodeStyleBar } from '../Toolbar/NodeStyleBar';
import { Icon } from '../Icon';

const btn =
  'flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-50';
const sep = <span className="mx-1 h-4 w-px bg-slate-700" />;
/** 노드 위쪽에 이만큼(px) 자리가 없으면 도구를 아래에 띄운다 */
const ROOM_ABOVE = 56;
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * 고른 노드 위에 뜨는 도구: 자식·표 추가, 노트, 색, 삭제. 읽기전용에서는 노트만.
 *
 * 전에는 추가 버튼과 색 팔레트가 툴바에 있어서, 고른 노드와 그 도구가 화면 양 끝에 있었다.
 * NodeToolbar는 확대 배율과 상관없이 같은 크기로 그려지고, 여러 개를 골랐을 때는 스스로 숨는다.
 */
export function NodeActionBar({ id }: { id: string }) {
  const addChildNode = useMindMapStore((s) => s.addChildNode);
  const setEditingNodeId = useMindMapStore((s) => s.setEditingNodeId);
  const openNoteDrawer = useMindMapStore((s) => s.openNoteDrawer);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const isRoot = useMindMapStore((s) => s.mindMapData.rootId === id);
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  const readOnly = useMindMapStore((s) => s.readOnly);
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
        // 포털로 그려도 React 이벤트는 노드로 올라간다. 막지 않으면 도구를 누를 때마다 이 노드가
        // 다시 선택되어, 방금 만든 자식의 이름 입력이 풀리고 키 입력이 단축키로 샌다.
        onClick={stop}
        onDoubleClick={stop}
        onMouseDown={stop}
        onPointerDown={stop}
      >
        {/* 읽기전용(공개 뷰어)에서는 노트만 연다. 노트 아이콘이 없는 노드 — 그림만 있는 노트,
            역링크만 있는 노드 — 도 방문자가 열 수 있어야 한다. */}
        {!readOnly && (
          <>
            {/* 단축키(Tab)와 같이, 만든 뒤 곧바로 이름을 칠 수 있게 편집을 켠다 */}
            <button className={btn} onClick={() => setEditingNodeId(addChildNode(id, 'text'))} title="글자 자식 추가">
              <Icon name="plus" size={14} />
              자식
              <kbd className="rounded border border-slate-600 bg-slate-900 px-1 font-mono text-[10px] text-slate-400">
                {keysFor('addChild', overrides)}
              </kbd>
            </button>
            <button className={btn} onClick={() => addChildNode(id, 'table')} title="표 자식 추가">
              <Icon name="table" size={14} />표
            </button>
          </>
        )}
        <button className={btn} onClick={() => openNoteDrawer(id)} title="노트 열기">
          <Icon name="note" size={14} />
          노트
        </button>
        {!readOnly && (
          <>
            {sep}
            <NodeStyleBar id={id} />
            {!isRoot && (
              <>
                {sep}
                <button
                  className={`${btn} hover:!bg-red-600 hover:!text-white`}
                  onClick={() => deleteNode(id)}
                  title="삭제"
                  aria-label="삭제"
                >
                  <Icon name="trash" size={14} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </NodeToolbar>
  );
}
