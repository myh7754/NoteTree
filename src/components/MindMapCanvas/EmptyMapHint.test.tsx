import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyMapHint } from './EmptyMapHint';
import { useMindMapStore, createEmptyMindMap } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();

beforeEach(() => {
  useMindMapStore.setState({ readOnly: false });
  store().openMap(createEmptyMindMap('t'), {});
});

describe('EmptyMapHint', () => {
  it('노드가 하나뿐이면 가지 치는 법을 알려 준다', () => {
    render(<EmptyMapHint />);
    expect(screen.getByText(/가지를 칩니다/)).toBeInTheDocument();
    expect(screen.getByText('Tab')).toBeInTheDocument();
  });

  it('노드가 둘 이상이면 사라진다', () => {
    store().addChildNode(store().mindMapData.rootId);
    const { container } = render(<EmptyMapHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it('읽기전용에서는 뜨지 않는다', () => {
    useMindMapStore.setState({ readOnly: true });
    const { container } = render(<EmptyMapHint />);
    expect(container).toBeEmptyDOMElement();
  });
});
