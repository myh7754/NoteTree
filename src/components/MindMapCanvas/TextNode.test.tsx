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
