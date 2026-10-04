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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // 토큰이 가리키는 사용자를 확인한다. 위조된 토큰이면 여기서 걸린다.
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);

    // 노트에 올린 사진. 저장소의 파일은 cascade로 지워지지 않아서 직접 지운다.
    // 계정보다 먼저 지운다 — 실패하면 계정이 남아 있어 다시 시도할 수 있다.
    const images = admin.storage.from('note-images');
    for (;;) {
      const { data: files, error: listErr } = await images.list(data.user.id, { limit: 1000 });
      if (listErr) throw listErr;
      if (!files.length) break;
      const { data: removed, error: rmErr } = await images.remove(
        files.map((f) => `${data.user.id}/${f.name}`)
      );
      if (rmErr) throw rmErr;
      // 지워진 것이 없는데 목록은 남아 있다면 같은 목록을 영원히 돌게 된다
      if (!removed?.length) throw new Error('note-images: 지울 수 없는 항목이 남아 있음');
    }

    // maps·profiles는 on delete cascade로 함께 사라진다.
    const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
    if (delErr) {
      console.error('[delete-account] deleteUser failed', delErr);
      return json({ error: '삭제에 실패했습니다' }, 500);
    }

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
