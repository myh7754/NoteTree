import { useMindMapStore } from '../../store/useMindMapStore';
import { keysFor } from '../../utils/shortcuts';

/**
 * 노드가 하나뿐인 맵에서 다음에 할 일을 알려 준다.
 * 추가 버튼이 툴바에서 노드 도구로 옮겨 가서, 아무것도 고르지 않은 새 맵에는 "추가"가 보이지 않는다.
 */
export function EmptyMapHint() {
  const single = useMindMapStore((s) => Object.keys(s.mindMapData.nodes).length === 1);
  const readOnly = useMindMapStore((s) => s.readOnly);
  const overrides = useMindMapStore((s) => s.shortcutOverrides);
  if (!single || readOnly) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
      노드를 고르고{' '}
      <kbd className="rounded border border-slate-600 bg-slate-800 px-1 font-mono text-[10px] text-slate-300">
        {keysFor('addChild', overrides)}
      </kbd>
      으로 가지를 칩니다
    </div>
  );
}
