import type { MindMapData } from '../types';

/**
 * 공개 뷰어가 처음 몇 단계까지 펼칠지 고른다.
 *
 * 깊이를 고정하면 안 되는 이유: 같은 "깊이 2"가 맵마다 전혀 다른 결과를 낸다.
 * 실제 데이터에서 '자바'는 62개(글자가 안 읽힘), 'msa'는 10개(너무 적음)였다.
 * 맵의 모양이 제각각이라 깊이를 고정하면 어떤 맵에서는 반드시 틀린다.
 *
 * 그래서 고정하는 것은 깊이가 아니라 **화면에 보일 노드 수**다. 예산 안에서
 * 펼칠 수 있는 만큼 펼친다.
 */

/**
 * 한 화면에서 글자가 읽히는 대략의 한계. 정밀한 값이 아니라 눈대중이다 —
 * 화면 크기와 글자 길이에 따라 달라지므로 더 정확하게 만들 이유가 없다.
 */
const DEFAULT_BUDGET = 25;

/** 루트만 덩그러니 보이는 화면은 아무 정보도 주지 않는다. */
const MIN_DEPTH = 1;

export function pickInitialDepth(data: MindMapData, budget = DEFAULT_BUDGET): number {
  const counts = countByDepth(data);
  if (counts.length === 0) return MIN_DEPTH;

  let visible = 0;
  let depth = 0;
  for (; depth < counts.length; depth++) {
    const next = visible + counts[depth];
    // 이 단계를 펼치면 예산을 넘는다 → 직전 단계까지만.
    if (next > budget && depth > MIN_DEPTH) break;
    visible = next;
  }
  // depth는 "펼치지 못한 첫 단계"다. 그 직전까지 보이므로 그대로 쓰면 된다
  // (expandToLevel(d)는 깊이 d 이상인 노드를 접는다 = 깊이 d까지 보인다).
  return Math.max(MIN_DEPTH, depth - 1);
}

/** 깊이별 노드 수. index가 깊이다. */
function countByDepth(data: MindMapData): number[] {
  const { rootId, children } = data;
  if (!rootId) return [];
  const counts: number[] = [];
  const seen = new Set<string>([rootId]);
  let level = [rootId];
  while (level.length > 0) {
    counts.push(level.length);
    const next: string[] = [];
    for (const id of level) {
      for (const child of children?.[id] ?? []) {
        if (seen.has(child)) continue; // 중복·순환 방어
        seen.add(child);
        next.push(child);
      }
    }
    level = next;
  }
  return counts;
}
