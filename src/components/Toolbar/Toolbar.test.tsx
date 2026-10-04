import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// 맵 목록은 IndexedDB를 읽는다 — jsdom에는 없으므로 경계만 가짜로 둔다
vi.mock('../../db/mindmapDB', () => ({
  listMaps: vi.fn().mockResolvedValue([]),
  loadMindMap: vi.fn(),
  deleteMap: vi.fn(),
  saveMindMap: vi.fn().mockResolvedValue(Date.now()),
}));

import { Toolbar } from './Toolbar';
import { useMindMapStore } from '../../store/useMindMapStore';

const store = () => useMindMapStore.getState();

beforeEach(() => {
  store().setShortcutsOpen(false);
  store().setSettingsOpen(false);
});

describe('Toolbar', () => {
  /**
   * 툴바가 15개 버튼으로 두 줄이 되어 "지저분하다"는 지적을 받았다.
   * 하루에 한 번 쓸까 말까 한 파일 입출력은 메뉴 안으로 들어가야 한다 —
   * 다시 밖으로 꺼내면 이 테스트가 깨진다.
   */
  it('파일 입출력 버튼은 툴바에 직접 노출되지 않는다', () => {
    render(<Toolbar />);
    // 부분 일치로 본다 — 정확 일치는 그냥 통과해버린다
    for (const label of [/JSON 저장/, /MD 가져오기/, /MD 내보내기/, /PNG/]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('모두 펼치기/접기도 보기 메뉴 안으로 들어갔다', () => {
    render(<Toolbar />);
    expect(screen.queryByText(/모두 펼치기/)).not.toBeInTheDocument();
    expect(screen.queryByText(/모두 접기/)).not.toBeInTheDocument();
  });

  it('매번 쓰는 것들은 그대로 밖에 있다', () => {
    render(<Toolbar />);
    for (const name of ['실행 취소', '다시 실행', '검색', '보기', '정렬', '더보기']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  /**
   * 추가 버튼과 색 팔레트는 고른 노드 위의 노드 도구로 갔다.
   * 툴바에 남아 있으면 노드를 고를 때마다 툴바 모양이 바뀐다.
   */
  it('노드를 골라도 툴바에 추가 버튼과 색 팔레트가 없다', () => {
    store().setSelectedNodeId(store().mindMapData.rootId);
    render(<Toolbar />);
    expect(screen.queryByRole('button', { name: /텍스트/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '파랑' })).not.toBeInTheDocument();
  });

  it('더보기 → 단축키를 누르면 도움말이 열린다', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByText('단축키'));
    expect(store().isShortcutsOpen).toBe(true);
  });

  it('더보기 → 설정을 누르면 설정창이 열린다', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByText('설정'));
    expect(store().isSettingsOpen).toBe(true);
  });
});
