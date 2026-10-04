import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readColorMode, resolveTheme, applyColorMode, watchSystemTheme, type ColorMode } from './colorMode';
import { useMindMapStore } from '../store/useMindMapStore';

/** 운영체제의 어두운 모드 설정을 흉내 낸다. change()를 부르면 설정이 바뀐 것처럼 알린다. */
function stubSystem(dark: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    change(next: boolean) {
      mql.matches = next;
      listeners.forEach((fn) => fn());
    },
    count: () => listeners.size,
  };
}

const theme = () => document.documentElement.dataset.theme;

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('colorMode', () => {
  it('저장된 값이 이상하면 시스템 따름으로 돌아간다', () => {
    expect(readColorMode('dark')).toBe('dark');
    expect(readColorMode('light')).toBe('light');
    expect(readColorMode('system')).toBe('system');
    expect(readColorMode('blue')).toBe('system');
    expect(readColorMode(null)).toBe('system');
  });

  it('시스템 따름은 운영체제 설정을, 나머지는 고른 값을 쓴다', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('적용하면 <html data-theme>이 붙는다', () => {
    stubSystem(false);
    applyColorMode('system');
    expect(theme()).toBe('light');
    applyColorMode('dark');
    expect(theme()).toBe('dark');
  });

  it('운영체제 설정을 알 수 없으면 다크다 — 지금까지의 유일한 모양', () => {
    vi.stubGlobal('matchMedia', undefined);
    applyColorMode('system');
    expect(theme()).toBe('dark');
  });

  it('시스템 따름이면 운영체제 설정이 바뀔 때 새로고침 없이 따라간다', () => {
    const system = stubSystem(true);
    let mode: ColorMode = 'system';
    applyColorMode(mode);
    const stop = watchSystemTheme(() => mode);

    system.change(false);
    expect(theme()).toBe('light');

    // 직접 고른 값이 있으면 운영체제 설정이 바뀌어도 그대로다
    mode = 'dark';
    applyColorMode(mode);
    system.change(true);
    system.change(false);
    expect(theme()).toBe('dark');

    stop();
    expect(system.count()).toBe(0);
  });

  it('설정에서 바꾸면 저장하고 바로 적용한다', () => {
    stubSystem(true);
    useMindMapStore.getState().setColorMode('light');
    expect(useMindMapStore.getState().colorMode).toBe('light');
    expect(localStorage.getItem('color-mode')).toBe('light');
    expect(theme()).toBe('light');
  });
});
