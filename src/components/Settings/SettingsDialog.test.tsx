import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * 회원 탈퇴의 안전장치는 AccountMenu에서 설정창으로 이사하면서 그대로 따라왔다.
 * 자리가 바뀌었다고 2단계 확인과 연타 방지가 사라지면 안 되므로, 테스트도 같이 옮겼다.
 */
const deleteAccount = vi.fn().mockResolvedValue(undefined);
vi.mock('../../db/account', () => ({ deleteAccount: () => deleteAccount() }));
const getMyHandle = vi.fn();
const getAutoPublic = vi.fn();
const setAutoPublic = vi.fn();
const listMyMapsPublish = vi.fn();
const setMapPublic = vi.fn();
const syncNow = vi.fn();
const calls: string[] = []; // 호출 순서를 본다 — 켤 때 동기화가 먼저여야 한다
vi.mock('../../db/publish', () => ({
  getMyHandle: () => getMyHandle(),
  getAutoPublic: () => getAutoPublic(),
  setAutoPublic: (...a: unknown[]) => setAutoPublic(...a),
  listMyMapsPublish: () => listMyMapsPublish(),
  setMapPublic: (...a: unknown[]) => setMapPublic(...a),
  claimHandle: vi.fn(),
}));
vi.mock('../../db/cloudSync', () => ({ syncNow: () => syncNow() }));

const auth = { session: { user: { id: 'u1', email: 'me@example.com' } }, ready: true, cloudEnabled: true };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => auth }));

import { SettingsDialog } from './SettingsDialog';
import { useMindMapStore } from '../../store/useMindMapStore';

const reload = vi.fn();

beforeEach(() => {
  // jsdom은 페이지 이동을 구현하지 않아 실제 reload는 소음을 낸다
  vi.stubGlobal('location', { reload, origin: 'https://x.app' });
  reload.mockClear();
  deleteAccount.mockClear();
  auth.session = { user: { id: 'u1', email: 'me@example.com' } };
  useMindMapStore.setState({ isSettingsOpen: true, notePanelSide: 'right', publishRevision: 0 });
  calls.length = 0;
  getMyHandle.mockReset().mockResolvedValue('myh');
  getAutoPublic.mockReset().mockResolvedValue(false);
  setAutoPublic.mockReset().mockResolvedValue(undefined);
  listMyMapsPublish.mockReset().mockResolvedValue([
    { id: 'a', title: '자바', isPublic: true, slug: '자바-a1b2c3' },
    { id: 'b', title: 'DB', isPublic: false, slug: null },
  ]);
  syncNow.mockReset().mockImplementation(async () => {
    calls.push('sync');
  });
  setMapPublic.mockReset().mockImplementation(async () => {
    calls.push('set');
    return { isPublic: true, slug: 'x' };
  });
});

const openPublishTab = async () => {
  fireEvent.click(screen.getByText('공개'));
  await screen.findByText('자바');
};

const openAccountTab = () => fireEvent.click(screen.getByText('계정'));

describe('SettingsDialog', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    useMindMapStore.setState({ isSettingsOpen: false });
    const { container } = render(<SettingsDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it('노트 패널 위치를 바꾸면 스토어에 반영된다 — 노트 창과 같은 값을 본다', () => {
    render(<SettingsDialog />);
    fireEvent.click(screen.getByText('왼쪽'));
    expect(useMindMapStore.getState().notePanelSide).toBe('left');
    expect(localStorage.getItem('note-panel-side')).toBe('left');
  });

  it('색 모드를 라이트로 바꾸면 저장되고 화면에 바로 적용된다', () => {
    render(<SettingsDialog />);
    for (const label of ['시스템 따름', '다크', '라이트']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: '라이트' }));
    expect(useMindMapStore.getState().colorMode).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: '라이트' })).toHaveAttribute('aria-pressed', 'true');
    useMindMapStore.getState().setColorMode('system'); // 다음 테스트에 남기지 않는다
  });

  it('배경을 누르면 닫힌다', () => {
    render(<SettingsDialog />);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(useMindMapStore.getState().isSettingsOpen).toBe(false);
  });
});

