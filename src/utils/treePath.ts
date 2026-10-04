import type { MindMapData } from '../types';

/**
 * 루트부터 부모까지의 이름. 루트 자신이면 빈 배열.
 * 노트 창이 "이 노트가 맵의 어디에 달린 것인지"를 보여 주는 데 쓴다.
 */
export function pathLabels(id: string, data: Pick<MindMapData, 'children' | 'nodes'>): string[] {
  const parent = new Map<string, string>();
  for (const [pid, kids] of Object.entries(data.children)) {
    for (const kid of kids) parent.set(kid, pid);
  }
  const out: string[] = [];
  const seen = new Set([id]); // 순환 방어
  for (let p = parent.get(id); p !== undefined && !seen.has(p); p = parent.get(p)) {
    seen.add(p);
    out.unshift(data.nodes[p]?.label ?? '');
  }
  return out;
}
