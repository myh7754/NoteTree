import type { MindMapNode, MindMapEdge } from '../types';

// 아직 측정되지 않은(첫 렌더 전) 노드에 쓰는 폴백 크기
const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 40;
const RANK_SEP = 80; // 깊이(가로) 간격
const NODE_SEP = 24; // 형제(세로) 간격

/**
 * 맵이 뻗는 방향.
 * - right: 중심에서 오른쪽으로만 (처음부터 쓰던 모양)
 * - both:  중심의 좌우로. 루트의 자식 중 앞쪽 절반은 오른쪽, 나머지는 왼쪽
 */
export type LayoutDirection = 'right' | 'both';

export const readLayoutDirection = (v: string | null): LayoutDirection => (v === 'both' ? 'both' : 'right');

// ponytail: 방향은 모듈 변수로 든다. 스토어가 배치를 부르는 곳이 열 군데가 넘는데 전부
// 인자를 넘기도록 고치는 대신, 설정이 바뀔 때 여기 한 곳만 바꾼다. 이 기기의 취향이라
// 맵마다 다를 일이 없다 — 맵마다 방향을 저장하게 되면 그때 인자로 바꾼다.
let currentDirection: LayoutDirection = 'right';
export const setLayoutDirection = (d: LayoutDirection) => {
  currentDirection = d;
};
export const getLayoutDirection = () => currentDirection;

/**
 * 루트의 자식 중 몇 번째부터 왼쪽에 놓는가. 좌우 모양에서는 개수로 반을 가른다
 * (홀수면 오른쪽이 하나 더). 어느 쪽인지를 데이터에 저장하지 않으므로, 루트의 자식을
 * 더하거나 빼면 경계에 있던 가지가 반대쪽으로 넘어갈 수 있다.
 */
export const leftBranchStart = (rootChildCount: number, direction: LayoutDirection = currentDirection) =>
  direction === 'both' ? Math.ceil(rootChildCount / 2) : rootChildCount;

interface Size {
  w: number;
  h: number;
}

/**
 * 노드의 실제 렌더 크기. ReactFlow는 렌더 후 measured에 실측치를 채워준다.
 * (표 노드는 높이가 수백 px, 긴 라벨은 폭이 제각각이라 고정값을 쓰면 겹친다)
 */
function measuredSize(node: MindMapNode): Size {
  return {
    w: node.measured?.width ?? node.width ?? DEFAULT_WIDTH,
    h: node.measured?.height ?? node.height ?? DEFAULT_HEIGHT,
  };
}

/**
 * 마인드맵 전용 트리 레이아웃.
 *
 * dagre는 같은 rank의 형제 순서를 crossing 최소화 알고리즘으로 재배치하기 때문에
 * children 배열 순서가 화면 세로 순서와 어긋난다 → 드래그 순서 변경이 반영되지 않음.
 * 마인드맵은 항상 트리이므로, children(=edge) 순서를 그대로 위→아래로 배치하는
 * tidy-tree 레이아웃을 직접 구현해 순서를 보장한다.
 *
 * 크기 처리:
 * - 세로: 2패스. ① 각 서브트리가 차지하는 높이(밴드)를 bottom-up 계산
 *   (밴드 = max(자기 높이, 자식 밴드 합 + 간격)) ② 밴드를 위→아래로 나눠주며
 *   각 노드를 자기 밴드의 세로 중앙에 배치. 밴드 중앙이 곧 자식들의 중앙이므로
 *   "부모는 자식 가운데" 규칙이 자동으로 성립한다.
 * - 가로: 깊이별 최대 노드 폭을 누적해 열 x를 정한다 → 넓은 표 노드가 있으면
 *   그 다음 열 전체가 밀려 겹치지 않는다. 열 폭은 좌우를 따로 잰다.
 *
 * 좌우 모양에서는 루트의 자식을 둘로 갈라 한쪽씩 같은 방식으로 놓는다. 왼쪽은
 * 거울처럼 뒤집어, 노드의 **오른쪽 끝**을 열에 맞춘다(부모 쪽으로 붙는다).
 */
