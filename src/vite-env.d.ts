/// <reference types="vite/client" />

/** 배포 식별용 커밋 해시. vite.config.ts의 define에서 주입된다. */
declare const __RELEASE__: string;

interface ImportMetaEnv {
  /** Supabase 프로젝트 URL. 없으면 앱은 로컬 전용으로 동작한다. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable(공개) 키. secret·service_role 키를 넣지 말 것. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Sentry DSN. 없으면 에러를 보내지 않는다(로컬 개발 기본값). */
  readonly VITE_SENTRY_DSN?: string;
  /** PostHog 프로젝트 키. 호스트와 둘 다 있어야 분석이 켜진다. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog 수집 호스트 (예: https://eu.i.posthog.com). */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
