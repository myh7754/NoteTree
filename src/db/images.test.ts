import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 이 테스트가 지키는 것:
 * 1. 사진은 본인 폴더(<계정 번호>/...)에만 올라간다 — 서버의 권한 규칙이 이 경로를 본다
 * 2. 올릴 수 없는 경우(사진이 아님, 로그아웃, 너무 큼, 공간이 참)에 사용자가 읽을 문장이 나온다
 */

const state = {
  userId: 'user-1' as string | null,
  uploadError: null as { message: string } | null,
};
const uploads: { bucket: string; path: string; body: Blob }[] = [];

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: Blob) => {
          uploads.push({ bucket, path, body });
          return { error: state.uploadError };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
      }),
    },
  },
}));

import { fitWithin, uploadNoteImage, IMAGE_MAX_BYTES } from './images';

const photo = (type = 'image/png') => new File(['x'], 'a.png', { type });
const small = async () => new Blob(['small'], { type: 'image/webp' });

beforeEach(() => {
  state.userId = 'user-1';
  state.uploadError = null;
  uploads.length = 0;
});

describe('fitWithin', () => {
  it('긴 변이 한도를 넘으면 비율을 지키며 줄인다', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('한도보다 작으면 그대로 둔다', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('uploadNoteImage', () => {
  it('줄인 사진을 본인 폴더에 올리고 공개 주소를 돌려준다', async () => {
    const url = await uploadNoteImage(photo(), small);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].bucket).toBe('note-images');
    expect(uploads[0].path).toMatch(/^user-1\/[\w-]+\.webp$/);
    expect(uploads[0].body.type).toBe('image/webp');
    expect(url).toBe(`https://cdn.test/note-images/${uploads[0].path}`);
  });

  it('사진이 아니면 올리지 않는다', async () => {
    await expect(uploadNoteImage(photo('application/pdf'), small)).rejects.toThrow(/사진 파일만/);
    expect(uploads).toHaveLength(0);
  });

  it('로그인하지 않았으면 올리지 않는다', async () => {
    state.userId = null;
    await expect(uploadNoteImage(photo(), small)).rejects.toThrow(/로그인/);
    expect(uploads).toHaveLength(0);
  });

  it('줄인 뒤에도 한도를 넘으면 올리지 않는다', async () => {
    const big = async () => new Blob([new Uint8Array(IMAGE_MAX_BYTES + 1)], { type: 'image/gif' });
    await expect(uploadNoteImage(photo('image/gif'), big)).rejects.toThrow(/2MB/);
    expect(uploads).toHaveLength(0);
  });

  it('서버가 권한 규칙으로 거부하면 공간이 찼다고 알린다', async () => {
    state.uploadError = { message: 'new row violates row-level security policy' };
    await expect(uploadNoteImage(photo(), small)).rejects.toThrow(/50MB/);
  });
});
