import { useMindMapStore } from '../../store/useMindMapStore';
import { storageSummary } from '../../db/storage';
import { useStorageUsed } from '../../hooks/useStorageUsed';

/**
 * 툴바의 저장 공간 막대. 자세한 숫자는 설정창 계정 탭에 있고, 여기서는 얼마나 찼는지만 보여 준다.
 * 로그인하지 않았거나 사용량을 읽지 못하면 그리지 않는다 — 틀린 숫자를 보여 주느니 숨긴다.
 */
export function StorageMeter() {
  const used = useStorageUsed();
  const setSettingsOpen = useMindMapStore((s) => s.setSettingsOpen);
  if (used === null) return null;

  const { ratio, percent, usedMb, quotaMb, nodesLeft } = storageSummary(used);
  return (
    <button
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      onClick={() => setSettingsOpen(true)}
      title={`저장 공간 ${usedMb}MB / ${quotaMb}MB · 노트를 포함한 노드로 약 ${nodesLeft.toLocaleString()}개 더 넣을 수 있습니다`}
      aria-label={`저장 공간 ${percent}% 사용`}
    >
      <span
        className="block h-1.5 w-14 overflow-hidden rounded bg-slate-700"
        role="progressbar"
        aria-label="저장 공간 사용량"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={`block h-full rounded ${ratio > 90 ? 'bg-amber-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.max(ratio, 2)}%` }}
        />
      </span>
      {percent}%
    </button>
  );
}
