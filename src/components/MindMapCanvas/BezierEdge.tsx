import type { EdgeProps } from '@xyflow/react';
import type { MindMapEdge } from '../../types';
import { useMindMapStore } from '../../store/useMindMapStore';
import { edgeLook, edgePath, treeMeta } from '../../utils/mapTheme';

// 이름은 BezierEdge지만 맵 모양(테마)에 따라 직각으로 꺾인 선도 그린다.
export function BezierEdge({
  sourceX, sourceY, targetX, targetY,
  target,
  data,
}: EdgeProps<MindMapEdge>) {
  const theme = useMindMapStore((s) => s.mapTheme);
  const mindMapData = useMindMapStore((s) => s.mindMapData);
  const depth = data?.depth ?? 0;
  const isPreview = data?.preview ?? false;
  const branch = treeMeta(mindMapData.rootId, mindMapData.children).branch.get(target) ?? -1;
  const look = edgeLook(theme, depth, branch, data?.color);

  return (
    <path
      d={edgePath(theme, sourceX, sourceY, targetX, targetY)}
      stroke={isPreview ? '#f59e0b' : look.color}
      strokeWidth={isPreview ? 2.5 : look.width}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={isPreview ? '6 4' : undefined}
      opacity={isPreview ? 0.95 : 1}
    />
  );
}
