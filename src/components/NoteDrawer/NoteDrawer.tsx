import { Suspense, lazy } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { ResizeHandle } from './ResizeHandle';
import { LinkPanel } from './LinkPanel';
import { pathLabels } from '../../utils/treePath';
import { Icon } from '../Icon';

// BlockNote + Mantine은 1MB가 넘는데 노트 드로어는 기본으로 닫혀 있다.
// 지연 로딩해서 초기 번들에서 떼어낸다 (드로어를 처음 열 때 받아온다).
const BlockNoteEditor = lazy(() =>
  import('./BlockNoteEditor').then((m) => ({ default: m.BlockNoteEditor }))
);

export function NoteDrawer() {
  // 설정창에서도 바꾸므로 스토어가 유일한 출처다 (localStorage 저장은 스토어가 한다)
  const side = useMindMapStore((s) => s.notePanelSide);
  const setNotePanelSide = useMindMapStore((s) => s.setNotePanelSide);
  const toggleSide = () => setNotePanelSide(side === 'right' ? 'left' : 'right');

  const {
    isNoteDrawerOpen,
    closeNoteDrawer,
    selectedNodeId,
    noteDrawerWidth,
    setNoteDrawerWidth,
    mindMapData,
    updateNodeNote,
    readOnly,
  } = useMindMapStore();

  const selectedNode = selectedNodeId ? mindMapData.nodes[selectedNodeId] : null;

  const note = selectedNode?.note ?? '';
  const path = selectedNodeId ? pathLabels(selectedNodeId, mindMapData) : [];

  return (
    <div
      // order-first: 부모 flex 행에서 캔버스보다 앞(왼쪽)으로 보낸다
      className={`relative flex-shrink-0 flex flex-col bg-slate-900 border-slate-700 transition-all duration-200 overflow-hidden ${
        side === 'left' ? 'order-first border-r' : 'border-l'
      }`}
      style={{ width: isNoteDrawerOpen ? noteDrawerWidth : 0 }}
    >
      {isNoteDrawerOpen && (
        <>
          <ResizeHandle onResize={setNoteDrawerWidth} side={side} />

          {/* 헤더 */}
          <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-700 flex-shrink-0">
            <div className="min-w-0 flex-1">
              {/* 이 노트가 맵의 어디에 달린 것인지 — 노트만 읽고 있어도 자리를 잃지 않게 */}
              {path.length > 0 && (
                <div className="truncate text-[11px] text-slate-500">{path.join(' › ')}</div>
              )}
              <h2 className="truncate text-base font-bold text-slate-100">
                {selectedNode ? selectedNode.label : '노트'}
              </h2>
            </div>
            <button
              className="mt-0.5 text-slate-400 hover:text-slate-200"
              onClick={toggleSide}
              title={side === 'right' ? '왼쪽으로 옮기기' : '오른쪽으로 옮기기'}
              aria-label={side === 'right' ? '왼쪽으로 옮기기' : '오른쪽으로 옮기기'}
            >
              <Icon name="side" />
            </button>
            <button
              className="mt-0.5 text-slate-400 hover:text-slate-200"
              onClick={closeNoteDrawer}
              title="닫기"
              aria-label="닫기"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* 에디터 영역 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedNodeId ? (
              // key에 nodeId를 주면 노드를 바꿀 때 경계 상태(에러)도 같이 초기화된다
              <ErrorBoundary
                key={selectedNodeId}
                label="노트 에디터를 불러오지 못했습니다. 연결을 확인해 주세요."
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      에디터 불러오는 중…
                    </div>
                  }
                >
                  <BlockNoteEditor
                    nodeId={selectedNodeId}
                    note={note}
                    editable={!readOnly}
                    onSave={(content) => updateNodeNote(selectedNodeId, content)}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                노드를 선택하세요
              </div>
            )}
          </div>

          {selectedNodeId && <LinkPanel nodeId={selectedNodeId} />}
        </>
      )}
    </div>
  );
}
