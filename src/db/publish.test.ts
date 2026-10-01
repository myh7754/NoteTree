import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 이 테스트가 지키는 것: **한 번 만든 공개 주소는 변하지 않는다.**
 *
 * 슬러그가 다시 만들어지면 이미 남에게 보낸 링크가 에러도 없이 404가 된다.
 * 조용히 깨지는 종류라 사람이 알아채기 어렵다 — 그래서 고정해 둔다.
 */

const maybeSingle = vi.fn();
const update = vi.fn();
const eq = vi.fn();

// supabase.from('maps').select(...).eq(...).maybeSingle()
// supabase.from('maps').update(...).eq(...)
vi.mock('./supabase', () => {
  const chain = () => ({
    select: () => chain(),
    update: (payload: unknown) => {
      update(payload);
      return chain();
    },
    eq: (...a: unknown[]) => {
      eq(...a);
      return chain();
    },
    is: () => chain(),
    order: () => chain(),
    maybeSingle: () => maybeSingle(),
    then: (resolve: (v: unknown) => void) => resolve({ error: null }),
  });
  return { supabase: { from: () => chain() }, isCloudEnabled: true };
});

import { setMapPublic } from './publish';

beforeEach(() => {
  maybeSingle.mockReset();
  update.mockReset();
  eq.mockReset();
});

describe('setMapPublic', () => {
  it('처음 켤 때 슬러그를 만든다', async () => {
    maybeSingle.mockResolvedValue({ data: { is_public: false, slug: null }, error: null });

    const result = await setMapPublic('map1', '자바의신', true);

    expect(result.isPublic).toBe(true);
    expect(result.slug).toMatch(/^자바의신-[0-9a-z]{6}$/);
    expect(update).toHaveBeenCalledWith({ is_public: true, slug: result.slug });
  });

  it('이미 슬러그가 있으면 그대로 쓴다 — 껐다 켜도 링크가 유지된다', async () => {
    maybeSingle.mockResolvedValue({
      data: { is_public: false, slug: '자바의신-a1b2c3' },
      error: null,
    });

    const result = await setMapPublic('map1', '제목이-바뀌었다', true);

    expect(result.slug).toBe('자바의신-a1b2c3');
    expect(update).toHaveBeenCalledWith({ is_public: true, slug: '자바의신-a1b2c3' });
  });

  it('끌 때도 슬러그를 지우지 않는다 — 다시 켜면 같은 링크여야 한다', async () => {
    maybeSingle.mockResolvedValue({
      data: { is_public: true, slug: '자바의신-a1b2c3' },
      error: null,
    });

    const result = await setMapPublic('map1', '자바의신', false);

    expect(result.isPublic).toBe(false);
    expect(result.slug).toBe('자바의신-a1b2c3');
    expect(update).toHaveBeenCalledWith({ is_public: false, slug: '자바의신-a1b2c3' });
  });

  it('비공개인 채로 슬러그가 없으면 만들지 않는다 — 쓰지도 않을 주소를 선점하지 않는다', async () => {
    maybeSingle.mockResolvedValue({ data: { is_public: false, slug: null }, error: null });

    const result = await setMapPublic('map1', '자바의신', false);

    expect(result.slug).toBeNull();
    expect(update).toHaveBeenCalledWith({ is_public: false, slug: null });
  });
});
