import { describe, it, expect } from 'vitest';
import { parseRoute } from './route';

describe('parseRoute', () => {
  it('/privacy 는 처리방침', () => {
    expect(parseRoute('/privacy')).toEqual({ kind: 'privacy' });
  });

  it('끝 슬래시가 붙어도 같은 화면', () => {
    expect(parseRoute('/privacy/')).toEqual({ kind: 'privacy' });
    expect(parseRoute('/u/myh/')).toEqual({ kind: 'profile', handle: 'myh' });
  });

  it('/u/<닉네임> 은 공개 목록', () => {
    expect(parseRoute('/u/myh')).toEqual({ kind: 'profile', handle: 'myh' });
  });

  it('/m/<슬러그> 는 공개 맵', () => {
    expect(parseRoute('/m/자바-a1b2c3')).toEqual({ kind: 'map', slug: '자바-a1b2c3' });
  });

  it('인코딩된 한글 슬러그를 되돌린다', () => {
    expect(parseRoute('/m/%EC%9E%90%EB%B0%94-a1b2c3')).toEqual({
      kind: 'map',
      slug: '자바-a1b2c3',
    });
  });

  it('깨진 인코딩에도 죽지 않고 앱으로 떨어진다', () => {
    expect(parseRoute('/m/%E0%A4%A')).toEqual({ kind: 'app' });
  });

  it('조각 수가 안 맞으면 앱', () => {
    expect(parseRoute('/u')).toEqual({ kind: 'app' });
    expect(parseRoute('/u/')).toEqual({ kind: 'app' });
    expect(parseRoute('/u/a/b')).toEqual({ kind: 'app' });
  });

  it('나머지는 앱', () => {
    expect(parseRoute('/')).toEqual({ kind: 'app' });
    expect(parseRoute('')).toEqual({ kind: 'app' });
    expect(parseRoute('/privacy-policy')).toEqual({ kind: 'app' });
    expect(parseRoute('/privacy/extra')).toEqual({ kind: 'app' });
  });
});
