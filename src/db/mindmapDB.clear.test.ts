import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setDbUser, clearLocalData } from './mindmapDB';

describe('clearLocalData', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom에는 indexedDB가 없다. 호출 여부만 확인하면 되므로 경계를 가짜로 둔다.
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn(() => {
        const req: Record<string, unknown> = {};
        // 비동기로 성공 콜백을 때린다
        setTimeout(() => (req.onsuccess as () => void)?.(), 0);
        return req;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('현재 계정의 IndexedDB를 지운다', async () => {
    setDbUser('user-1');
    await clearLocalData();
    expect(indexedDB.deleteDatabase).toHaveBeenCalledWith('mindmap-db:user-1');
  });

  it('앱이 쓰는 localStorage 키를 지운다', async () => {
    setDbUser('user-1');
    localStorage.setItem('last-map-id', 'abc');
    localStorage.setItem('note-panel-width', '360');
    localStorage.setItem('note-panel-side', 'left');
    await clearLocalData();
    expect(localStorage.getItem('last-map-id')).toBeNull();
    expect(localStorage.getItem('note-panel-width')).toBeNull();
    expect(localStorage.getItem('note-panel-side')).toBeNull();
  });

  it('deleteDatabase가 onerror를 부르면 resolve되고 localStorage를 지운다', async () => {
    setDbUser('user-1');
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn(() => {
        const req: Record<string, unknown> = { error: new Error('삭제 실패') };
        setTimeout(() => (req.onerror as () => void)?.(), 0);
        return req;
      }),
    });
    localStorage.setItem('last-map-id', 'abc');
    localStorage.setItem('note-panel-width', '360');
    localStorage.setItem('note-panel-side', 'left');
    localStorage.setItem('legacy-maps-claimed', '1');
    await clearLocalData();
    expect(localStorage.getItem('last-map-id')).toBeNull();
    expect(localStorage.getItem('note-panel-width')).toBeNull();
    expect(localStorage.getItem('note-panel-side')).toBeNull();
    expect(localStorage.getItem('legacy-maps-claimed')).toBe('1');
  });

  it('deleteDatabase가 onblocked를 부르면 resolve되고 localStorage를 지운다', async () => {
    setDbUser('user-2');
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn(() => {
        const req: Record<string, unknown> = {};
        setTimeout(() => (req.onblocked as () => void)?.(), 0);
        return req;
      }),
    });
    localStorage.setItem('last-map-id', 'def');
    localStorage.setItem('note-panel-width', '400');
    localStorage.setItem('note-panel-side', 'right');
    localStorage.setItem('legacy-maps-claimed', '1');
    await clearLocalData();
    expect(localStorage.getItem('last-map-id')).toBeNull();
    expect(localStorage.getItem('note-panel-width')).toBeNull();
    expect(localStorage.getItem('note-panel-side')).toBeNull();
    expect(localStorage.getItem('legacy-maps-claimed')).toBe('1');
  });

  it('legacy-maps-claimed 플래그는 지우지 않는다 (다음 사용자에게 옛 맵이 넘어가는 유출 방지)', async () => {
    setDbUser('user-1');
    localStorage.setItem('legacy-maps-claimed', '1');
    await clearLocalData();
    expect(localStorage.getItem('legacy-maps-claimed')).toBe('1');
  });
});
