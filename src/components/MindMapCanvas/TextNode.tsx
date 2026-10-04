import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MindMapNode } from '../../types';
import { useMindMapStore, collectSubtree } from '../../store/useMindMapStore';
import { hasNoteContent } from '../../utils/noteText';
import { NoteIconButton } from './NoteIconButton';
import { NodeActionBar } from './NodeActionBar';
import { nodeLook, treeMeta } from '../../utils/mapTheme';
import { directionOf, leftBranchStart } from '../../utils/layout';

export const TextNode = memo(function TextNode({ data, id, selected }: NodeProps<MindMapNode>) {
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateNodeLabel, toggleCollapse, openNoteDrawer, mindMapData, editingNodeId, setEditingNodeId, readOnly, mapTheme } =
    useMindMapStore();

  // 편집 상태는 스토어가 단일 출처: 더블클릭/F2/Tab·Enter(생성 직후) 모두 여기로 모인다.
  const editing = editingNodeId === id;
  const hasChildren = (mindMapData.children[id] ?? []).length > 0;
  const noted = hasNoteContent(data.note);
  const meta = treeMeta(mindMapData.rootId, mindMapData.children);
  const look = nodeLook(mapTheme, meta.depth.get(id) ?? 0, meta.branch.get(id) ?? -1, data.style?.color);
  // 좌우 배치에서 왼쪽 가지에 있는가 — 자식이 왼쪽으로 뻗으므로 접기 버튼도 왼쪽에 둔다
  const rootKidCount = (mindMapData.children[mindMapData.rootId] ?? []).length;
  const onLeft = (meta.branch.get(id) ?? -1) >= leftBranchStart(rootKidCount, directionOf(mindMapData));
  // 밑줄형은 선이 밑줄로 이어지도록 연결점을 아래로 내린다
  const handleStyle = look.anchor === 'bottom' ? { top: 'calc(100% + 1px)' } : undefined;
  // 접힌 가지가 얼마나 큰지 펼치지 않고도 알 수 있게 숨은 후손 수를 적는다 (자기 자신은 뺀다)
  const hiddenCount = data.collapsed ? collectSubtree(id, mindMapData.children).size - 1 : 0;

  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (editing) {
      // 새로 만든 '새 노드'는 전체 선택해두면 바로 타이핑으로 덮어쓸 수 있다.
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditingNodeId(null);
    if (label !== data.label) updateNodeLabel(id, label);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div
      className={`relative group flex items-center gap-1 select-none ${
        look.plain ? 'hover:bg-slate-800/70' : ''
      } ${selected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950' : ''}`}
      style={look.style}
      onDoubleClick={() => !readOnly && setEditingNodeId(id)}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" style={handleStyle} />

      {editing ? (
        <input
          ref={inputRef}
          className="bg-transparent outline-none w-full text-white"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="flex-1">{data.label}</span>
      )}

      {/* 내용이 있는 노트는 항상 표시한다 — 펼치지 않고도 "여기 뭔가 적혀 있다"를 알 수 있게.
          hover 시 숨기지 않는 이유: 노드 폭이 바뀌면 실측 크기가 달라져 배치가 다시 계산된다
          (useMindMapStore의 onRfNodesChange). 마우스만 올려도 맵이 출렁이게 된다. */}
      {noted && (
        <NoteIconButton
          note={data.note}
          title={data.label}
          className="shrink-0 text-[11px] leading-none opacity-80 hover:opacity-100"
          onOpen={() => openNoteDrawer(id)}
        />
      )}

      {/* 노드에 하는 일은 고른 노드 위에 뜬다. 이름을 고치는 중에는 입력칸을 가리므로 숨긴다. */}
      {selected && !readOnly && !editing && <NodeActionBar id={id} />}

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

      <Handle type="source" position={Position.Right} className="!opacity-0" style={handleStyle} />
    </div>
  );
});
