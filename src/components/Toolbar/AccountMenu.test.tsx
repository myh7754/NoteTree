import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
import { useMindMapStore } from '../../store/useMindMapStore';

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

describe('AccountMenu', () => {
  // 회원 탈퇴 자체의 테스트는 설정창으로 옮겼다 (Settings/SettingsDialog.test.tsx).
  // 여기서는 "계정 메뉴가 설정창으로 가는 길을 열어 준다"만 본다.
  it('계정 설정을 누르면 설정창이 열린다', () => {
    useMindMapStore.setState({ isSettingsOpen: false });
    render(<AccountMenu />);
    openMenu();
    fireEvent.click(screen.getByText(/계정 설정/));
    expect(useMindMapStore.getState().isSettingsOpen).toBe(true);
  });

  it('계정 메뉴에는 탈퇴 버튼을 직접 두지 않는다 — 같은 기능이 두 곳에 있으면 한쪽만 고쳐진다', () => {
    render(<AccountMenu />);
    openMenu();
    expect(screen.queryByText('정말 탈퇴')).not.toBeInTheDocument();
  });

  it('클라우드가 꺼져 있으면 아무것도 그리지 않는다', () => {
    auth.cloudEnabled = false;
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });
});
