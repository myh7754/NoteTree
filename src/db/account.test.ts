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

  it('응답 본문에서 에러 사유를 추출한다', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({ error: 'unauthorized' }),
        },
      },
    });
    await expect(deleteAccount()).rejects.toThrow('unauthorized');
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('응답 본문 읽기가 실패해도 탈퇴 실패로 던진다', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => {
            throw new Error('parse failed');
          },
        },
      },
    });
    await expect(deleteAccount()).rejects.toThrow(/탈퇴/);
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('clearLocalData가 실패해도 탈퇴는 성공으로 끝나고 signOut을 호출한다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    clearLocalData.mockRejectedValue(new Error('storage error'));

    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(clearLocalData).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('deleteAccount (클라우드 OFF)', () => {
  it('클라우드가 꺼졌으면 로컬을 지우지 않는다', async () => {
    vi.resetModules();

    const clearLocalDataNull = vi.fn();
    vi.doMock('./supabase', () => ({
      supabase: null,
      isCloudEnabled: false,
    }));
    vi.doMock('./mindmapDB', () => ({
      clearLocalData: () => clearLocalDataNull(),
    }));

    const { deleteAccount: deleteAccountNull } = await import('./account');

    await expect(deleteAccountNull()).rejects.toThrow('클라우드가 꺼져 있어');
    expect(clearLocalDataNull).not.toHaveBeenCalled();
  });
});
