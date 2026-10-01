import { describe, it, expect } from 'vitest';
import { parseRoute } from './route';

describe('parseRoute', () => {
  it('/privacy 는 처리방침', () => {
    expect(parseRoute('/privacy')).toEqual({ kind: 'privacy' });
  });

  it('끝 슬래시가 붙어도 같은 화면', () => {
    expect(parseRoute('/privacy/')).toEqual({ kind: 'privacy' });
  });

  it('나머지는 앱', () => {
    expect(parseRoute('/')).toEqual({ kind: 'app' });
    expect(parseRoute('')).toEqual({ kind: 'app' });
    expect(parseRoute('/privacy-policy')).toEqual({ kind: 'app' });
    expect(parseRoute('/privacy/extra')).toEqual({ kind: 'app' });
  });
});
