import { useInternalNode, type EdgeProps } from '@xyflow/react';
import type { MindMapEdge } from '../../types';
import { useMindMapStore } from '../../store/useMindMapStore';
import { edgeLook, edgePath, treeMeta, type MapTheme } from '../../utils/mapTheme';

// 선이 노드에 붙는 높이. 밑줄형의 글자 노드는 밑줄(아래쪽)에, 나머지는 가운데에 붙는다.
const anchorY = (theme: MapTheme, type: string | undefined, depth: number, height: number) =>
  theme === 'underline' && type === 'textNode' && depth >= 1 ? height - 1 : height / 2;

// 이름은 BezierEdge지만 지금은 직각으로 꺾인 선을 그린다 (edgePath).
export function BezierEdge({
  sourceX, sourceY, targetX, targetY,
  source, target,
  data,
}: EdgeProps<MindMapEdge>) {
  const theme = useMindMapStore((s) => s.mapTheme);
  const mindMapData = useMindMapStore((s) => s.mindMapData);
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  const depth = data?.depth ?? 0;
  const isPreview = data?.preview ?? false;
  const branch = treeMeta(mindMapData.rootId, mindMapData.children).branch.get(target) ?? -1;
  const look = edgeLook(theme, depth, branch, data?.color);

  // 양 끝점은 ReactFlow가 주는 연결점 좌표 대신 노드의 위치·크기에서 직접 구한다.
  // 좌우 배치에서는 가지가 왼쪽으로도 뻗는데, 연결점은 "왼쪽=들어옴, 오른쪽=나감"으로
  // 고정돼 있어 그대로 쓰면 선이 노드를 가로지른다.
  let [x1, y1, x2, y2] = [sourceX, sourceY, targetX, targetY];
  const fw = from?.measured.width;
  const fh = from?.measured.height;
  const tw = to?.measured.width;
  const th = to?.measured.height;
  if (from && to && fw && fh && tw && th) {
    const fp = from.internals.positionAbsolute;
    const tp = to.internals.positionAbsolute;
    const left = tp.x + tw / 2 < fp.x + fw / 2;
    x1 = left ? fp.x : fp.x + fw;
    y1 = fp.y + anchorY(theme, from.type, depth, fh);
    x2 = left ? tp.x + tw : tp.x;
    y2 = tp.y + anchorY(theme, to.type, depth + 1, th);
  }

  return (
    <path
      d={edgePath(x1, y1, x2, y2)}
      stroke={isPreview ? '#f59e0b' : look.color}
      strokeWidth={isPreview ? 2.5 : look.width}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={isPreview ? '6 4' : undefined}
      opacity={isPreview ? 0.95 : 1}
    />
  );
}
