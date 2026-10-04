import { describe, it, expect } from 'vitest';
import { pathLabels } from './treePath';
import type { MindMapData } from '../types';

const data = {
  children: { r: ['a'], a: ['b'], b: [] },
  nodes: { r: { label: '자바의신' }, a: { label: '객체지향' }, b: { label: '다형성' } },
} as unknown as MindMapData;

describe('pathLabels', () => {
  it('루트부터 부모까지의 이름을 순서대로 준다', () => {
    expect(pathLabels('b', data)).toEqual(['자바의신', '객체지향']);
  });

  it('루트는 조상이 없다', () => {
    expect(pathLabels('r', data)).toEqual([]);
  });

  it('없는 노드나 순환하는 데이터에서도 멈춘다', () => {
    expect(pathLabels('nope', data)).toEqual([]);
    const loop = { children: { x: ['y'], y: ['x'] }, nodes: { x: { label: 'x' }, y: { label: 'y' } } } as unknown as MindMapData;
    expect(pathLabels('x', loop)).toEqual(['y']);
  });
});
