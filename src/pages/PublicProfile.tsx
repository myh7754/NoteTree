import { useEffect, useState } from 'react';
import { loadPublicMapsByHandle, type PublicMapSummary } from '../db/publish';
import { mapPath } from '../utils/publish';

/**
 * 공개 목록 (/u/<닉네임>) — 그 사람이 공개로 켠 맵들.
 *
 * "없는 닉네임"과 "공개한 맵이 0개"를 구분해 보여준다. 둘을 같은 화면으로 뭉개면
 * 주소를 잘못 친 사람이 "이 사람은 아무것도 안 올렸네"로 오해한다.
 */
export function PublicProfile({ handle }: { handle: string }) {
  const [maps, setMaps] = useState<PublicMapSummary[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    loadPublicMapsByHandle(handle)
      .then((found) => {
        if (found === null) {
          setState('missing');
          return;
        }
        setMaps(found);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [handle]);

  return (
    <div className="min-h-full overflow-y-auto bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-3xl pb-20">
        <a href="/" className="text-xs text-indigo-400 hover:text-indigo-300">
          ← Mind Map
        </a>
        <h1 className="mt-4 text-2xl font-bold text-slate-50">{handle}</h1>
        <p className="mt-1 text-sm text-slate-500">공개한 공부 기록</p>

        {state === 'loading' && <Note>불러오는 중…</Note>}
        {state === 'error' && <Note>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Note>}
        {state === 'missing' && <Note>그런 사용자가 없습니다.</Note>}
        {state === 'ready' && maps?.length === 0 && <Note>아직 공개한 맵이 없습니다.</Note>}

        {state === 'ready' && maps && maps.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {maps.map((m) => (
              <li key={m.id}>
                <a
                  href={mapPath(handle, m.slug)}
                  className="block rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-indigo-600 hover:bg-slate-800/60"
                >
                  <div className="truncate text-sm font-semibold text-slate-100">{m.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>노드 {m.nodeCount}개</span>
                    <span>·</span>
                    <span>{formatDate(m.updatedAt)}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-10 text-center text-sm text-slate-500">{children}</p>;
}

/** 같은 해면 연도를 빼고 보여준다 — 목록에서 반복되는 글자는 읽는 데 방해만 된다. */
function formatDate(ms: number): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('ko-KR', {
    year: sameYear ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
