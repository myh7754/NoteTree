/**
 * 에러 추적(Sentry).
 *
 * 2026-09-24에 사이트가 9일 가까이 죽어 있었는데 사용자가 알려주기 전까지 아무도 몰랐다.
 * 그걸 막으려고 넣는다. 켜는 건 에러 수집 하나뿐 — 로그·트레이싱·세션 리플레이는 끈다.
 *
 * 소스맵은 Sentry에 업로드하지 않고 배포본에 같이 올린다(vite build.sourcemap).
 * 저장소가 이미 공개라 소스맵으로 새로 드러날 비밀이 없고, 그 덕에 인증 토큰도
 * CI 업로드 단계도 필요 없다.
 */
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
/** 개발 중 일부러 낸 에러로 실 통계를 더럽히지 않는다. */
const enabled = Boolean(dsn) && !import.meta.env.DEV;

export function initSentry() {
  if (!enabled) return;
  Sentry.init({
    dsn,
    release: __RELEASE__, // 어느 배포에서 난 에러인지 (vite.config에서 커밋 해시 주입)
    tracesSampleRate: 0, // 트레이싱 끔
    replaysSessionSampleRate: 0, // 세션 리플레이 끔 — 화면에 노트 본문이 떠 있다
    replaysOnErrorSampleRate: 0,
    // IP 저장은 SDK 옵션이 아니라 Sentry 프로젝트 설정(Security & Privacy)에서 끈다.
  });
}

/** 삼켜버린 예외를 Sentry로도 올린다. 끄여 있으면 아무 일도 하지 않는다. */
export function captureError(error: unknown, context?: Record<string, string>) {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
