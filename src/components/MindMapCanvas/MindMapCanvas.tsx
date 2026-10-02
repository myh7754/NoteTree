import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  ViewportPortal,
  useReactFlow,
  useStoreApi,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { MindMapEdge } from '../../types';
import { TextNode } from './TextNode';
import { TableNode } from './TableNode';
import { BezierEdge } from './BezierEdge';
import { ChordPanController } from './ChordPanController';
import { edgePath } from '../../utils/mapTheme';
import { directionOf } from '../../utils/layout';

const nodeTypes: NodeTypes = {
  textNode: TextNode,
  tableNode: TableNode,
};

const edgeTypes: EdgeTypes = {
  bezierEdge: BezierEdge,
};

const SLOT_GAP = 12; // 슬롯 위/아래 여백(px)
const VIEW_MARGIN = 48; // 이 여백 안쪽에 들어와 있어야 "보인다"고 판단

// children 맵에서 nodeId의 부모를 찾는다. 없으면 null(루트).
function findParentId(nodeId: string, children: Record<string, string[]>): string | null {
  for (const [pid, kids] of Object.entries(children)) {
    if (kids.includes(nodeId)) return pid;
  }
  return null;
}

// left: 놓이는 자리가 루트의 왼쪽인가 (좌우 배치). 오른쪽으로만 뻗는 배치에서는 항상 false.
type Drop = { parentId: string; index: number; left: boolean };

const widthOf = (n: Node) => n.measured?.width ?? n.width ?? 160;

/**
 * 놓일 자리 주변의 형제들과, 그 안에서의 순서.
 * 루트의 자식은 좌우로 갈라져 있으므로 **같은 쪽 형제만** 본다 — 전부를 한 줄로 보면
 * 오른쪽에 놓는데 왼쪽 가지들이 밀려난다.
 */
function slotSiblings(
  d: Drop,
  children: Record<string, string[]>,
  rootId: string,
  byId: Map<string, Node>,
  moving: Set<string>
): { sibs: Node[]; index: number } {
  const all = (children[d.parentId] ?? [])
    .filter((id) => !moving.has(id))
    .map((id) => byId.get(id))
    .filter(Boolean) as Node[];
  if (d.parentId !== rootId) return { sibs: all, index: d.index };
  const root = byId.get(rootId);
  const rootCx = root ? root.position.x + widthOf(root) / 2 : 0;
  const isLeft = (n: Node) => n.position.x + widthOf(n) / 2 < rootCx;
  const right = all.filter((n) => !isLeft(n));
  return d.left ? { sibs: all.filter(isLeft), index: d.index - right.length } : { sibs: right, index: d.index };
}

