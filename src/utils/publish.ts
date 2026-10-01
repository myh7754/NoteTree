/**
 * 공개 발행에 쓰는 순수 함수 — 슬러그 생성과 닉네임 검증.
 *
 * DB도 화면도 모르는 순수 함수로 떼어 둔다. 공개 주소는 한 번 남에게 보내면
 * 되돌릴 수 없으므로, 규칙을 테스트로 고정할 수 있는 자리에 두는 편이 안전하다.
 */

/** 제목이 길면 주소가 흉해진다. */
const MAX_TITLE_PART = 40;

/** 제목이 기호뿐이거나 비어 있을 때 쓰는 이름. */
const FALLBACK = 'map';

/**
 * 맵 주소의 마지막 조각. 주소는 `/m/<닉네임>/<슬러그>` 이다.
 *
 * 닉네임이 주소에 들어가므로 슬러그는 **그 사람 안에서만** 겹치지 않으면 된다
 * (2026-10-02 이전에는 전체에서 유일해야 해서 난수 6자를 붙였다). 같은 사람이 같은
 * 제목으로 두 개를 공개하면 두 번째는 `자바-2`, 세 번째는 `자바-3`이 된다.
 *
 * 한글은 그대로 둔다. 브라우저가 알아서 인코딩하고, 주소창에는 한글로 보인다.
 *
 * 한 번 만들면 고정이다 — 제목을 바꿔도 다시 만들지 않는다. 안 그러면 남에게
 * 보낸 링크가 조용히 깨진다. (호출부의 책임)
 *
 * @param taken 그 사람이 이미 쓰고 있는 슬러그들 (비공개로 돌린 맵의 것도 포함)
 */
export function makeSlug(title: string, taken: Iterable<string> = []): string {
  const base =
    title
      .toLowerCase()
      // 글자·숫자가 아닌 것은 전부 하이픈으로. \p{L}은 한글도 포함한다.
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_TITLE_PART)
      // 자르다 하이픈으로 끝났으면 떼어낸다
      .replace(/-$/, '') || FALLBACK;

  const used = new Set(taken);
  if (!used.has(base)) return base;
  // 2부터 센다 — 첫 번째가 번호 없는 원본이므로 두 번째가 -2다.
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** 소문자·숫자·하이픈만. 양 끝 하이픈 금지. */
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const HANDLE_MIN = 2;
const HANDLE_MAX = 20;

/** 공개 주소에 쓸 수 없는 닉네임을 걸러낸다. 이미 쓰는 경로와 겹치면 화면이 가려진다. */
const RESERVED = new Set(['u', 'm', 'privacy', 'admin', 'api', 'assets', 'new', 'login']);

/** 통과하면 null, 막히면 사용자에게 보여줄 이유를 돌려준다. */
export function validateHandle(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `${HANDLE_MIN}자 이상이어야 합니다.`;
  if (handle.length > HANDLE_MAX) return `${HANDLE_MAX}자 이하여야 합니다.`;
  if (!HANDLE_RE.test(handle)) return '영소문자·숫자·하이픈만 쓸 수 있고, 하이픈으로 시작하거나 끝날 수 없습니다.';
  if (RESERVED.has(handle)) return '이미 쓰이는 이름입니다.';
  return null;
}

/** 입력창에서 쓰는 다듬기. 대문자와 양쪽 공백 정도는 막지 말고 고쳐준다. */
export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

/** 공개 맵의 경로. 화면 안의 링크와 이동에 쓴다. */
export function mapPath(handle: string, slug: string): string {
  return `/m/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
}

/** 공개 맵의 전체 주소. 한 곳에서만 만든다 — 링크 복사와 화면 표시가 어긋나지 않게. */
export function mapUrl(handle: string, slug: string, origin = location.origin): string {
  return `${origin}${mapPath(handle, slug)}`;
}

/** 공개 목록 주소. */
export function handleUrl(handle: string, origin = location.origin): string {
  return `${origin}/u/${encodeURIComponent(handle)}`;
}
