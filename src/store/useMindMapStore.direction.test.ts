import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useMindMapStore } from './useMindMapStore';

/** 좌우 배치에서의 방향키: 왼쪽 가지에서는 ← 가 자식 쪽, → 가 부모 쪽이다. */
const store = () => useMindMapStore.getState();
const node = (id: string) => ({ id, type: 'text' as const, label: id, note: '', collapsed: false });

describe('좌우 배치의 방향키', () => {
  beforeEach(() => {
    // root → a, b, c, d (좌우 배치면 a, b는 오른쪽 / c, d는 왼쪽) ; a → a1 ; c → c1
    store().loadFromPersisted(
      {
        id: 't',
        title: 't',
        rootId: 'root',
        children: { root: ['a', 'b', 'c', 'd'], a: ['a1'], c: ['c1'], b: [], d: [], a1: [], c1: [] },
        nodes: Object.fromEntries(['root', 'a', 'b', 'c', 'd', 'a1', 'c1'].map((id) => [id, node(id)])),
      },
      {}
    );
    store().setLayoutDirection('both');
  });
  afterEach(() => store().setLayoutDirection('right'));

  const press = (from: string, dir: 'up' | 'down' | 'left' | 'right') => {
    store().setSelectedNodeId(from);
    store().selectRelative(dir);
    return store().selectedNodeId;
  };

  it('루트에서 → 는 오른쪽 첫 가지, ← 는 왼쪽 첫 가지로 간다', () => {
    expect(press('root', 'right')).toBe('a');
    expect(press('root', 'left')).toBe('c');
  });

  it('왼쪽 가지에서는 ← 가 자식, → 가 부모다', () => {
    expect(press('c', 'left')).toBe('c1');
    expect(press('c1', 'right')).toBe('c');
    expect(press('c', 'right')).toBe('root');
  });

  it('오른쪽 가지는 예전과 같다', () => {
    expect(press('a', 'right')).toBe('a1');
    expect(press('a', 'left')).toBe('root');
  });

  it('위아래는 같은 쪽 가지끼리만 오간다', () => {
    expect(press('b', 'down')).toBe('b'); // b 아래는 왼쪽의 c가 아니다
    expect(press('c', 'up')).toBe('c');
    expect(press('c', 'down')).toBe('d');
  });

  it('오른쪽으로만 뻗는 배치에서는 루트의 ← 가 아무 데도 가지 않는다', () => {
    store().setLayoutDirection('right');
    expect(press('root', 'left')).toBe('root');
    expect(press('b', 'down')).toBe('c');
  });
});
