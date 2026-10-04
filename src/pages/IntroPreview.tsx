import { useEffect, useState } from 'react';
import { MindMapCanvas } from '../components/MindMapCanvas/MindMapCanvas';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useMindMapStore, createEmptyMindMap } from '../store/useMindMapStore';
import { loadPublicMap } from '../db/publish';
import { pickInitialDepth } from '../utils/initialDepth';

/** 미리보기 칸은 전체 화면의 절반도 안 된다. 공개 뷰어(25개)보다 적게 펼쳐야 글자가 읽힌다. */
const PREVIEW_BUDGET = 12;
const REFIT_DELAY_MS = 400;

/**
 * 소개 페이지에 끼우는 공개 맵 미리보기.
 *
 * 그림 파일이 아니라 실제 맵이다 — 운영자가 맵을 고치면 여기도 같이 바뀐다.
 * 조작은 막고(inert) 칸 전체를 공개 목록으로 가는 링크로 덮는다.
 * 불러오지 못하면 아무것도 그리지 않는다. 소개 페이지는 글만으로도 성립한다.
 */
export function IntroPreview({ handle, slug }: { handle: string; slug: string }) {
  const openMap = useMindMapStore((s) => s.openMap);
  const expandToLevel = useMindMapStore((s) => s.expandToLevel);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let alive = true;
    let refit: ReturnType<typeof setTimeout> | undefined;
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
        // 캔버스의 첫 화면 맞춤은 노드 크기를 재기 전에 일어나 맵이 한쪽에 몰린다.
        // ponytail: 크기가 잡힐 만큼 기다렸다가 한 번 더 맞춘다. 느린 기기에서 어긋나면
        // 캔버스가 "크기를 다 쟀다"를 알리게 하고 그 신호에 맞춘다.
        refit = setTimeout(() => useMindMapStore.getState().requestFitView(), REFIT_DELAY_MS);
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
      clearTimeout(refit);
      // 다른 탭에서 로그인하면 이 탭은 새로고침 없이 편집 앱으로 바뀐다. 운영자 맵이 스토어에
      // 남아 있으면 맵이 없는 새 사용자가 그것을 자기 맵처럼 편집·저장하게 된다.
      useMindMapStore.getState().openMap(createEmptyMindMap('새 마인드맵'), {});
      useMindMapStore.setState({ readOnly: false });
    };
  }, [handle, slug, openMap, expandToLevel]);

  if (state === 'failed') return null;

  return (
    // flex-1은 가로 배치(lg)에서만 건다. 세로 배치에서 걸면 높이가 내용 크기(0)로 줄어든다.
    <div className="relative h-96 min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600 lg:flex-1">
      <span className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-emerald-300">공개 중</span>
        운영자의 공부 기록 · 읽기 전용
      </span>
      {state === 'ready' && (
        // inert: 마우스뿐 아니라 키보드 초점과 스크린 리더에서도 캔버스를 뺀다.
        // 확대 버튼과 미니맵은 index.css의 .intro-preview가 숨긴다.
        <div className="intro-preview h-full" inert>
          <ErrorBoundary label="미리보기를 표시하지 못했습니다.">
            <MindMapCanvas />
          </ErrorBoundary>
        </div>
      )}
      {/* 링크는 캔버스를 감싸지 않고 위에 덮는다 — 감싸면 캔버스 안의 링크와 겹친다 */}
      <a
        href={`/u/${encodeURIComponent(handle)}`}
        aria-label="예시 맵 열어 보기"
        className="absolute inset-0 z-20 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
      />
    </div>
  );
}
