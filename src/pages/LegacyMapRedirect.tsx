import { useEffect, useState } from 'react';
import { resolveLegacySlug } from '../db/publish';
import { mapPath } from '../utils/publish';

/**
 * 옛 주소(/m/<제목-난수6자>)로 들어온 사람을 새 주소(/m/<닉네임>/<슬러그>)로 넘겨준다.
 *
 * 2026-10-02에 주소 형태를 바꿨다. 그 전에 보낸 링크가 깨지면 안 되므로 옛 슬러그를
 * DB에 남겨 두고 여기서 찾아 준다. replace로 넘기는 이유 — 뒤로가기를 눌렀을 때
 * 이 화면으로 돌아와 다시 튕기는 일을 막는다.
 */
export function LegacyMapRedirect({ slug }: { slug: string }) {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    resolveLegacySlug(slug)
      .then((found) => {
        if (found) location.replace(mapPath(found.handle, found.slug));
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [slug]);

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 text-center text-sm text-slate-500">
      {missing ? (
        <div>
          이 주소의 공개 맵이 없습니다.
          <br />
          <span className="text-slate-600">공개가 꺼졌거나 주소가 잘못됐을 수 있습니다.</span>
          <br />
          <a href="/" className="mt-3 inline-block text-indigo-400 hover:text-indigo-300">
            홈으로
          </a>
        </div>
      ) : (
        '불러오는 중…'
      )}
    </div>
  );
}
