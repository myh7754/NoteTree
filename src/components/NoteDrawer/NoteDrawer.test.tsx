import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(store().isNoteDrawerOpen).toBe(false);
  });
});