export function applyTreeLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  direction: LayoutDirection = currentDirection
): MindMapNode[] {
  const visibleNodes = nodes.filter((n) => !n.hidden);
  const visibleEdges = edges.filter((e) => !e.hidden);

  // edge로부터 부모→자식 맵 구성 (edge 순서 = children 배열 순서 유지)
  const childMap = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of visibleEdges) {
    if (!childMap.has(e.source)) childMap.set(e.source, []);
    childMap.get(e.source)!.push(e.target);
    hasParent.add(e.target);
  }

  // 루트 = 부모가 없는 가시 노드
  const root = visibleNodes.find((n) => !hasParent.has(n.id));
  if (!root) return nodes;

  const sizes = new Map<string, Size>();
  for (const n of visibleNodes) sizes.set(n.id, measuredSize(n));
  const sizeOf = (id: string): Size =>
    sizes.get(id) ?? { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };

  // ── 1패스: 깊이 + 서브트리 밴드 높이 ──
  const depth = new Map<string, number>();
  const band = new Map<string, number>();

  const measure = (id: string, d: number): number => {
    depth.set(id, d);
    const kids = childMap.get(id) ?? [];
    const own = sizeOf(id).h;
    if (kids.length === 0) {
      band.set(id, own);
      return own;
    }
    let childTotal = 0;
    for (let i = 0; i < kids.length; i++) {
      if (i > 0) childTotal += NODE_SEP;
      childTotal += measure(kids[i], d + 1);
    }
    const h = Math.max(own, childTotal);
    band.set(id, h);
    return h;
  };
  measure(root.id, 0);

  const rootSize = sizeOf(root.id);
  const pos = new Map<string, { x: number; y: number }>();

  /** 루트의 자식 묶음 하나(한쪽)를 놓고, 그 묶음의 전체 높이를 돌려준다. sign: 1=오른쪽, -1=왼쪽 */
  const placeSide = (sideKids: string[], sign: 1 | -1): number => {
    if (sideKids.length === 0) return 0;

    // ── 이쪽의 열 위치: 깊이별 최대 폭 누적 (루트 가장자리에서 떨어진 거리) ──
    const colWidth: number[] = [];
    const collect = (id: string) => {
      const d = depth.get(id)!;
      colWidth[d] = Math.max(colWidth[d] ?? 0, sizeOf(id).w);
      for (const k of childMap.get(id) ?? []) collect(k);
    };
    sideKids.forEach(collect);
    const offset: number[] = [];
    for (let d = 1; d < colWidth.length; d++) {
      offset[d] = d === 1 ? RANK_SEP : offset[d - 1] + colWidth[d - 1] + RANK_SEP;
    }

    // ── 2패스: 밴드를 나눠주며 배치 ──
    const place = (id: string, top: number) => {
      const myBand = band.get(id)!;
      const { w, h } = sizeOf(id);
      const off = offset[depth.get(id)!];
      pos.set(id, { x: sign > 0 ? rootSize.w + off : -off - w, y: top + (myBand - h) / 2 });

      const kids = childMap.get(id) ?? [];
      if (kids.length === 0) return;
      let childTotal = 0;
      for (let i = 0; i < kids.length; i++) {
        if (i > 0) childTotal += NODE_SEP;
        childTotal += band.get(kids[i])!;
      }
      // 자식 묶음도 부모 밴드의 세로 중앙에 정렬 (부모가 자식보다 클 때 대비)
      let cursor = top + (myBand - childTotal) / 2;
      for (const k of kids) {
        place(k, cursor);
        cursor += band.get(k)! + NODE_SEP;
      }
    };

    let total = 0;
    for (let i = 0; i < sideKids.length; i++) {
      if (i > 0) total += NODE_SEP;
      total += band.get(sideKids[i])!;
    }
    // 묶음의 세로 중앙을 루트의 세로 중앙에 맞춘다 (루트는 일단 y=0에 있다고 본다)
    let cursor = rootSize.h / 2 - total / 2;
    for (const k of sideKids) {
      place(k, cursor);
      cursor += band.get(k)! + NODE_SEP;
    }
    return total;
  };

  const rootKids = childMap.get(root.id) ?? [];
  const split = leftBranchStart(rootKids.length, direction);
  const tallest = Math.max(placeSide(rootKids.slice(0, split), 1), placeSide(rootKids.slice(split), -1));
  pos.set(root.id, { x: 0, y: 0 });

  // 맨 위가 y=0이 되도록 전체를 내린다 (자식 묶음이 루트보다 크면 위로 삐져나와 있다)
  const shift = Math.max(0, (tallest - rootSize.h) / 2);

  return nodes.map((node) => {
    if (node.hidden) return node;
    const p = pos.get(node.id);
    return p ? { ...node, position: { x: p.x, y: p.y + shift } } : node;
  });
}
