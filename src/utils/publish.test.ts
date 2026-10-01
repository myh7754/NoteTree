import { describe, it, expect } from 'vitest';
import { makeSlug, validateHandle, normalizeHandle, mapUrl, mapPath, handleUrl } from './publish';

describe('makeSlug', () => {
  it('제목을 그대로 주소 조각으로 쓴다 (닉네임이 앞에 붙으므로 난수가 필요 없다)', () => {
    expect(makeSlug('자바의신')).toBe('자바의신');
  });

  it('공백과 기호는 하이픈 하나로 모으고 소문자로', () => {
    expect(makeSlug('Real MySQL  8.0!!')).toBe('real-mysql-8-0');
  });

  it('양 끝에 하이픈이 남지 않는다', () => {
    expect(makeSlug('!!! 제목 !!!')).toBe('제목');
  });

  it('같은 사람이 같은 제목을 또 공개하면 번호가 붙는다', () => {
    expect(makeSlug('자바', ['자바'])).toBe('자바-2');
    expect(makeSlug('자바', ['자바', '자바-2'])).toBe('자바-3');
  });

  it('중간 번호가 비어 있으면 그 자리를 쓴다', () => {
    expect(makeSlug('자바', ['자바', '자바-3'])).toBe('자바-2');
  });

  it('다른 제목의 슬러그와는 상관없다', () => {
    expect(makeSlug('자바', ['db', 'spring'])).toBe('자바');
  });

  it('제목이 비거나 기호뿐이어도 주소를 만든다', () => {
    expect(makeSlug('')).toBe('map');
    expect(makeSlug('!!!', ['map'])).toBe('map-2');
  });

  it('아주 긴 제목은 잘라도 하이픈으로 끝나지 않는다', () => {
    expect(makeSlug('가'.repeat(100))).toBe('가'.repeat(40));
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
  it('맵 주소에는 닉네임이 들어간다', () => {
    expect(mapUrl('myh', '자바', 'https://x.app')).toBe(
      'https://x.app/m/myh/%EC%9E%90%EB%B0%94'
    );
    expect(mapPath('myh', 'db')).toBe('/m/myh/db');
  });

  it('목록 주소', () => {
    expect(handleUrl('myh', 'https://x.app')).toBe('https://x.app/u/myh');
  });
});
