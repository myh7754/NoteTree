/**
 * 경로 판단. 라우터 라이브러리를 넣지 않는 이유 — 경로가 몇 개뿐이라
 * pathname 한 줄 파싱이면 충분하고, 번들만 커진다.
 *
 * 주의: /u/<닉네임>, /m/<닉네임>/<슬러그>가 생기면서 vercel.json의 SPA rewrite가
 * **필수**가 됐다. 없으면 공개 링크를 새로고침할 때 404다.
 */
export type Route =
  | { kind: 'privacy' }
  | { kind: 'terms' }
  | { kind: 'profile'; handle: string }
  | { kind: 'map'; handle: string; slug: string }
  /** 2026-10-02 이전의 주소(/m/<슬러그>). 새 주소로 넘겨준다 — 이미 보낸 링크를 살리기 위해. */
  | { kind: 'legacyMap'; slug: string }
  | { kind: 'app' };

export function parseRoute(pathname: string): Route {
  // 끝의 슬래시는 무시한다. /privacy 와 /privacy/ 가 다른 화면이면 곤란하다.
  const path = pathname.replace(/\/+$/, '');
  if (path === '/privacy') return { kind: 'privacy' };
  if (path === '/terms') return { kind: 'terms' };

  // 조각 수를 정확히 맞춘다. /u/a/b 를 "닉네임 a"로 관대하게 받으면
  // 오타 난 주소가 엉뚱한 사람의 공개 목록을 띄운다.
  const segments = path.split('/').filter(Boolean);
  const [prefix, ...rest] = segments;
  // 주소창의 한글은 %EC%9E%90… 로 들어온다. 화면에 쓰기 전에 되돌린다.
  const values = rest.map(safeDecode);
  if (values.some((v) => v === null)) return { kind: 'app' };
  const [first, second] = values as string[];

  if (prefix === 'u' && values.length === 1) return { kind: 'profile', handle: first };
  if (prefix === 'm' && values.length === 2) return { kind: 'map', handle: first, slug: second };
  if (prefix === 'm' && values.length === 1) return { kind: 'legacyMap', slug: first };
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
