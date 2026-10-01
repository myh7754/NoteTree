/**
 * 공개 발행에 쓰는 순수 함수 — 슬러그 생성과 닉네임 검증.
 *
 * DB도 화면도 모르는 순수 함수로 떼어 둔다. 공개 주소는 한 번 남에게 보내면
 * 되돌릴 수 없으므로, 규칙을 테스트로 고정할 수 있는 자리에 두는 편이 안전하다.
 */
import { customAlphabet } from 'nanoid';

/** 주소에 들어가도 탈이 없고 눈으로 읽어도 헷갈리지 않는 문자만. */
const randomSuffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

/** 제목이 길면 주소가 흉해진다. 자른다고 충돌하지 않는다 — 뒤에 난수가 붙으므로. */
const MAX_TITLE_PART = 40;

/**
 * `제목-난수6자`. 제목이 겹쳐도 충돌하지 않는다.
 *
 * 한글은 그대로 둔다. 브라우저가 알아서 인코딩하고, 주소창에는 한글로 보인다.
 * 로마자로 옮기려면 사전이 필요한데, 그 복잡함에 비해 얻는 게 없다.
 *
 * 한 번 만들면 고정이다 — 제목을 바꿔도 다시 만들지 않는다. 안 그러면 남에게
 * 보낸 링크가 조용히 깨진다. (호출부의 책임)
 */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    // 글자·숫자가 아닌 것은 전부 하이픈으로. \p{L}은 한글도 포함한다.
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_TITLE_PART)
    // 자르다 하이픈으로 끝났으면 떼어낸다
    .replace(/-$/, '');
  // 제목이 기호뿐이거나 비어 있으면 난수만 남는다 — 주소로는 충분하다.
  return base ? `${base}-${randomSuffix()}` : randomSuffix();
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

/** 공개 맵 주소. 한 곳에서만 만든다 — 링크 복사와 화면 표시가 어긋나지 않게. */
export function mapUrl(slug: string, origin = location.origin): string {
  return `${origin}/m/${encodeURIComponent(slug)}`;
}

/** 공개 목록 주소. */
export function handleUrl(handle: string, origin = location.origin): string {
  return `${origin}/u/${encodeURIComponent(handle)}`;
}
