import { supabase } from './supabase';
import { clearLocalData } from './mindmapDB';

/**
 * 회원 탈퇴. 계정 삭제는 service_role 권한이 필요해 브라우저에서 못 한다 —
 * Edge Function이 서버에서 처리하고, 여기서는 그 결과를 받아 뒷정리만 한다.
 *
 * 순서가 중요하다: 서버가 먼저다. 로컬을 먼저 지우면 서버 삭제가 실패했을 때
 * 사용자 눈에만 사라지고 데이터는 남는다.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('클라우드가 꺼져 있어 탈퇴할 계정이 없습니다.');

  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw new Error(`탈퇴에 실패했습니다: ${error.message}`);

  await clearLocalData();
  await supabase.auth.signOut();
}
