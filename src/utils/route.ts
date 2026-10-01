/**
 * 경로 판단. 라우터 라이브러리를 넣지 않는 이유 — 경로가 몇 개뿐이라
 * pathname 한 줄 파싱이면 충분하고, 번들만 커진다.
 *
 * ponytail: 공개 발행(/u/<닉네임>, /m/<슬러그>)이 들어오면 여기에 분기를 더한다.
 */
export type Route = { kind: 'privacy' } | { kind: 'app' };

export function parseRoute(pathname: string): Route {
  // 끝의 슬래시는 무시한다. /privacy 와 /privacy/ 가 다른 화면이면 곤란하다.
  const path = pathname.replace(/\/+$/, '');
  if (path === '/privacy') return { kind: 'privacy' };
  return { kind: 'app' };
}
