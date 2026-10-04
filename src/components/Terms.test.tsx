import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Terms } from './Terms';
import { parseRoute } from '../utils/route';

describe('이용약관', () => {
  it('/terms 주소로 열린다', () => {
    expect(parseRoute('/terms')).toEqual({ kind: 'terms' });
    expect(parseRoute('/terms/')).toEqual({ kind: 'terms' });
    expect(parseRoute('/terms/extra')).toEqual({ kind: 'app' });
  });

  /**
   * 이 조항이 약관을 만든 이유다. 지금은 무료지만 나중에 유료로 바꿀 수 있다는 것,
   * 바꾸기 전에 미리 알린다는 것, 직접 결제하기 전에는 청구되지 않는다는 것 —
   * 셋 중 하나라도 빠지면 전환할 때 근거가 없거나 이용자가 불안해진다.
   */
  it('유료 전환 조항: 바뀔 수 있음, 30일 전 공지, 직접 결제 전에는 청구 없음', () => {
    render(<Terms />);
    const section = screen.getByRole('heading', { name: /이용 요금과 유료 전환/ }).closest('section')!;
    // 강조(<b>)로 문장이 여러 조각으로 나뉘어 있어서 조항 전체의 글자로 본다
    const text = section.textContent ?? '';
    expect(text).toMatch(/현재 무료/);
    expect(text).toMatch(/유료로 전환\s*하거나/);
    expect(text).toMatch(/30일 전/);
    expect(text).toMatch(/직접 결제하기 전에는 요금이\s*청구되지 않습니다/);
  });

  it('저장 용량 조항에 사진 한도와 공개 범위가 있다', () => {
    render(<Terms />);
    const text = screen.getByRole('heading', { name: /저장 용량/ }).closest('section')!.textContent ?? '';
    expect(text).toMatch(/한 장에 2MB/);
    expect(text).toMatch(/50MB/);
    expect(text).toMatch(/주소를 아는 사람/);
  });

  it('처리방침으로 가는 링크와 문의처가 있다', () => {
    render(<Terms />);
    expect(screen.getByRole('link', { name: '개인정보 처리방침' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /@/ })).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });
});
