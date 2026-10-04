import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// 미리보기와 계정 메뉴는 각자의 테스트가 있다. 여기서는 소개 페이지의 글과 링크만 본다.
vi.mock('./IntroPreview', () => ({
  IntroPreview: ({ handle, slug }: { handle: string; slug: string }) => (
    <div data-testid="preview">{`${handle}/${slug}`}</div>
  ),
}));
vi.mock('../components/Toolbar/AccountMenu', () => ({ AccountMenu: () => null }));

import { Intro } from './Intro';

describe('Intro', () => {
  it('큰 버튼은 하나이고 운영자 공개 목록으로 간다', () => {
    render(<Intro />);
    expect(screen.getByRole('link', { name: '예시 맵 열어 보기' })).toHaveAttribute('href', '/u/myh');
    expect(screen.queryByRole('link', { name: '사용법' })).not.toBeInTheDocument();
  });

  it('운영자의 자바 맵을 미리보기로 넘긴다', () => {
    render(<Intro />);
    expect(screen.getByTestId('preview')).toHaveTextContent('myh/자바');
  });

  it('사용법 네 단계가 모두 있다', () => {
    render(<Intro />);
    for (const title of ['가지를 친다', '노트를 단다', '찾는다', '보여준다']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('공개 안내 단락과 처리방침 링크를 그대로 둔다', () => {
    render(<Intro />);
    expect(screen.getByText('공개는 켜야 켜집니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '개인정보 처리방침' })).toHaveAttribute('href', '/privacy');
  });

  it('로고는 NoteTree다', () => {
    render(<Intro />);
    expect(screen.getByText('NoteTree')).toBeInTheDocument();
  });
});
