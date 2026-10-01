import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * 회원 탈퇴의 안전장치는 AccountMenu에서 설정창으로 이사하면서 그대로 따라왔다.
 * 자리가 바뀌었다고 2단계 확인과 연타 방지가 사라지면 안 되므로, 테스트도 같이 옮겼다.
 */
const deleteAccount = vi.fn().mockResolvedValue(undefined);
vi.mock('../../db/account', () => ({ deleteAccount: () => deleteAccount() }));
vi.mock('../../db/publish', () => ({ getMyHandle: vi.fn().mockResolvedValue('myh') }));

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
  useMindMapStore.setState({ isSettingsOpen: true, notePanelSide: 'right' });
});

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