function Flow() {
  const {
    rfNodes,
    rfEdges,
    onRfNodesChange,
    onRfEdgesChange,
    setSelectedNodeId,
    deleteNodes,
    moveNodes,
    syncRfFromData,
    mindMapData,
    focusRequest,
    fitRequest,
    readOnly,
  } = useMindMapStore();
  const layoutDirection = directionOf(mindMapData);
  const { getNodes, setCenter, getViewport, fitView } = useReactFlow();
  // ReactFlow 내부 스토어. 캔버스(pane) 실제 픽셀 크기를 읽는 데 쓴다.
  const rfStore = useStoreApi();

  // 키보드 탐색/검색이 요청한 노드로 화면을 따라가게 한다.
  // 방향키 탐색은 화면 밖으로 나갔을 때만 움직여야 덜 어지럽고,
  // 검색 결과 점프(center=true)는 항상 가운데로 데려간다.
  //
  // pane 크기는 의존성에 넣지 않고 실행 시점에 읽는다. 넣으면 크기가 바뀔 때마다
  // 이미 처리한 요청이 다시 실행된다 — 노드 선택/해제로 툴바 색상 막대가 생겼다
  // 사라지며 줄바꿈되면 캔버스 높이가 변해, 예전에 따라갔던 노드(주로 루트)로 화면이 튀었다.
  useEffect(() => {
    if (!focusRequest) return;
    const { width: paneWidth, height: paneHeight } = rfStore.getState();
    const node = getNodes().find((n) => n.id === focusRequest.id);
    if (!node || node.hidden) return;

    const w = node.measured?.width ?? node.width ?? 160;
    const h = node.measured?.height ?? node.height ?? 40;
    const { x: vx, y: vy, zoom } = getViewport();
    const left = node.position.x * zoom + vx;
    const top = node.position.y * zoom + vy;
    const visible =
      left >= VIEW_MARGIN &&
      top >= VIEW_MARGIN &&
      left + w * zoom <= paneWidth - VIEW_MARGIN &&
      top + h * zoom <= paneHeight - VIEW_MARGIN;

    if (!focusRequest.center && visible) return;
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom, duration: 250 });
  }, [focusRequest, getNodes, getViewport, setCenter, rfStore]);

  // 맵을 새로 열거나 전체 펼침/접힘 후 화면을 맵에 맞춘다.
  // 초기값 0은 건너뛴다 — ReactFlow의 fitView prop이 최초 1회를 이미 처리한다.
  useEffect(() => {
    if (!fitRequest) return;
    // 배치가 끝난 뒤에 재야 노드 크기가 반영된 범위로 맞춰진다
    const t = setTimeout(() => fitView({ padding: 0.3, duration: 250 }), 60);
    return () => clearTimeout(t);
  }, [fitRequest, fitView]);

  // 드래그 중인 노드 + 드롭 결정(부모/삽입 인덱스). 렌더(슬롯·간선)에 사용.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // 같이 끌려가는 노드들 (여러 개를 선택해 끌 때). 선택에 부모와 자식이 같이 있으면
  // 부모만 든다 — 자식은 부모를 따라간다.
  const [movingIds, setMovingIds] = useState<string[]>([]);
  const movingRef = useRef<string[]>([]);
  const [drop, setDrop] = useState<Drop | null>(null);
  // 드래그되는 노드의 후손 집합 (새 부모 후보에서 제외해 순환 방지)
  const subtreeRef = useRef<Set<string>>(new Set());
  // 드래그 시작 시점의 노드 위치/크기 스냅샷. 드래그 중 형제가 시각적으로 밀려나도
  // 인덱스 계산은 이 고정 스냅샷을 써서 흔들리지 않게 한다.
  const rectsRef = useRef<Map<string, { x: number; y: number; w: number; h: number; cy: number }>>(new Map());
  // stop 시점에 적용할 최신 드롭 결정 (state는 클로저에서 stale할 수 있어 ref 병행)
  const dropRef = useRef<Drop | null>(null);

  const handleNodesDelete = (deleted: Node[]) => {
    deleteNodes(deleted.map((n) => n.id));
  };

  // 드래그 노드를 어디에(부모) 몇 번째(index)로 놓을지 계산한다.
  // - 대상 노드의 "오른쪽"으로 가면 그 노드의 자식
  // - 옆/위아래면 그 노드의 형제 (같은 부모, y위치로 순서 결정)
  // 위치는 드래그 시작 시 캡처한 스냅샷(rectsRef)을 쓰고, 드래그 노드만 실시간 위치 사용.
  const computeDrop = useCallback(
    (node: Node): Drop | null => {
      const { rootId, children } = mindMapData;
      if (node.id === rootId) return null;

      const rects = rectsRef.current;
      const dn = rects.get(node.id);
      const dw = dn?.w ?? 160;
      const dh = dn?.h ?? 40;
      const a = { x: node.position.x, y: node.position.y, w: dw, h: dh, cy: node.position.y + dh / 2 };

      // 가장 가까운 노드(자신/후손 제외)를 사각형 간격으로 찾는다
      let nearest: string | null = null;
      let bestGap = Infinity;
      for (const [id, r] of rects) {
        if (id === node.id || subtreeRef.current.has(id)) continue;
        const dx = Math.max(0, a.x - (r.x + r.w), r.x - (a.x + a.w));
        const dy = Math.max(0, a.y - (r.y + r.h), r.y - (a.y + a.h));
        const gap = Math.hypot(dx, dy);
        if (gap < bestGap) { bestGap = gap; nearest = id; }
      }
      const PROXIMITY = 90; // 이 거리(px) 안이면 후보 (살짝 떨어져도 OK)
      if (!nearest || bestGap > PROXIMITY) return null;

      // sibs(자신 제외) 중 드롭 y위치에 맞는 삽입 인덱스
      const indexByY = (sibs: string[]) => {
        for (let i = 0; i < sibs.length; i++) {
          const r = rects.get(sibs[i]);
          if (r && a.cy < r.cy) return i;
        }
        return sibs.length;
      };

      const nr = rects.get(nearest)!;
      // 좌우 배치에서 루트 왼쪽에 있는 노드는 자식이 왼쪽으로 뻗는다
      const rootRect = rects.get(rootId);
      const rootCx = rootRect ? rootRect.x + rootRect.w / 2 : 0;
      const leftOf = (r: { x: number; w: number }) => layoutDirection === 'both' && r.x + r.w / 2 < rootCx;
      const nLeft = nearest !== rootId && leftOf(nr);

      // parentId 밑에, 드롭 y위치에 맞는 자리로. 루트 밑이면 같은 쪽 형제 안에서 순서를 정한다
      // (루트의 자식은 앞쪽이 오른쪽, 뒤쪽이 왼쪽이다).
      const dropInto = (parentId: string, left: boolean): Drop => {
        const sibs = (children[parentId] ?? []).filter((id) => !subtreeRef.current.has(id));
        if (parentId !== rootId || layoutDirection !== 'both') return { parentId, index: indexByY(sibs), left };
        const isL = (id: string) => {
          const r = rects.get(id);
          return !!r && leftOf(r);
        };
        const rights = sibs.filter((id) => !isL(id));
        const lefts = sibs.filter(isL);
        return { parentId, index: left ? rights.length + indexByY(lefts) : indexByY(rights), left };
      };

      // 자식/형제 판정은 대상의 가로 중앙 기준: 드래그 노드가 대상의 "자식 쪽"으로
      // 중앙을 넘어가 있으면 → 자식, 아니면 → 형제.
      const isChildDrop =
        nearest === rootId || (nLeft ? a.x + a.w < nr.x + nr.w * 0.5 : a.x > nr.x + nr.w * 0.5);

      const np = findParentId(nearest, children);
      if (isChildDrop || np === null || subtreeRef.current.has(np)) {
        // (대상이 루트이거나 순환이면 대상의 자식으로 처리)
        return dropInto(nearest, nearest === rootId ? leftOf(a) : nLeft);
      }
      return dropInto(np, nLeft);
    },
    [mindMapData, layoutDirection]
  );

  /**
   * 드래그 시작. `dragged`에는 같이 끌려가는 노드가 전부 들어 있다(여러 개 선택 시).
   *
   * 예전에는 손에 잡힌 노드 하나만 보고 나머지를 버려서, 여러 개를 끌어다 놓아도
   * 하나만 옮겨졌다. 지금은 전부를 한 묶음으로 다룬다.
   */
  const onNodeDragStart = useCallback(
    (_: unknown, node: Node, dragged: Node[] = [node]) => {
      const { rootId, children } = mindMapData;
      const ids = [...new Set([node.id, ...dragged.map((n) => n.id)])].filter((id) => id !== rootId);
      if (ids.length === 0) return; // 루트는 재배치 불가

      // 선택된 조상을 타고 가는 노드는 뺀다 (부모만 옮기면 자식은 따라온다)
      const picked = new Set(ids);
      const tops = ids.filter((id) => {
        let p = findParentId(id, children);
        while (p) {
          if (picked.has(p)) return false;
          p = findParentId(p, children);
        }
        return true;
      });

      // 옮기는 노드들 + 그 후손 전부 (통째로 따라 움직이며, 후보에서 제외해 순환 방지)
      const subtree = new Set<string>();
      const queue = [...tops];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        subtree.add(cur);
        for (const c of children[cur] ?? []) queue.push(c);
      }
      subtreeRef.current = subtree;
      // 위치/크기 스냅샷 캡처 (드래그 동안 고정 기준으로 사용)
      const snap = new Map<string, { x: number; y: number; w: number; h: number; cy: number }>();
      for (const n of getNodes()) {
        const w = n.measured?.width ?? n.width ?? 160;
        const h = n.measured?.height ?? n.height ?? 40;
        snap.set(n.id, { x: n.position.x, y: n.position.y, w, h, cy: n.position.y + h / 2 });
      }
      rectsRef.current = snap;
      // 화면에 보이던 위→아래 순서를 유지한 채 옮긴다
      tops.sort((x, y) => (snap.get(x)?.cy ?? 0) - (snap.get(y)?.cy ?? 0));
      movingRef.current = tops;
      setMovingIds(tops);
      setDraggingId(node.id === rootId ? tops[0] : node.id);
    },
    [mindMapData, getNodes]
  );

  const onNodeDrag = useCallback(
    (_: unknown, node: Node) => {
      const d = computeDrop(node);
      dropRef.current = d;
      setDrop(d);
    },
    [computeDrop]
  );

  const onNodeDragStop = useCallback(() => {
    const d = dropRef.current;
    const moving = movingRef.current;
    setDraggingId(null);
    setMovingIds([]);
    movingRef.current = [];
    setDrop(null);
    dropRef.current = null;
    if (d && moving.length > 0) {
      // 부모/순서 변경 + 자동 재정렬 (자식도 함께 이동). 여러 개여도 되돌리기는 한 번이다.
      moveNodes(moving, d.parentId, d.index);
    }
    // 모든 경우에 격자로 스냅백 (자유 위치로 멈추지 않음)
    syncRfFromData();
  }, [moveNodes, syncRfFromData]);

  // 드래그로 영역을 잡아 여러 개를 고른 뒤 그 묶음을 끌면, React Flow는 노드 드래그가
  // 아니라 "선택 드래그" 이벤트를 보낸다. 같은 동작으로 이어 준다.
  // 기준 노드는 묶음에서 가장 위에 있는 것으로 삼는다.
  const anchorOf = (nodes: Node[]) =>
    [...nodes].sort((a, b) => a.position.y - b.position.y)[0];
  const onSelectionDragStart = useCallback(
    (e: unknown, nodes: Node[]) => {
      if (nodes.length > 0) onNodeDragStart(e, anchorOf(nodes), nodes);
    },
    [onNodeDragStart]
  );
  const onSelectionDrag = useCallback(
    (e: unknown, nodes: Node[]) => {
      if (nodes.length > 0) onNodeDrag(e, anchorOf(nodes));
    },
    [onNodeDrag]
  );

  // 드래그 중: 끄는 노드는 반투명, index 이후 형제는 아래로 밀어 슬롯 공간 확보.
  // (노드 개수는 그대로 두고 위치/클래스만 override → ReactFlow 드래그와 충돌 없음)
  const nodes = useMemo<Node[]>(() => {
    if (!draggingId || !drop) return rfNodes;
    const byId = new Map(rfNodes.map((n) => [n.id, n]));
    const dragged = byId.get(draggingId);
    const gh = dragged?.measured?.height ?? dragged?.height ?? 40;
    const shift = gh + SLOT_GAP;
    const moving = new Set(movingIds);
    const { sibs, index } = slotSiblings(drop, mindMapData.children, mindMapData.rootId, byId, moving);
    const shiftSet = new Set(sibs.slice(index).map((n) => n.id));
    return rfNodes.map((n) => {
      if (n.id === draggingId || moving.has(n.id)) return { ...n, className: 'rf-dragging' };
      if (shiftSet.has(n.id)) {
        return { ...n, position: { x: n.position.x, y: n.position.y + shift } };
      }
      return n;
    });
  }, [rfNodes, draggingId, movingIds, drop, mindMapData.children, mindMapData.rootId]);

  // 드래그 중: 끄는 노드의 기존 들어오는 간선만 숨긴다 (미리보기는 오버레이로 따로 그림)
  const edges = useMemo<MindMapEdge[]>(() => {
    if (!draggingId || !drop) return rfEdges;
    return rfEdges.filter((e) => e.target !== draggingId && !movingIds.includes(e.target));
  }, [rfEdges, draggingId, movingIds, drop]);

  // 정렬된 미리보기 기하: 슬롯 박스 위치/크기 + 부모→슬롯 베지어 경로 (flow 좌표)
  const preview = useMemo(() => {
    if (!draggingId || !drop) return null;
    const byId = new Map(rfNodes.map((n) => [n.id, n]));
    const dragged = byId.get(draggingId);
    const parent = byId.get(drop.parentId);
    if (!parent) return null;
    const gw = dragged?.measured?.width ?? dragged?.width ?? 140;
    const gh = dragged?.measured?.height ?? dragged?.height ?? 40;
    const pw = parent.measured?.width ?? parent.width ?? 160;
    const ph = parent.measured?.height ?? parent.height ?? 40;

    const { sibs, index } = slotSiblings(
      drop,
      mindMapData.children,
      mindMapData.rootId,
      byId,
      new Set([draggingId, ...movingIds])
    );

    // 왼쪽 가지는 노드의 오른쪽 끝을 열에 맞춘다 (부모 쪽으로 붙는다)
    let slotX: number;
    let slotY: number;
    if (sibs.length === 0) {
      slotX = drop.left ? parent.position.x - 80 - gw : parent.position.x + pw + 80;
      slotY = parent.position.y;
    } else {
      slotX = drop.left ? sibs[0].position.x + widthOf(sibs[0]) - gw : sibs[0].position.x;
      if (index >= sibs.length) {
        const last = sibs[sibs.length - 1];
        slotY = last.position.y + (last.measured?.height ?? 40) + SLOT_GAP;
      } else {
        slotY = sibs[index].position.y;
      }
    }

    const sx = drop.left ? parent.position.x : parent.position.x + pw;
    const sy = parent.position.y + ph / 2;
    const tx = drop.left ? slotX + gw : slotX;
    const ty = slotY + gh / 2;
    const path = edgePath(sx, sy, tx, ty);
    return { slotX, slotY, gw, gh, path };
  }, [rfNodes, draggingId, movingIds, drop, mindMapData.children, mindMapData.rootId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onRfNodesChange}
      onEdgesChange={onRfEdgesChange}
      onNodeClick={(_, node) => setSelectedNodeId(node.id)}
      onPaneClick={() => setSelectedNodeId(null)}
      onNodesDelete={handleNodesDelete}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onSelectionDragStart={onSelectionDragStart}
      onSelectionDrag={onSelectionDrag}
      onSelectionDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.2}
      maxZoom={2}
      /* 노드 드래그 허용: 끌어서 다른 부모에 재배치. 놓으면 자동 정렬로 스냅백 */
      nodesDraggable={!readOnly}
      /* 좌클릭 드래그(빈 곳) = 박스 선택 (여러 노드 선택) */
      selectionOnDrag={!readOnly}
      selectionMode={SelectionMode.Partial}
      selectionKeyCode={null}
      /* 네이티브 단일버튼 팬은 끔. 화면 이동은 좌+우 동시 드래그(ChordPanController)로 처리.
         읽기전용은 끌어 옮길 것도 박스선택도 없으니 방문자에게 익숙한 좌드래그 팬을 준다. */
      panOnDrag={readOnly}
      /* Delete/Backspace로 선택된 노드 삭제 */
      deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
      /* ReactFlow 내장 키보드 네비(Tab 포커스/화살표 이동)는 끈다.
         Tab=자식추가, Enter=형제추가 단축키와 충돌하지 않도록. */
      disableKeyboardA11y
    >
      <ChordPanController />
      {preview && (
        <ViewportPortal>
          {/* 정렬된 슬롯 자리표시 */}
          <div
            style={{
              position: 'absolute',
              left: preview.slotX,
              top: preview.slotY,
              width: preview.gw,
              height: preview.gh,
              border: '2px dashed #f59e0b',
              borderRadius: 8,
              background: 'rgba(245,158,11,0.15)',
              pointerEvents: 'none',
            }}
          />
          {/* 부모 → 슬롯 정렬된 미리보기 간선 */}
          <svg
            style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}
          >
            <path d={preview.path} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" fill="none" strokeLinecap="round" />
          </svg>
        </ViewportPortal>
      )}
      <Background color="#334155" gap={20} size={1} />
      <Controls />
      <MiniMap nodeColor="#334155" maskColor="rgba(15,23,42,0.7)" />
    </ReactFlow>
  );
}

export function MindMapCanvas() {
  return (
    <div className="flex-1 h-full bg-slate-950">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
