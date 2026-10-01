import { describe, it, expect } from 'vitest';
import { makeSlug, validateHandle, normalizeHandle, mapUrl, handleUrl } from './publish';

describe('makeSlug', () => {
  it('제목 뒤에 난수 6자를 붙인다', () => {
    expect(makeSlug('자바의신')).toMatch(/^자바의신-[0-9a-z]{6}$/);
  });

  it('같은 제목이어도 겹치지 않는다', () => {
    const slugs = new Set(Array.from({ length: 50 }, () => makeSlug('같은제목')));
    expect(slugs.size).toBe(50);
  });

  it('공백과 기호는 하이픈 하나로 모은다', () => {
    expect(makeSlug('Real MySQL  8.0!!')).toMatch(/^real-mysql-8-0-[0-9a-z]{6}$/);
  });

  it('양 끝에 하이픈이 남지 않는다', () => {
    expect(makeSlug('!!! 제목 !!!')).toMatch(/^제목-[0-9a-z]{6}$/);
  });

  it('제목이 비어도 주소를 만든다', () => {
    expect(makeSlug('')).toMatch(/^[0-9a-z]{6}$/);
    expect(makeSlug('!!!')).toMatch(/^[0-9a-z]{6}$/);
  });

  it('아주 긴 제목은 잘라도 하이픈으로 끝나지 않는다', () => {
    const slug = makeSlug('가'.repeat(100));
    expect(slug).toMatch(/^가{40}-[0-9a-z]{6}$/);
  });
});

describe('validateHandle', () => {
  it('정상 닉네임은 통과', () => {
    expect(validateHandle('myh')).toBeNull();
    expect(validateHandle('a1')).toBeNull();
    expect(validateHandle('my-handle-7')).toBeNull();
  });

  it('길이 제한', () => {
    expect(validateHandle('a')).toContain('2자 이상');
    expect(validateHandle('a'.repeat(21))).toContain('20자 이하');
  });

  it('대문자·한글·공백·밑줄은 거절', () => {
    for (const bad of ['Myh', '한글', 'my handle', 'my_handle']) {
      expect(validateHandle(bad)).not.toBeNull();
    }
  });

  it('하이픈으로 시작하거나 끝날 수 없다', () => {
    expect(validateHandle('-abc')).not.toBeNull();
    expect(validateHandle('abc-')).not.toBeNull();
  });

  it('경로와 겹치는 이름은 거절 — /u/u 같은 주소가 생기면 화면이 가려진다', () => {
    expect(validateHandle('privacy')).not.toBeNull();
    expect(validateHandle('assets')).not.toBeNull();
  });
});

describe('normalizeHandle', () => {
  it('공백을 떼고 소문자로 — 이 정도는 막지 말고 고쳐준다', () => {
    expect(normalizeHandle('  MyHandle ')).toBe('myhandle');
  });
});

describe('주소 만들기', () => {
  it('맵과 목록 주소', () => {
    expect(mapUrl('abc-123', 'https://x.app')).toBe('https://x.app/m/abc-123');
    expect(handleUrl('myh', 'https://x.app')).toBe('https://x.app/u/myh');
  });

  it('한글 슬러그는 인코딩한다 — 복사한 링크가 채팅앱에서 깨지지 않게', () => {
    expect(mapUrl('자바-a1b2c3', 'https://x.app')).toBe('https://x.app/m/%EC%9E%90%EB%B0%94-a1b2c3');
  });
});
