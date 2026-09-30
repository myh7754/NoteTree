import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const deleteAccount = vi.fn().mockResolvedValue(undefined);
vi.mock('../../db/account', () => ({ deleteAccount: () => deleteAccount() }));
vi.mock('../../db/cloudSync', () => ({ syncNow: vi.fn() }));
vi.mock('../../db/mindmapDB', () => ({ listMaps: vi.fn().mockResolvedValue([]), loadMindMap: vi.fn() }));

const auth = { session: { user: { id: 'u1', email: 'me@example.com' } }, ready: true, cloudEnabled: true };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => auth,
  signInWith: vi.fn(),
  signOut: vi.fn(),
}));

import { AccountMenu } from './AccountMenu';

const reload = vi.fn();

beforeEach(() => {
  // jsdom은 페이지 이동을 구현하지 않아 실제 reload는 소음을 낸다
  vi.stubGlobal('location', { reload });
  reload.mockClear();
  deleteAccount.mockClear();
  auth.session = { user: { id: 'u1', email: 'me@example.com' } };
  auth.cloudEnabled = true;
});

const openMenu = () => fireEvent.click(screen.getByText(/me@example.com/));

describe('AccountMenu 회원 탈퇴', () => {
  it('한 번 눌러서는 지워지지 않는다 (확인 단계가 있다)', () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();
  });

  it('확인을 누르면 탈퇴한다', async () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    fireEvent.click(screen.getByText('정말 탈퇴'));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('연타해도 한 번만 호출한다', async () => {
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText('회원 탈퇴'));
    const confirm = screen.getByText('정말 탈퇴');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('로그인하지 않았으면 탈퇴 버튼이 없다', () => {
    auth.session = null as unknown as typeof auth.session;
    render(<AccountMenu />);
    expect(screen.queryByText('회원 탈퇴')).not.toBeInTheDocument();
  });

  it('클라우드가 꺼져 있으면 아무것도 그리지 않는다', () => {
    auth.cloudEnabled = false;
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });
});
