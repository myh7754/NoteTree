import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
const signOut = vi.fn();
const clearLocalData = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    auth: { signOut: (...a: unknown[]) => signOut(...a) },
  },
  isCloudEnabled: true,
}));
vi.mock('./mindmapDB', () => ({
  clearLocalData: (...a: unknown[]) => clearLocalData(...a),
}));

import { deleteAccount } from './account';

beforeEach(() => {
  invoke.mockReset();
  signOut.mockReset();
  clearLocalData.mockReset();
  signOut.mockResolvedValue({ error: null });
  clearLocalData.mockResolvedValue(undefined);
});

describe('deleteAccount', () => {
  it('서버 삭제 후 로컬을 지우고 로그아웃한다', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await deleteAccount();
    expect(invoke).toHaveBeenCalledWith('delete-account');
    expect(clearLocalData).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it('서버 삭제가 실패하면 로컬을 지우지 않는다', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: '401' } });
    await expect(deleteAccount()).rejects.toThrow(/탈퇴/);
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
