import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

// 세션 조회가 실패하거나(프로젝트 일시정지) 응답이 늦어도 ready가 켜져야 한다.
// ready가 false로 남으면 main.tsx가 null을 렌더해 화면이 통째로 빈다 (2026-09-24 실제 장애).
const getSession = vi.fn();

// mockReset은 쓰지 않는다 — 구현이 지워지면 getSession()이 undefined를 돌려줘
// 훅 안의 .then 체인이 깨지고 테스트가 멈춘다. 각 테스트가 직접 응답을 정한다.
vi.mock('../db/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  isCloudEnabled: true,
}));

describe('useAuth', () => {
  it('세션 조회가 실패해도 화면을 띄운다', async () => {
    getSession.mockRejectedValue(new Error('Failed to fetch'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.session).toBeNull();
  });

  it('세션 조회가 끝나지 않아도 3초 뒤에는 화면을 띄운다', async () => {
    getSession.mockReturnValue(new Promise(() => {})); // 영영 안 끝나는 요청
    const { result } = renderHook(() => useAuth());
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true), { timeout: 5000 });
  });

  it('정상 응답이면 세션을 들고 온다', async () => {
    const session = { user: { id: 'u1' } };
    getSession.mockResolvedValue({ data: { session } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.session).toBe(session);
  });
});
