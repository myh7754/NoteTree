/**
 * 이 테스트가 지키는 것: **사용자 콘텐츠는 분석 도구로 나가지 않는다.**
 *
 * 규칙을 사람이 기억해서 지키는 구조면 언젠가 깨진다. 호출부에서 실수로 노트 본문이나
 * 맵 제목을 넘겨도 sanitize()에서 떨어지는지를 고정해 둔다.
 */
import { describe, it, expect, vi } from 'vitest';
import { sanitize } from './analytics';

describe('sanitize', () => {
  it('식별자와 수치는 그대로 통과시킨다', () => {
    const props = { map_id: 'a1b2c3', depth: 3, is_public: false, result_count: 0 };
    expect(sanitize(props)).toEqual(props);
  });

  // 금지 키 정규식이 넓어서(name, note, text…) 멀쩡한 속성이 조용히 떨어질 수 있다.
  // 실제로 보내는 속성 이름을 여기 고정해 둔다 — 새 이벤트를 더하면 여기에도 더한다.
  it('앱이 실제로 보내는 속성은 전부 통과한다', () => {
    const props = { format: 'markdown', provider: 'google', kind: 'table', viewer: true, kb: 312 };
    expect(sanitize(props)).toEqual(props);
  });

  it('콘텐츠로 보이는 키는 떨어뜨린다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = sanitize({
      map_id: 'a1b2c3',
      title: '내 공부 기록',
      note: '어제 배운 것',
      label: '루트',
      content: '...',
      body: '...',
      email: 'me@example.com',
      query: '인덱스',
    });
    expect(out).toEqual({ map_id: 'a1b2c3' });
  });

  it('긴 문자열은 키 이름이 멀쩡해도 떨어뜨린다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = sanitize({ map_id: 'ok', bucket: 'x'.repeat(200) });
    expect(out).toEqual({ map_id: 'ok' });
  });

  it('UUID 길이(36자)는 통과시킨다 — 식별자를 막으면 안 된다', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(sanitize({ map_id: uuid })).toEqual({ map_id: uuid });
  });

  it('떨어뜨릴 때 경고를 남긴다 — 조용히 사라지면 디버깅이 불가능하다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sanitize({ title: '제목' });
    expect(warn).toHaveBeenCalledOnce();
  });
});
