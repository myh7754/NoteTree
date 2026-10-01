import { describe, it, expect } from 'vitest';
import { pickInitialDepth } from './initialDepth';
import type { MindMapData } from '../types';

/**
 * 숫자는 실제 공개 맵에서 재 온 것이다 (2026-10-01).
 * 깊이를 고정하면 왜 안 되는지가 이 표에 그대로 들어 있다.
 */
function treeOf(perLevel: number[]): MindMapData {
  // perLevel[0]은 루트라 항상 1이다. 각 단계를 바로 윗 단계의 첫 노드에 몰아 붙인다 —
  // 깊이별 개수만 맞으면 되므로 모양은 중요하지 않다.
  const children: Record<string, string[]> = {};
  const nodes: Record<string, never> = {};
  let prev = ['root'];
  children['root'] = [];
  for (let d = 1; d < perLevel.length; d++) {
    const ids = Array.from({ length: perLevel[d] }, (_, i) => `d${d}-${i}`);
    for (const id of ids) children[id] = [];
    children[prev[0]] = ids;
    prev = ids;
  }
  return { id: 'm', title: 't', rootId: 'root', nodes, children } as unknown as MindMapData;
}

describe('pickInitialDepth', () => {
  it('자바(1/12/49/155): 깊이2는 62개라 과하다 → 깊이1(13개)', () => {
    expect(pickInitialDepth(treeOf([1, 12, 49, 155]))).toBe(1);
  });

  it('DB(1/9/10/46): 깊이2는 20개로 적당하다 → 깊이2', () => {
    expect(pickInitialDepth(treeOf([1, 9, 10, 46]))).toBe(2);
  });

  it('작은 맵은 끝까지 펼친다 — 접을 이유가 없다', () => {
    expect(pickInitialDepth(treeOf([1, 6, 3]))).toBe(2);
  });

  it('노드가 루트뿐이어도 1을 돌려준다', () => {
    expect(pickInitialDepth(treeOf([1]))).toBe(1);
  });

  it('1단계부터 예산을 넘겨도 1은 보장한다 — 루트만 있는 화면은 쓸모가 없다', () => {
    expect(pickInitialDepth(treeOf([1, 200, 500]))).toBe(1);
  });

  it('예산을 바꾸면 결과도 바뀐다', () => {
    const 자바 = treeOf([1, 12, 49, 155]);
    expect(pickInitialDepth(자바, 100)).toBe(2); // 62개까지 허용
  });

  it('children이 비어도 죽지 않는다', () => {
    const empty = { id: 'm', title: 't', rootId: 'root', nodes: {}, children: {} } as unknown as MindMapData;
    expect(pickInitialDepth(empty)).toBe(1);
  });
});
