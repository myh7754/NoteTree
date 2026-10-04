import { useSyncExternalStore } from 'react';

/**
 * 색 모드(다크/라이트). 실제 전환은 `<html data-theme>` 하나로 한다 — 색은 전부 CSS 변수라
 * (index.css) 속성 하나만 바꾸면 화면 전체가 따라온다.
 *
 * 이 기기의 취향으로 localStorage에 둔다(맵 모양·노트 패널 위치와 같다). 그래서 공개 페이지
 * 방문자는 저장한 값이 없어 자기 시스템 설정으로 본다.
 */
export type ColorMode = 'system' | 'dark' | 'light';
export type Theme = 'dark' | 'light';

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: 'system', label: '시스템 따름' },
  { id: 'dark', label: '다크' },
  { id: 'light', label: '라이트' },
];

export const readColorMode = (v: string | null): ColorMode =>
  v === 'dark' || v === 'light' ? v : 'system';

export const resolveTheme = (mode: ColorMode, prefersDark: boolean): Theme =>
  mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

const systemQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyColorMode(mode: ColorMode): void {
  // 운영체제 설정을 알 수 없으면 다크다 — 라이트가 생기기 전의 유일한 모양
  const prefersDark = systemQuery()?.matches ?? true;
  document.documentElement.dataset.theme = resolveTheme(mode, prefersDark);
}

/** 운영체제 설정이 바뀌면 다시 적용한다. 직접 고른 값이 있으면 결과는 그대로다. */
export function watchSystemTheme(getMode: () => ColorMode): () => void {
  const query = systemQuery();
  if (!query) return () => {};
  const onChange = () => applyColorMode(getMode());
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
};
const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/**
 * 지금 실제로 적용된 테마. CSS 변수를 못 읽는 것(BlockNote의 theme prop)에 넘긴다.
 * 출처는 `<html data-theme>` 하나다 — 설정을 바꾸든 운영체제 설정이 바뀌든 여기로 모인다.
 */
export const useResolvedTheme = (): Theme => useSyncExternalStore(subscribe, currentTheme);
