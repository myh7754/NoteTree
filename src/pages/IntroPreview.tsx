import { useEffect, useState } from 'react';
import { MindMapCanvas } from '../components/MindMapCanvas/MindMapCanvas';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useMindMapStore, createEmptyMindMap } from '../store/useMindMapStore';
import { loadPublicMap } from '../db/publish';
import { pickInitialDepth } from '../utils/initialDepth';

/** 미리보기 칸은 전체 화면의 절반도 안 된다. 공개 뷰어(25개)보다 적게 펼쳐야 글자가 읽힌다. */
const PREVIEW_BUDGET = 12;

/**
 * 소개 페이지에 끼우는 공개 맵 미리보기.
 *
 * 그림 파일이 아니라 실제 맵이다 — 운영자가 맵을 고치면 여기도 같이 바뀐다.
 * 조작은 막고(pointer-events-none) 칸 전체를 공개 목록으로 가는 링크로 둔다.
 * 불러오지 못하면 아무것도 그리지 않는다. 소개 페이지는 글만으로도 성립한다.
 */
export function IntroPreview({ handle, slug }: { handle: string; slug: string }) {
  const openMap = useMindMapStore((s) => s.openMap);
  const expandToLevel = useMindMapStore((s) => s.expandToLevel);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let alive = true;
    useMindMapStore.setState({ readOnly: true });
    loadPublicMap(handle, slug)
      .then((found) => {
        if (!alive) return;
        if (!found) {
          setState('failed');
          return;
        }
        // 저장된 좌표는 쓰지 않는다 — 공개 뷰어와 같이 항상 정돈된 배치로 보여 준다
        openMap(found.map, {});
        expandToLevel(pickInitialDepth(found.map, PREVIEW_BUDGET));
        setState('ready');
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
      // 다른 탭에서 로그인하면 이 탭은 새로고침 없이 편집 앱으로 바뀐다. 운영자 맵이 스토어에
      // 남아 있으면 맵이 없는 새 사용자가 그것을 자기 맵처럼 편집·저장하게 된다.
      useMindMapStore.getState().openMap(createEmptyMindMap('새 마인드맵'), {});
      useMindMapStore.setState({ readOnly: false });
    };
  }, [handle, slug, openMap, expandToLevel]);

  if (state === 'failed') return null;

  return (
    <a
      href={`/u/${encodeURIComponent(handle)}`}
      aria-label="예시 맵 열어 보기"
      className="relative block h-80 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600"
    >
      <span className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-emerald-300">공개 중</span>
        운영자의 공부 기록 · 읽기 전용
      </span>
      {state === 'ready' && (
        // 확대 버튼과 미니맵은 누를 수 없으니 숨긴다
        <div
          className="pointer-events-none h-full [&_.react-flow__controls]:hidden [&_.react-flow__minimap]:hidden"
          aria-hidden="true"
        >
          <ErrorBoundary label="미리보기를 표시하지 못했습니다.">
            <MindMapCanvas />
          </ErrorBoundary>
        </div>
      )}
    </a>
  );
}
