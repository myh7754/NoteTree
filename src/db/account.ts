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
  if (error) {
    let message = `탈퇴에 실패했습니다: ${error.message}`;

    // Edge Function 에러의 실제 사유는 응답 본문에 있다
    if (error.context) {
      try {
        const body = await error.context.json();
        if (body.error) {
          message = `탈퇴에 실패했습니다: ${body.error}`;
        }
      } catch {
        // 본문 읽기 실패는 무시하고 기본 메시지 유지
      }
    }

    throw new Error(message, { cause: error });
  }

  try {
    await clearLocalData();
  } catch (err) {
    // 서버 삭제는 이미 성공했다. 로컬 정리 실패를 탈퇴 실패로 보고하지 않는다.
    console.warn('[deleteAccount] 서버 삭제 후 로컬 정리에 실패했습니다:', err);
  }
  // 서버 계정은 이미 지워졌으므로 로그아웃은 언제나 옳다.
  await supabase.auth.signOut();
}
