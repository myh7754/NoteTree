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
    // 단축키(Tab)로 만들 때와 같이 바로 이름을 칠 수 있어야 한다
    expect(store().editingNodeId).toBe(kids[0]);
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

  it('도구를 눌러도 클릭이 노드로 올라가지 않는다 — 올라가면 노드가 다시 선택돼 방금 만든 자식의 이름 입력이 풀린다', () => {
    const onNode = vi.fn();
    render(
      // 포털로 그려도 React 이벤트는 부모 컴포넌트(노드)로 올라간다
      <div onClick={onNode} onDoubleClick={onNode} onMouseDown={onNode} onPointerDown={onNode}>
        <NodeActionBar id={a} />
      </div>
    );
    const add = screen.getByRole('button', { name: /자식/ });
    fireEvent.pointerDown(add);
    fireEvent.mouseDown(add);
    fireEvent.click(add);
    fireEvent.doubleClick(add);
    expect(onNode).not.toHaveBeenCalled();
    expect(store().mindMapData.children[a].length).toBeGreaterThan(0);
  });

  it('중심 주제에는 삭제 버튼이 없다 — 눌러도 아무 일이 없는 버튼은 고장으로 보인다', () => {
    render(<NodeActionBar id={rootId} />);
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });
});
