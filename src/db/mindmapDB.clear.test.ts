import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
