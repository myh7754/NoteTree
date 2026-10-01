import { supabase } from './supabase';
import type { ShortcutOverrides } from '../utils/shortcuts';

/**
 * 단축키 설정을 계정에 저장한다.
 *
 * 저장 위치는 Supabase 로그인 정보의 user_metadata다. 표(profiles)에 칸을 더하지 않은
 * 이유: profiles는 닉네임 때문에 누구나 읽을 수 있고, user_metadata는 본인만 읽고
 * 쓴다. DB 구조도 바꿀 필요가 없다. 기본값과 다르게 바꾼 것만 저장한다.
 *
 * ponytail: 저장 실패는 조용히 넘긴다. 이 브라우저(localStorage)에는 이미 남아 있어서
 * 당장 잃는 게 없고, 다음에 키를 바꿀 때 다시 올라간다.
 */
export function saveShortcutsToAccount(overrides: ShortcutOverrides): void {
  const client = supabase;
  if (!client) return;
  client.auth
    .getSession()
    .then(({ data }) => {
      if (data.session) return client.auth.updateUser({ data: { shortcuts: overrides } });
    })
    .catch(() => {});
}

/**
 * 로그인할 때(그리고 시작할 때 이미 로그인돼 있으면) 계정에 저장된 설정을 넘겨준다.
 * 계정에 저장한 적이 없으면 부르지 않는다 — 그때는 이 브라우저의 설정을 그대로 쓴다.
 */
export function onAccountShortcuts(apply: (raw: unknown) => void): void {
  supabase?.auth.onAuthStateChange((_event, session) => {
    const raw = session?.user.user_metadata?.shortcuts;
    if (raw !== undefined) apply(raw);
  });
}
