// 회원 탈퇴. service_role 키를 쓰는 유일한 곳이며, 절대 클라이언트로 나가면 안 된다.
//
// 삭제 대상은 요청 본문이 아니라 JWT에서 꺼낸다. 본문으로 받으면 남의 id를 넣어
// 남의 계정을 지울 수 있다.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS 헤더. 브라우저의 preflight 요청이 통과하고 응답을 읽을 수 있어야 한다.
// 오리진을 *로 두는 이유: 이 함수는 유효한 JWT 없이는 401이므로,
// 오리진 제한이 실질 방어선이 아니다.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  // OPTIONS preflight 요청을 인증 검사 전에 처리한다.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST 메서드만 허용한다. 계정을 지우는 함수이므로.
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 토큰이 가리키는 사용자를 확인한다. 위조된 토큰이면 여기서 걸린다.
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);

    // maps·profiles는 on delete cascade로 함께 사라진다.
    const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true }, 200);
  } catch (err) {
    // 예기치 못한 예외가 나도 JSON 계약을 지킨다. 상세는 서버 로그에만.
    console.error('[delete-account]', err);
    return json({ error: 'internal server error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}
