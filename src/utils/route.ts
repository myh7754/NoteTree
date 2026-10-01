/**
 * 경로 판단. 라우터 라이브러리를 넣지 않는 이유 — 경로가 네 개뿐이라
 * pathname 한 줄 파싱이면 충분하고, 번들만 커진다.
 *
 * 주의: /u/<닉네임>, /m/<슬러그>가 생기면서 vercel.json의 SPA rewrite가
 * **필수**가 됐다. 없으면 공개 링크를 새로고침할 때 404다.
 */
export type Route =
  | { kind: 'privacy' }
  | { kind: 'profile'; handle: string }
  | { kind: 'map'; slug: string }
  | { kind: 'app' };

export function parseRoute(pathname: string): Route {
  // 끝의 슬래시는 무시한다. /privacy 와 /privacy/ 가 다른 화면이면 곤란하다.
  const path = pathname.replace(/\/+$/, '');
  if (path === '/privacy') return { kind: 'privacy' };

  const segments = path.split('/').filter(Boolean);
  // 정확히 두 조각일 때만 받는다. /u/a/b 는 주소를 잘못 친 것이지 프로필이 아니다.
  if (segments.length === 2) {
    const [prefix, value] = segments;
    // 주소창의 한글은 %EC%9E%90… 로 들어온다. 화면에 쓰기 전에 되돌린다.
    const decoded = safeDecode(value);
    if (decoded) {
      if (prefix === 'u') return { kind: 'profile', handle: decoded };
      if (prefix === 'm') return { kind: 'map', slug: decoded };
    }
  }
  return { kind: 'app' };
}

/** 잘린 링크(%E 로 끝나는 등)는 decodeURIComponent가 던진다. 앱이 죽을 일은 아니다. */
function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return null;
  }
}
