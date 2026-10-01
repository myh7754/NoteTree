import type { CSSProperties } from 'react';

/**
 * 맵 모양(테마). 노드와 선을 **어떻게 그릴지**만 정한다 — 배치 계산은 건드리지 않는다.
 * 노드 크기가 달라지면 실측 크기를 보고 배치가 알아서 다시 잡힌다.
 *
 * ponytail: 이 기기의 취향으로 localStorage에 둔다(노트 패널 위치와 같다). 그래서 공개
 * 페이지 방문자는 주인이 고른 모양이 아니라 기본 모양으로 본다. 주인이 고른 모양을
 * 보여 줘야 하면 맵 데이터에 넣는다.
 */
export type MapTheme = 'classic' | 'plain' | 'underline';

export const MAP_THEMES: { id: MapTheme; label: string }[] = [
  { id: 'classic', label: '상자' },
  { id: 'plain', label: '글자만' },
  { id: 'underline', label: '밑줄' },
];

export const readMapTheme = (v: string | null): MapTheme =>
  MAP_THEMES.some((t) => t.id === v) ? (v as MapTheme) : 'classic';

const BRANCH_COLORS = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#f7768e', '#7dcfff'];
const CLASSIC_EDGE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

const branchColor = (branch: number) =>
  branch < 0 ? '#6366f1' : BRANCH_COLORS[branch % BRANCH_COLORS.length];

interface TreeMeta {
  depth: Map<string, number>;
  /** 루트의 몇 번째 자식 밑에 있는가. 루트는 없다(-1로 취급). */
  branch: Map<string, number>;
}

// children 객체가 바뀔 때만 다시 계산한다 (노드마다 부르므로 캐시가 없으면 O(N²))
const metaCache = new WeakMap<object, TreeMeta>();

export function treeMeta(rootId: string, children: Record<string, string[]>): TreeMeta {
  const cached = metaCache.get(children);
  if (cached) return cached;
  const depth = new Map<string, number>([[rootId, 0]]);
  const branch = new Map<string, number>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    (children[id] ?? []).forEach((childId, i) => {
      if (depth.has(childId)) return; // 중복/순환 방어
      depth.set(childId, depth.get(id)! + 1);
      branch.set(childId, id === rootId ? i : branch.get(id)!);
      stack.push(childId);
    });
  }
  const meta = { depth, branch };
  metaCache.set(children, meta);
  return meta;
}

export interface NodeLook {
  style: CSSProperties;
  /** 상자 없이 글자만 있는 노드. 마우스를 올리면 배경을 보여 잡을 곳을 알린다. */
  plain: boolean;
  /** 선이 붙는 높이. 밑줄형은 선이 밑줄로 이어져야 하므로 아래쪽이다. */
  anchor: 'mid' | 'bottom';
}

const text = (fontSize: number, lineHeight: number, fontWeight: number): CSSProperties => ({
  fontSize,
  lineHeight: `${lineHeight}px`,
  fontWeight,
});

/**
 * 노드 하나의 모양. `custom`은 사용자가 그 노드에 직접 칠한 색(#rrggbb)이고,
 * 어느 테마에서든 테마 색보다 우선한다.
 */
export function nodeLook(theme: MapTheme, depth: number, branch: number, custom?: string): NodeLook {
  if (theme === 'classic') {
    return {
      plain: false,
      anchor: 'mid',
      style: {
        background: custom ?? '#1e293b',
        border: `1px solid ${custom ? custom + '80' : '#334155'}`,
        color: '#e2e8f0',
        minWidth: 120,
        padding: '8px 12px',
        borderRadius: 8,
        ...text(14, 20, 500),
      },
    };
  }

  const c = custom ?? branchColor(branch);

  // 중심 주제는 어느 모양에서든 크게 채운다
  if (depth === 0) {
    return {
      plain: false,
      anchor: 'mid',
      style: {
        background: custom ?? '#6366f1',
        border: '1px solid transparent',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: 14,
        ...text(19, 26, 700),
      },
    };
  }

  const top = depth === 1;
  const font = top ? text(15, 20, 600) : text(13, 18, 400);
  const color = top ? '#f8fafc' : '#cbd5e1';

  if (theme === 'underline') {
    return {
      plain: true,
      anchor: 'bottom',
      style: { borderBottom: `${top ? 3 : 1.5}px solid ${c}`, color, padding: top ? '5px 6px' : '4px 6px', ...font },
    };
  }

  // plain: 상자 없이 글자만. 직접 색을 칠했으면 그 색이 보이도록 옅은 상자를 준다.
  return {
    plain: !custom,
    anchor: 'mid',
    style: {
      background: custom ? custom + '26' : undefined,
      border: `1px solid ${custom ?? 'transparent'}`,
      color,
      padding: top ? '4px 8px' : '3px 8px',
      borderRadius: 6,
      ...font,
    },
  };
}

/** 선 하나의 모양. depth는 **부모**의 깊이, branch는 자식이 속한 가지다. */
export function edgeLook(
  theme: MapTheme,
  depth: number,
  branch: number,
  custom?: string
): { color: string; width: number } {
  if (theme === 'classic') {
    return {
      color: custom ?? CLASSIC_EDGE_COLORS[Math.min(depth, CLASSIC_EDGE_COLORS.length - 1)],
      width: depth === 0 ? 2 : depth === 1 ? 1.5 : 1,
    };
  }
  // 밑줄형은 선 굵기를 밑줄 굵기와 맞춰 한 줄로 이어 보이게 한다
  return { color: custom ?? branchColor(branch), width: depth === 0 ? (theme === 'underline' ? 3 : 2.5) : 1.5 };
}

/** 부모(x1,y1) → 자식(x2,y2) 경로. 어느 모양에서든 직각으로 꺾인 선이다. */
export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  // 꺾이는 자리를 자식 쪽 기준으로 잡는다 → 폭이 다른 부모들도 같은 세로줄에서 꺾인다
  const mx = x2 - 40;
  const dy = y2 - y1;
  if (Math.abs(dy) < 1) return `M ${x1} ${y1} H ${x2}`;
  const s = dy > 0 ? 1 : -1;
  const r = Math.min(6, Math.abs(dy) / 2);
  return `M ${x1} ${y1} H ${mx - r} Q ${mx} ${y1} ${mx} ${y1 + s * r} V ${y2 - s * r} Q ${mx} ${y2} ${mx + r} ${y2} H ${x2}`;
}
