import { describe, it, expect } from 'vitest';
import { SYMBOL_RULES } from './symbolRules';

// 편집기가 하는 일을 흉내 낸다: 한 글자씩 치면서, 끝이 규칙에 맞으면 바꾼다
function type(text: string): string {
  let out = '';
  for (const ch of text) {
    out += ch;
    for (const [find, replace] of SYMBOL_RULES) {
      if (find.test(out)) {
        out = out.replace(find, replace);
        break;
      }
    }
  }
  return out;
}

describe('기호 자동 변환', () => {
  it('화살표와 비교 기호로 바뀐다', () => {
    expect(type('요청 -> 응답')).toBe('요청 → 응답');
    expect(type('a <- b')).toBe('a ← b');
    expect(type('a <-> b')).toBe('a ↔ b');
    expect(type('조건 => 결과')).toBe('조건 ⇒ 결과');
    expect(type('a != b')).toBe('a ≠ b');
    expect(type('x <= 3, y >= 4')).toBe('x ≤ 3, y ≥ 4');
  });

  it('마크다운 문법과 겹치지 않는다', () => {
    expect(type('- 항목')).toBe('- 항목');
    expect(type('---')).toBe('---');
    expect(type('> 인용')).toBe('> 인용');
    expect(type('a = b')).toBe('a = b');
  });
});