describe('SettingsDialog 회원 탈퇴', () => {
  it('한 번 눌러서는 지워지지 않는다 (확인 단계가 있다)', () => {
    render(<SettingsDialog />);
    openAccountTab();
    fireEvent.click(screen.getByText('탈퇴하기'));
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText('정말 탈퇴')).toBeInTheDocument();
  });

  it('확인을 누르면 탈퇴한다', async () => {
    render(<SettingsDialog />);
    openAccountTab();
    fireEvent.click(screen.getByText('탈퇴하기'));
    fireEvent.click(screen.getByText('정말 탈퇴'));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('연타해도 한 번만 호출한다', async () => {
    render(<SettingsDialog />);
    openAccountTab();
    fireEvent.click(screen.getByText('탈퇴하기'));
    const confirm = screen.getByText('정말 탈퇴');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('취소하면 처음 상태로 돌아간다', () => {
    render(<SettingsDialog />);
    openAccountTab();
    fireEvent.click(screen.getByText('탈퇴하기'));
    fireEvent.click(screen.getByText('취소'));
    expect(screen.queryByText('정말 탈퇴')).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('로그인하지 않았으면 탈퇴 버튼이 없다', () => {
    auth.session = null as unknown as typeof auth.session;
    render(<SettingsDialog />);
    openAccountTab();
    expect(screen.queryByText('탈퇴하기')).not.toBeInTheDocument();
  });
});

describe('SettingsDialog 공개 탭', () => {
  it('내 맵 전체와 공개 여부를 보여준다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    expect(screen.getByText(/1개 공개 중 \/ 전체 2개/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '자바 공개' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'DB 공개' })).toHaveAttribute('aria-checked', 'false');
  });

  it('켤 때는 동기화를 먼저 한다 — 안 그러면 방문자가 옛 내용을 본다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(screen.getByRole('switch', { name: 'DB 공개' }));
    await waitFor(() => expect(setMapPublic).toHaveBeenCalledWith('b', 'DB', true));
    expect(calls).toEqual(['sync', 'set']);
  });

  it('끌 때는 동기화하지 않는다 — 서버 값만 바꾸면 된다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(screen.getByRole('switch', { name: '자바 공개' }));
    await waitFor(() => expect(setMapPublic).toHaveBeenCalledWith('a', '자바', false));
    expect(syncNow).not.toHaveBeenCalled();
  });

  it('바꾼 뒤 신호를 올려 툴바도 다시 읽게 한다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(screen.getByRole('switch', { name: 'DB 공개' }));
    await waitFor(() => expect(useMindMapStore.getState().publishRevision).toBe(1));
    // 신호가 오르면 이 탭도 목록을 다시 읽는다
    await waitFor(() => expect(listMyMapsPublish).toHaveBeenCalledTimes(2));
  });

  it('닉네임이 없으면 토글이 잠기고 닉네임 입력란이 나온다', async () => {
    getMyHandle.mockResolvedValue(null);
    render(<SettingsDialog />);
    await openPublishTab();
    expect(screen.getByRole('switch', { name: 'DB 공개' })).toBeDisabled();
    expect(screen.getByLabelText('닉네임')).toBeInTheDocument();
  });

  it('실패하면 이유를 보여주고 신호는 올리지 않는다', async () => {
    setMapPublic.mockRejectedValue(new Error('공개 설정을 바꾸지 못했습니다'));
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(screen.getByRole('switch', { name: '자바 공개' }));
    expect(await screen.findByText(/바꾸지 못했습니다/)).toBeInTheDocument();
    expect(useMindMapStore.getState().publishRevision).toBe(0);
  });
});

describe('SettingsDialog 전체 공개 토글', () => {
  const master = () => screen.getByRole('switch', { name: '전체 공개' });

  it('토글은 전체 공개 모드를 보여준다 — 전부 공개여도 모드가 꺼져 있으면 꺼진 것', async () => {
    listMyMapsPublish.mockResolvedValue([
      { id: 'a', title: '자바', isPublic: true, slug: 's1' },
      { id: 'b', title: 'DB', isPublic: true, slug: 's2' },
    ]);
    render(<SettingsDialog />);
    await openPublishTab();
    expect(master()).toHaveAttribute('aria-checked', 'false');
  });

  it('모드가 켜져 있으면 켜진 것으로 보인다', async () => {
    getAutoPublic.mockResolvedValue(true);
    render(<SettingsDialog />);
    await openPublishTab();
    expect(master()).toHaveAttribute('aria-checked', 'true');
  });

  it('켜려고 누르면 바로 실행되지 않고 한 번 더 묻는다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    expect(setMapPublic).not.toHaveBeenCalled();
    expect(setAutoPublic).not.toHaveBeenCalled();
    expect(screen.getByText(/앞으로 만드는 맵이 모두 공개됩니다/)).toBeInTheDocument();
  });

  it('확인하면 비공개였던 맵을 켜고 모드를 켠다 — 동기화는 한 번만', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    fireEvent.click(screen.getByText('모두 공개'));
    await waitFor(() => expect(setAutoPublic).toHaveBeenCalledWith(true));
    expect(setMapPublic).toHaveBeenCalledTimes(1);
    expect(setMapPublic).toHaveBeenCalledWith('b', 'DB', true);
    expect(calls).toEqual(['sync', 'set']);
  });

  it('이미 전부 공개여도 확인하면 모드를 켠다 (새 맵을 위해)', async () => {
    listMyMapsPublish.mockResolvedValue([{ id: 'a', title: '자바', isPublic: true, slug: 's1' }]);
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    fireEvent.click(screen.getByText('모두 공개'));
    await waitFor(() => expect(setAutoPublic).toHaveBeenCalledWith(true));
    expect(setMapPublic).not.toHaveBeenCalled();
  });

  it('취소하면 아무것도 바뀌지 않는다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    fireEvent.click(screen.getByText('취소'));
    expect(setMapPublic).not.toHaveBeenCalled();
    expect(setAutoPublic).not.toHaveBeenCalled();
    expect(screen.queryByText('모두 공개')).not.toBeInTheDocument();
  });

  it('켜진 상태에서 누르면 전부 끄고 모드도 끈다 (확인 없이, 동기화 없이)', async () => {
    getAutoPublic.mockResolvedValue(true);
    listMyMapsPublish.mockResolvedValue([
      { id: 'a', title: '자바', isPublic: true, slug: 's1' },
      { id: 'b', title: 'DB', isPublic: true, slug: 's2' },
    ]);
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    await waitFor(() => expect(setAutoPublic).toHaveBeenCalledWith(false));
    expect(setMapPublic).toHaveBeenCalledWith('a', '자바', false);
    expect(setMapPublic).toHaveBeenCalledWith('b', 'DB', false);
    expect(syncNow).not.toHaveBeenCalled();
  });

  it('모드가 꺼져 있고 일부가 공개일 때는 "모두 끄기"로 공개 중인 것만 끈다', async () => {
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(screen.getByText('모두 끄기'));
    await waitFor(() => expect(setMapPublic).toHaveBeenCalledTimes(1));
    expect(setMapPublic).toHaveBeenCalledWith('a', '자바', false);
  });

  it('중간에 실패하면 모드를 켜지 않고, 목록을 다시 읽어 실제 상태를 보여준다', async () => {
    listMyMapsPublish.mockResolvedValue([
      { id: 'a', title: '자바', isPublic: false, slug: null },
      { id: 'b', title: 'DB', isPublic: false, slug: null },
    ]);
    setMapPublic
      .mockImplementationOnce(async () => ({ isPublic: true, slug: 'x' }))
      .mockRejectedValueOnce(new Error('두 번째에서 실패'));
    render(<SettingsDialog />);
    await openPublishTab();
    fireEvent.click(master());
    fireEvent.click(screen.getByText('모두 공개'));
    await waitFor(() => expect(useMindMapStore.getState().publishRevision).toBe(1));
    expect(setMapPublic).toHaveBeenCalledTimes(2);
    expect(setAutoPublic).not.toHaveBeenCalled();
  });

  it('닉네임이 없으면 잠긴다', async () => {
    getMyHandle.mockResolvedValue(null);
    render(<SettingsDialog />);
    await openPublishTab();
    expect(master()).toBeDisabled();
  });
});
