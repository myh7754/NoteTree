import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isCloudEnabled } from '../db/supabase';
import { resetIdentity, track } from '../lib/analytics';

export interface AuthState {
  session: Session | null;
  /** 최초 세션 확인이 끝났는지. 끝나기 전에 로그인 버튼을 깜빡이지 않게 한다. */
  ready: boolean;
  cloudEnabled: boolean;
}

/**
 * Supabase 세션을 구독한다.
 * 클라우드가 꺼져 있으면(환경변수 없음) 항상 비로그인 상태로 조용히 동작한다.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isCloudEnabled);

  useEffect(() => {
    if (!supabase) return;

    // 세션 확인이 실패하거나 늦어도 화면은 떠야 한다.
    // Supabase 프로젝트가 일시정지되면 호스트가 DNS에서 사라지는데, supabase-js는 그걸
    // 재시도 대상으로 보고 수십 초를 버틴다. 그동안 ready가 false면 흰 화면만 보인다.
    // (2026-09-24 실제로 겪음: 50초 흰 화면 → 그제서야 읽기전용 화면)
    const fallback = setTimeout(() => setReady(true), 3000);
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {
        // 못 물어봤으면 비로그인으로 둔다. 로그인 상태는 복구되면 onAuthStateChange가 알려준다.
      })
      .finally(() => {
        clearTimeout(fallback);
        setReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, ready, cloudEnabled: isCloudEnabled };
}

export type AuthProvider = 'github' | 'google' | 'kakao';

export async function signInWith(provider: AuthProvider): Promise<void> {
  if (!supabase) return;
  track('login_clicked', { provider });
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`로그인 실패: ${error.message}`);
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  // 식별자를 끊지 않으면 같은 브라우저의 다음 사용자가 앞 사람으로 집계된다.
  resetIdentity();
}
