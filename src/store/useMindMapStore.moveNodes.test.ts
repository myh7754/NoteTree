import { describe, it, expect, beforeEach } from 'vitest';
import { useMindMapStore } from './useMindMapStore';

/**
 * 여러 노드를 한 번에 옮기는 moveNodes.
 *
 * 배경: 여러 개를 선택해 끌어다 놓아도 손에 잡힌 하나만 옮겨지던 버그가 있었다
 * (2026-10-02). 드래그 핸들러가 같이 끌려온 나머지 노드를 버리고 있었다.
 */
const kids = (id: string) => useMindMapStore.getState().mindMapData.children[id] ?? [];
const node = (id: string) => ({ id, type: 'text' as const, label: id, note: '', collapsed: false });

describe('moveNodes', () => {
  beforeEach(() => {
    // root → a, b, c, d ; a → a1, a2 ; b → b1
    useMindMapStore.temporal.getState().clear();
    useMindMapStore.getState().loadFromPersisted(
      {
        id: 'test',
        title: 't',
        rootId: 'root',
        children: { root: ['a', 'b', 'c', 'd'], a: ['a1', 'a2'], b: ['b1'], c: [], d: [], a1: [], a2: [], b1: [] },
        nodes: Object.fromEntries(
          ['root', 'a', 'b', 'c', 'd', 'a1', 'a2', 'b1'].map((id) => [id, node(id)])
        ),
      },
      {}
    );
    useMindMapStore.getState().applyLayout();
    useMindMapStore.temporal.getState().clear();
  });

  it('여러 노드를 한 부모 아래로 전부 옮긴다 — 하나만 옮겨지면 안 된다', () => {
    useMindMapStore.getState().moveNodes(['c', 'd'], 'a', 2);
    expect(kids('a')).toEqual(['a1', 'a2', 'c', 'd']);
    expect(kids('root')).toEqual(['a', 'b']);
  });

  it('주어진 순서 그대로, 지정한 위치에 끼워 넣는다', () => {
    useMindMapStore.getState().moveNodes(['d', 'c'], 'a', 1);
    expect(kids('a')).toEqual(['a1', 'd', 'c', 'a2']);
  });

  it('서로 다른 부모에 있던 노드들도 한 번에 모은다', () => {
    useMindMapStore.getState().moveNodes(['a1', 'b1', 'd'], 'c', 0);
    expect(kids('c')).toEqual(['a1', 'b1', 'd']);
    expect(kids('a')).toEqual(['a2']);
    expect(kids('b')).toEqual([]);
    expect(kids('root')).toEqual(['a', 'b', 'c']);
  });

  it('부모와 자식을 같이 고르면 부모만 옮긴다 — 자식은 부모를 따라간다', () => {
    useMindMapStore.getState().moveNodes(['a', 'a1'], 'c', 0);
    expect(kids('c')).toEqual(['a']);
    expect(kids('a')).toEqual(['a1', 'a2']); // a1이 떨어져 나와 a의 형제가 되면 안 된다
  });

  it('같은 부모 안에서 여러 개의 순서를 바꾼다', () => {
    // 옮길 것을 뺀 나머지 [c, d] 기준으로 맨 끝(2)에 넣는다
    useMindMapStore.getState().moveNodes(['a', 'b'], 'root', 2);
    expect(kids('root')).toEqual(['c', 'd', 'a', 'b']);
  });

  it('하나라도 순환이 되면 전부 옮기지 않는다 — 일부만 옮기면 선택이 흩어진다', () => {
    useMindMapStore.getState().moveNodes(['a', 'c'], 'a1', 0); // a를 자기 자식 밑으로
    expect(kids('root')).toEqual(['a', 'b', 'c', 'd']);
    expect(kids('a1')).toEqual([]);
  });

  it('루트는 옮기지 않고 나머지만 옮긴다', () => {
    useMindMapStore.getState().moveNodes(['root', 'c'], 'a', 0);
    expect(kids('a')).toEqual(['c', 'a1', 'a2']);
  });

  it('되돌리기 한 번으로 전부 돌아온다', () => {
    useMindMapStore.getState().moveNodes(['c', 'd'], 'a', 0);
    useMindMapStore.temporal.getState().undo();
    expect(kids('root')).toEqual(['a', 'b', 'c', 'd']);
    expect(kids('a')).toEqual(['a1', 'a2']);
  });

  it('바뀌는 게 없으면 되돌리기 기록을 남기지 않는다', () => {
    useMindMapStore.getState().moveNodes(['a', 'b'], 'root', 0);
    expect(useMindMapStore.temporal.getState().pastStates.length).toBe(0);
  });

  it('moveNode(단일)는 예전과 똑같이 동작한다', () => {
    useMindMapStore.getState().moveNode('d', 'b', 0);
    expect(kids('b')).toEqual(['d', 'b1']);
  });
});
