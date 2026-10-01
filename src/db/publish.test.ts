import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 이 테스트가 지키는 것:
 * 1. 한 번 만든 공개 주소는 변하지 않는다 (다시 만들어지면 보낸 링크가 조용히 404가 된다)
 * 2. 같은 사람의 주소끼리 겹치지 않는다
 * 3. 맵 하나를 끄면 "전체 공개" 모드도 같이 꺼진다
 */

/** 테스트가 정하는 DB 상태 */
const db = {
  map: { is_public: false, slug: null as string | null },
  mySlugs: [] as string[],
  autoPublic: false,
};
const mapUpdates: unknown[] = [];
const profileUpdates: unknown[] = [];

vi.mock('./supabase', () => {
  const from = (table: string) => {
    let selected = '';
    let updating: unknown = undefined;
    const chain: Record<string, unknown> = {
      select: (cols: string) => {
        selected = cols;
        return chain;
      },
      update: (payload: unknown) => {
        updating = payload;
        (table === 'maps' ? mapUpdates : profileUpdates).push(payload);
        return chain;
      },
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      maybeSingle: async () => {
        if (table === 'profiles') return { data: { auto_public: db.autoPublic }, error: null };
        return { data: { ...db.map }, error: null };
      },
      // await 로 바로 끝나는 쿼리 (목록 조회, update)
      then: (resolve: (v: unknown) => void) => {
        if (updating !== undefined) return resolve({ error: null });
        if (table === 'maps' && selected === 'slug') {
          return resolve({ data: db.mySlugs.map((slug) => ({ slug })), error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return chain;
  };
  return {
    supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } },
    isCloudEnabled: true,
  };
});

import { setMapPublic, maybeAutoPublish, setAutoPublic } from './publish';

beforeEach(async () => {
  db.map = { is_public: false, slug: null };
  db.mySlugs = [];
  db.autoPublic = false;
  await setAutoPublic(false); // 모듈 안의 "이미 확인한 맵" 기억을 비운다
  mapUpdates.length = 0;
  profileUpdates.length = 0;
});

describe('setMapPublic', () => {
  it('처음 켤 때 제목으로 슬러그를 만든다', async () => {
    const result = await setMapPublic('map1', '자바의신', true);
    expect(result).toEqual({ isPublic: true, slug: '자바의신' });
    expect(mapUpdates).toEqual([{ is_public: true, slug: '자바의신' }]);
  });

  it('내가 이미 쓰는 슬러그와 겹치면 번호를 붙인다', async () => {
    db.mySlugs = ['자바', '자바-2'];
    const result = await setMapPublic('map1', '자바', true);
    expect(result.slug).toBe('자바-3');
  });

  it('이미 슬러그가 있으면 그대로 쓴다 — 껐다 켜도, 제목을 바꿔도 링크가 유지된다', async () => {
    db.map = { is_public: false, slug: '자바' };
    const result = await setMapPublic('map1', '제목이-바뀌었다', true);
    expect(result.slug).toBe('자바');
    expect(mapUpdates).toEqual([{ is_public: true, slug: '자바' }]);
  });

  it('끌 때도 슬러그를 지우지 않는다 — 다시 켜면 같은 링크여야 한다', async () => {
    db.map = { is_public: true, slug: '자바' };
    const result = await setMapPublic('map1', '자바', false);
    expect(result).toEqual({ isPublic: false, slug: '자바' });
    expect(mapUpdates).toEqual([{ is_public: false, slug: '자바' }]);
  });

  it('비공개인 채로 슬러그가 없으면 만들지 않는다 — 쓰지도 않을 주소를 선점하지 않는다', async () => {
    const result = await setMapPublic('map1', '자바', false);
    expect(result.slug).toBeNull();
  });

  it('맵 하나를 끄면 전체 공개 모드도 꺼진다', async () => {
    db.map = { is_public: true, slug: '자바' };
    await setMapPublic('map1', '자바', false);
    expect(profileUpdates).toEqual([{ auto_public: false }]);
  });

  it('켤 때는 전체 공개 모드를 건드리지 않는다', async () => {
    await setMapPublic('map1', '자바', true);
    expect(profileUpdates).toEqual([]);
  });
});

describe('maybeAutoPublish', () => {
  it('전체 공개 모드가 꺼져 있으면 아무것도 하지 않는다', async () => {
    expect(await maybeAutoPublish('new1', '새 과목')).toBe(false);
    expect(mapUpdates).toEqual([]);
  });

  it('전체 공개 모드면 새 맵을 공개한다', async () => {
    db.autoPublic = true;
    expect(await maybeAutoPublish('new1', '새 과목')).toBe(true);
    expect(mapUpdates).toEqual([{ is_public: true, slug: '새-과목' }]);
  });

  it('사용자가 직접 끈 맵(슬러그는 있고 비공개)은 다시 켜지 않는다', async () => {
    db.autoPublic = true;
    db.map = { is_public: false, slug: '자바' };
    expect(await maybeAutoPublish('map1', '자바')).toBe(false);
    expect(mapUpdates).toEqual([]);
  });

  it('같은 맵은 한 번만 확인한다 — 자동 저장은 0.5초마다 올 수 있다', async () => {
    db.autoPublic = true;
    await maybeAutoPublish('new1', '새 과목');
    mapUpdates.length = 0;
    expect(await maybeAutoPublish('new1', '새 과목')).toBe(false);
    expect(mapUpdates).toEqual([]);
  });
});
