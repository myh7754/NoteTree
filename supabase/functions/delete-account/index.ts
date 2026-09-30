// 회원 탈퇴. service_role 키를 쓰는 유일한 곳이며, 절대 클라이언트로 나가면 안 된다.
//
// 삭제 대상은 요청 본문이 아니라 JWT에서 꺼낸다. 본문으로 받으면 남의 id를 넣어
// 남의 계정을 지울 수 있다.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
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
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
