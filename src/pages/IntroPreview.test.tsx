import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { MindMapData } from '../types';

const loadPublicMap = vi.fn();
vi.mock('../db/publish', () => ({ loadPublicMap: (h: string, s: string) => loadPublicMap(h, s) }));
// 캔버스(React Flow)는 jsdom에서 크기를 재지 못한다. 여기서 볼 것은 "언제 그리는가"뿐이다.
vi.mock('../components/MindMapCanvas/MindMapCanvas', () => ({
  MindMapCanvas: () => <div data-testid="canvas" />,
}));

import { IntroPreview } from './IntroPreview';
import { useMindMapStore } from '../store/useMindMapStore';

const SHOWCASE: MindMapData = {
  id: 'showcase-map',
  title: '자바',
  rootId: 'r',
  nodes: { r: { id: 'r', label: '자바', type: 'text' }, a: { id: 'a', label: '컬렉션', type: 'text' } },
  children: { r: ['a'], a: [] },
} as unknown as MindMapData;

const found = { map: SHOWCASE, owner: { handle: 'myh', maps: [] } };

beforeEach(() => {
  loadPublicMap.mockReset();
  useMindMapStore.setState({ readOnly: false });
});

describe('IntroPreview', () => {
  it('공개 맵을 불러오면 캔버스를 그리고, 칸 전체가 운영자 공개 목록으로 가는 링크다', async () => {
    loadPublicMap.mockResolvedValue(found);
    render(<IntroPreview handle="myh" slug="자바" />);

    expect(await screen.findByTestId('canvas')).toBeInTheDocument();
    expect(loadPublicMap).toHaveBeenCalledWith('myh', '자바');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/u/myh');
    expect(useMindMapStore.getState().mindMapData.id).toBe('showcase-map');
    expect(useMindMapStore.getState().readOnly).toBe(true);
  });

  it('노드 크기가 잡힌 뒤 화면을 한 번 더 맞춘다 — 처음 맞춤은 크기를 재기 전이라 맵이 한쪽에 몰린다', async () => {
    loadPublicMap.mockResolvedValue(found);
    render(<IntroPreview handle="myh" slug="자바" />);
    await screen.findByTestId('canvas');
    const atReady = useMindMapStore.getState().fitRequest;

    await waitFor(() => expect(useMindMapStore.getState().fitRequest).toBeGreaterThan(atReady));
  });

  it('캔버스는 링크 안이 아니라 inert 칸 안에 있다 — 키보드가 노드마다 멈추거나 링크 안에 링크가 생기지 않게', async () => {
    loadPublicMap.mockResolvedValue(found);
    render(<IntroPreview handle="myh" slug="자바" />);
    const canvas = await screen.findByTestId('canvas');

    expect(canvas.closest('[inert]')).not.toBeNull();
    expect(canvas.closest('a')).toBeNull();
  });

  it('좁은 화면(세로 배치)에서도 높이가 유지된다 — flex-1은 가로 배치(lg)에서만 건다', () => {
    loadPublicMap.mockReturnValue(new Promise(() => {}));
    const { container } = render(<IntroPreview handle="myh" slug="자바" />);
    const box = container.firstElementChild!;

    expect(box.className).toContain('h-96');
    expect(box.className).toContain('lg:flex-1');
    expect(box.className.split(' ')).not.toContain('flex-1');
  });

  it('불러오는 동안에도 칸 자리는 잡혀 있다 — 맵이 뜰 때 글이 밀리지 않게', () => {
    loadPublicMap.mockReturnValue(new Promise(() => {}));
    render(<IntroPreview handle="myh" slug="자바" />);

    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('그런 공개 맵이 없으면 아무것도 그리지 않는다', async () => {
    loadPublicMap.mockResolvedValue(null);
    const { container } = render(<IntroPreview handle="myh" slug="자바" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('불러오기가 실패해도 에러 문구 없이 사라진다', async () => {
    loadPublicMap.mockRejectedValue(new Error('network'));
    const { container } = render(<IntroPreview handle="myh" slug="자바" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('화면을 떠나면 운영자 맵을 스토어에서 비우고 읽기전용을 끈다 — 남아 있으면 로그인한 새 사용자가 그 맵을 편집하게 된다', async () => {
    loadPublicMap.mockResolvedValue(found);
    const { unmount } = render(<IntroPreview handle="myh" slug="자바" />);
    await screen.findByTestId('canvas');

    unmount();

    expect(useMindMapStore.getState().mindMapData.id).not.toBe('showcase-map');
    expect(useMindMapStore.getState().readOnly).toBe(false);
  });
});
