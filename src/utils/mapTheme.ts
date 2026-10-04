import type { CSSProperties } from 'react';

/**
 * 맵 모양(테마). 노드와 선을 **어떻게 그릴지**만 정한다 — 배치 계산은 건드리지 않는다.
 * 노드 크기가 달라지면 실측 크기를 보고 배치가 알아서 다시 잡힌다.
 *
 * 색은 CSS 변수로 낸다(index.css). 다크/라이트는 변수 값만 다르고 여기 로직은 같다.
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

// 가지 색은 여섯 개를 돌려 쓴다. 실제 값은 index.css의 --branch-0..5 (다크/라이트가 다르다).
const BRANCH_COUNT = 6;

const branchColor = (branch: number) =>
  branch < 0 ? '#6366f1' : `var(--branch-${branch % BRANCH_COUNT})`;

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

  const c = custom ?? branchColor(branch);
  const top = depth === 1;

  if (theme === 'classic') {
    // 직접 칠한 노드는 깊이와 상관없이 꽉 채운 상자다 — 이미 칠해 둔 맵의 모양을 바꾸지 않는다
    if (custom) {
      return {
        plain: false,
        anchor: 'mid',
        style: {
          background: custom,
          border: `1px solid ${custom}80`,
          color: '#e2e8f0',
          minWidth: 120,
          padding: '8px 12px',
          borderRadius: 8,
          ...text(14, 20, 500),
        },
      };
    }
    // 모든 노드가 상자다. 깊이는 크기와 진하기로 구분한다: 큰 가지는 크고 진하게, 그 아래는 작고 옅게.
    // (2026-10-04: 처음엔 큰 가지 아래를 글자만 뒀는데, 그러면 '상자'가 '글자만'과 구분되지 않았다)
    return {
      plain: false,
      anchor: 'mid',
      style: {
        background: `color-mix(in srgb, ${c} ${top ? '15%' : 'var(--box-fill)'}, var(--node-surface))`,
        border: `1px solid color-mix(in srgb, ${c} ${top ? '50%' : 'var(--box-line)'}, var(--node-surface))`,
        color: top ? 'var(--node-strong)' : 'var(--node-text)',
        padding: top ? '6px 12px' : '4px 10px',
        borderRadius: top ? 8 : 6,
        ...(top ? text(14, 20, 600) : text(13, 18, 400)),
      },
    };
  }

  const font = top ? text(15, 20, 600) : text(13, 18, 400);
  const color = top ? 'var(--node-strong)' : 'var(--node-text)';

  if (theme === 'underline') {
    return {
      plain: true,
      anchor: 'bottom',
      style: { borderBottom: `${top ? 3 : 1.5}px solid ${c}`, color, padding: top ? '5px 6px' : '4px 6px', ...font },
    };
  }

  // 상자 없이 글자만. 직접 색을 칠했으면 그 색이 보이도록 옅은 상자를 준다.
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
  // 밑줄형은 선 굵기를 밑줄 굵기와 맞춰 한 줄로 이어 보이게 한다
  const trunk = theme === 'underline' ? 3 : theme === 'plain' ? 2.5 : 2;
  return { color: custom ?? branchColor(branch), width: depth === 0 ? trunk : 1.5 };
}

/**
 * 부모(x1,y1) → 자식(x2,y2) 경로. 어느 모양에서든 직각으로 꺾인 선이다.
 * 자식이 부모의 왼쪽에 있으면(좌우 배치의 왼쪽 가지) 거울처럼 뒤집어 그린다.
 */
export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dir = x2 >= x1 ? 1 : -1;
  // 꺾이는 자리를 자식 쪽 기준으로 잡는다 → 폭이 다른 부모들도 같은 세로줄에서 꺾인다
  const mx = x2 - dir * 40;
  const dy = y2 - y1;
  if (Math.abs(dy) < 1) return `M ${x1} ${y1} H ${x2}`;
  const s = dy > 0 ? 1 : -1;
  const r = Math.min(6, Math.abs(dy) / 2);
  return `M ${x1} ${y1} H ${mx - dir * r} Q ${mx} ${y1} ${mx} ${y1 + s * r} V ${y2 - s * r} Q ${mx} ${y2} ${mx + dir * r} ${y2} H ${x2}`;
}
