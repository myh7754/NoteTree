/**
 * 기능 사용 분석(PostHog)의 **유일한** 출입구.
 *
 * 화면 코드는 posthog를 직접 부르지 않는다. 나중에 Spring 수집 API를 붙이거나 도구를
 * 갈아탈 때 이 파일만 고치면 되도록 가둬 둔다.
 *
 * 지켜야 하는 선 (2026-09-30 설계):
 * - 사용자 콘텐츠(노트 본문·맵 제목·노드 라벨)는 절대 싣지 않는다 → sanitize()가 강제한다
 * - 식별자는 Supabase user.id(UUID)만. 이메일·이름은 내보내지 않는다
 * - autocapture·세션 리플레이는 끈다. 켜면 화면의 노트 텍스트가 딸려 들어간다
 */
import posthog from 'posthog-js';

/** 설계에서 정한 이벤트만 보낸다. 오타와 즉흥적인 이벤트 추가를 타입으로 막는다. */
export type EventName =
  | 'map_created'
  | 'node_added'
  | 'note_saved'
  | 'search_used'
  | 'map_published'
  | 'export_used';

type Value = string | number | boolean | null | undefined;
export type Props = Record<string, Value>;

/**
 * 이름만 봐도 사용자 콘텐츠인 키. 실수로 넘겨도 여기서 떨어진다.
 * 막는 쪽으로 틀리는 게 낫다 — 지표 한 칸 비는 것보다 남의 노트가 새는 게 훨씬 비싸다.
 */
const BANNED_KEY = /title|label|text|content|note|body|name|email|query|html|markdown|url/i;

/** 식별자(UUID 36자)는 통과하고 문장은 걸리는 선. */
const MAX_STRING = 48;

/** 금지 키·긴 문자열을 떼어낸다. 반환값만 바깥으로 나간다. */
export function sanitize(props: Props): Props {
  const safe: Props = {};
  for (const [key, value] of Object.entries(props)) {
    if (BANNED_KEY.test(key)) {
      warn(`'${key}'는 사용자 콘텐츠일 수 있어 보내지 않았습니다`);
      continue;
    }
    if (typeof value === 'string' && value.length > MAX_STRING) {
      warn(`'${key}'가 너무 깁니다(${value.length}자) — 보내지 않았습니다`);
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function warn(message: string) {
  console.warn(`[analytics] ${message}`);
}

/**
 * PostHog가 직접 "Safe to use in public apps"라고 적어둔 공개 토큰이다(write-only).
 * Sentry DSN과 같은 이유로 코드에 둔다 — 자세한 사정은 lib/sentry.ts 참고.
 */
const DEFAULT_KEY = 'phc_raiq8CcwCEkCKmqPz2zs4ko6Z8n38XYuQZ6TS77yMSn2';
const DEFAULT_HOST = 'https://us.i.posthog.com';
const key = import.meta.env.VITE_POSTHOG_KEY ?? DEFAULT_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? DEFAULT_HOST;
/** 개발 중에는 보내지 않는다 — 실 데이터를 테스트로 더럽히지 않기 위해. */
const enabled = Boolean(key && host) && !import.meta.env.DEV;

export function initAnalytics() {
  if (!enabled) return;
  posthog.init(key!, {
    api_host: host,
    autocapture: false, // 켜면 클릭한 요소의 텍스트(=노드 라벨)가 따라 들어간다
    disable_session_recording: true, // 화면에 노트 본문이 떠 있다
    disable_surveys: true, // 쓰지 않는다. 켜두면 대시보드에서 설문을 만드는 순간 앱에 뜬다
    // 기본값에 맡기지 않는다 — 버전에 따라 동작이 달라 첫 검증 때 $pageview가 빠졌다.
    capture_pageview: true,
    person_profiles: 'identified_only',
  });
}

export function track(event: EventName, props: Props = {}) {
  const safe = sanitize(props);
  if (!enabled) {
    if (import.meta.env.DEV) console.debug('[analytics]', event, safe);
    return;
  }
  posthog.capture(event, safe);
}

/** 로그인 시. UUID만 넘긴다 — 이메일·이름은 넘기지 않는다. */
export function identify(userId: string) {
  if (!enabled) return;
  posthog.identify(userId);
}

/** 로그아웃·탈퇴 시. 다음 사용자가 앞 사람 식별자에 묶이지 않게 끊는다. */
export function resetIdentity() {
  if (!enabled) return;
  posthog.reset();
}
