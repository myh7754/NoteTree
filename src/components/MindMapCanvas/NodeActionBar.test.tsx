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
