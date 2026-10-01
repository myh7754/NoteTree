import { useEffect, useState } from 'react';
import type { MindMapData } from './types';
import { MindMapCanvas } from './components/MindMapCanvas/MindMapCanvas';
import { NoteDrawer } from './components/NoteDrawer/NoteDrawer';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { ShortcutsHelp } from './components/ShortcutsHelp/ShortcutsHelp';
import { AccountMenu } from './components/Toolbar/AccountMenu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useMindMapStore } from './store/useMindMapStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { loadPublicMapBySlug, loadPublicOwnerBySlug, type PublicOwner } from './db/publish';
import { pickInitialDepth } from './utils/initialDepth';

const noop = () => {};

/**
 * 공개 맵 하나를 읽기전용으로 보여준다 (/m/<슬러그>).
 *
 * 안전은 readOnly 플래그가 아니라 "저장 경로가 없다"에 기댄다: 여기엔 useAutosave도
 * syncNow도 없다. 플래그를 빠뜨려 뭔가 바뀌어도 IndexedDB·DB 어디에도 쓰이지 않는다.
 */
export function PublicMapViewer({ slug }: { slug: string }) {
  const mindMapData = useMindMapStore((s) => s.mindMapData);
  const openMap = useMindMapStore((s) => s.openMap);
  const expandToLevel = useMindMapStore((s) => s.expandToLevel);
  const setSearchOpen = useMindMapStore((s) => s.setSearchOpen);
  const setShortcutsOpen = useMindMapStore((s) => s.setShortcutsOpen);

  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [map, setMap] = useState<MindMapData | null>(null);
  // 어느 슬러그의 결과인지 함께 든다 (다른 맵으로 옮기는 사이 옛 목록이 비치지 않게)
  const [ownerOf, setOwnerOf] = useState<{ slug: string; owner: PublicOwner | null } | null>(null);
  const owner = ownerOf?.slug === slug ? ownerOf.owner : null;

  // 주인과 다른 공개 맵 목록. 맵 본문과 따로 읽는다 — 이게 실패해도 맵은 보여야 한다.
  useEffect(() => {
    let alive = true;
    loadPublicOwnerBySlug(slug)
      .then((o) => alive && setOwnerOf({ slug, owner: o }))
      .catch(() => alive && setOwnerOf({ slug, owner: null }));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    useMindMapStore.setState({ readOnly: true });
    loadPublicMapBySlug(slug)
      .then((found) => {
        if (!found) {
          setState('missing');
          return;
        }
        // 저장된 좌표는 쓰지 않는다 — 방문자는 항상 정돈된 배치를 본다
        openMap(found, {});
        // 깊이를 고정하지 않는다 — 맵마다 모양이 달라 같은 깊이가 전혀 다른 결과를 낸다.
        expandToLevel(pickInitialDepth(found));
        setMap(found);
        setState('ready');
      })
      .catch(() => setState('error'));
    return () => useMindMapStore.setState({ readOnly: false });
  }, [slug, openMap, expandToLevel]);

  useGlobalShortcuts(noop, noop);

  const btn = 'px-2 py-1.5 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600';

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0 whitespace-nowrap [&>*]:shrink-0">
        <a href="/" className="text-indigo-400 font-semibold text-sm" title="홈으로">
          🗺
        </a>
        {map && owner && owner.maps.length > 1 ? (
          // 이 사람이 공개한 다른 맵으로 옮겨 간다. 주소가 바뀌어야 하므로(공유·새로고침)
          // 화면만 갈아끼우지 않고 그 맵의 주소로 이동한다.
          <select
            className="bg-slate-800 text-sm font-semibold text-slate-200 rounded px-1.5 py-0.5 outline-none"
            value={slug}
            onChange={(e) => location.assign(`/m/${encodeURIComponent(e.target.value)}`)}
            aria-label="이 사람의 다른 공개 맵"
          >
            {owner.maps.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
        ) : (
          map && <span className="text-sm font-semibold text-slate-200">{mindMapData.title}</span>
        )}
        {owner && (
          <a
            href={`/u/${encodeURIComponent(owner.handle)}`}
            className="text-xs text-slate-400 hover:text-slate-200"
            title="이 사람이 공개한 맵 목록"
          >
            {owner.handle}
          </a>
        )}
        {/* 편집이 안 되는 게 고장이 아니라 의도임을 알린다 */}
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
          읽기전용
        </span>
        {state === 'ready' && (
          <>
            <button className={btn} onClick={() => setSearchOpen(true)} title="노드·노트 검색 (Ctrl+F)">
              🔍 검색
            </button>
            <button className={btn} onClick={() => expandToLevel(99)} title="접힌 가지를 모두 펼친다">
              ⤢ 전체 펼치기
            </button>
          </>
        )}

        <div className="flex-1" />

        <AccountMenu />
        <button className={btn} onClick={() => setShortcutsOpen(true)} title="단축키 (?)" aria-label="단축키">
          ⌨
        </button>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {state === 'error' ? (
          <Message>맵을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Message>
        ) : state === 'missing' ? (
          <Message>
            이 주소의 공개 맵이 없습니다.
            <br />
            <span className="text-slate-600">공개가 꺼졌거나 주소가 잘못됐을 수 있습니다.</span>
          </Message>
        ) : state === 'loading' ? (
          <Message>불러오는 중…</Message>
        ) : (
          <>
            <ErrorBoundary label="캔버스를 표시하지 못했습니다.">
              <MindMapCanvas />
            </ErrorBoundary>
            <SearchPanel />
            <NoteDrawer />
          </>
        )}
      </div>
      <ShortcutsHelp />
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm">
      {children}
    </div>
  );
}
