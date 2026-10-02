import { describe, it, expect } from 'vitest';
import { treeMeta, nodeLook, edgeLook, edgePath, readMapTheme } from './mapTheme';

describe('mapTheme', () => {
  // root → a, b ; a → a1 ; a1 → a2
  const children = { root: ['a', 'b'], a: ['a1'], a1: ['a2'], b: [], a2: [] };

  it('깊이와 소속 가지(루트의 몇 번째 자식 밑인지)를 구한다', () => {
    const { depth, branch } = treeMeta('root', children);
    expect(depth.get('a2')).toBe(3);
    expect(branch.get('a2')).toBe(0);
    expect(branch.get('b')).toBe(1);
    expect(branch.has('root')).toBe(false);
  });

  it('기본 테마는 예전 모양 그대로다', () => {
    const { style } = nodeLook('classic', 2, 0);
    expect(style.background).toBe('#1e293b');
    expect(style.minWidth).toBe(120);
    expect(edgeLook('classic', 0, 0)).toEqual({ color: '#6366f1', width: 2 });
  });

  it('직접 칠한 색은 어느 테마에서든 테마 색보다 우선한다', () => {
    expect(nodeLook('classic', 1, 0, '#ff0000').style.background).toBe('#ff0000');
    expect(nodeLook('plain', 3, 0, '#ff0000').plain).toBe(false); // 글자만 있던 노드도 색이 보여야 한다
    expect(edgeLook('plain', 1, 0, '#ff0000').color).toBe('#ff0000');
  });

  it('같은 가지의 노드와 선은 같은 색이다', () => {
    const line = edgeLook('underline', 1, 1).color;
    expect(nodeLook('underline', 2, 1).style.borderBottom).toContain(line);
    expect(edgeLook('underline', 1, 0).color).not.toBe(line);
  });

  it('밑줄형만 선이 노드 아래쪽에 붙는다', () => {
    expect(nodeLook('underline', 1, 0).anchor).toBe('bottom');
    expect(nodeLook('underline', 0, -1).anchor).toBe('mid');
    expect(nodeLook('plain', 1, 0).anchor).toBe('mid');
  });

  it('글자만 모양은 중심 주제 말고는 상자가 없다', () => {
    expect(nodeLook('plain', 0, -1).plain).toBe(false);
    expect(nodeLook('plain', 1, 0).plain).toBe(true);
    expect(nodeLook('plain', 4, 0).plain).toBe(true);
  });

  it('선은 직각으로 꺾인다 — 높이가 같으면 직선', () => {
    expect(edgePath(0, 0, 100, 50)).toContain('V');
    expect(edgePath(0, 10, 100, 10)).toBe('M 0 10 H 100');
  });

  it('왼쪽으로 가는 선은 거울처럼 뒤집힌다 — 꺾이는 자리가 자식 쪽에 있다', () => {
    // 오른쪽: 자식(x=100) 40 앞인 60에서 꺾인다. 왼쪽: 자식(x=-100) 40 앞인 -60에서 꺾인다.
    expect(edgePath(0, 0, 100, 50)).toContain('Q 60 0 60 6');
    expect(edgePath(0, 0, -100, 50)).toContain('Q -60 0 -60 6');
  });

  it('저장된 값이 이상하면 기본 테마로 돌아간다', () => {
    expect(readMapTheme('plain')).toBe('plain');
    expect(readMapTheme('nope')).toBe('classic');
    expect(readMapTheme(null)).toBe('classic');
  });
});
