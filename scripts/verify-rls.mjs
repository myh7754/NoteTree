/**
 * 공개 발행 RLS 검증 — 익명(publishable) 키로 실제 DB를 두드려 본다.
 *
 * 왜 유닛 테스트로 안 되나: 권한은 앱 코드가 아니라 DB가 정한다. 앱 쿼리를 아무리
 * 테스트해도 "정책이 실제로 막는가"는 증명되지 않는다. 모의 객체는 RLS를 모른다.
 *
 * 실행:  node scripts/verify-rls.mjs
 * 값은 커밋된 .env.production 에서 읽는다 (publishable 키는 공개 값이다).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const text = readFileSync(new URL('../.env.production', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? '  통과' : '✗ 실패'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
}

console.log('익명 키로 접근합니다 (로그인하지 않은 방문자와 같은 권한)\n');

// ① 공개된 맵은 보여야 한다
const { data: pub, error: pubErr } = await supabase
  .from('maps')
  .select('id, title, slug')
  .eq('is_public', true);
check('공개 맵 조회', !pubErr && (pub?.length ?? 0) > 0, pubErr?.message ?? `${pub?.length ?? 0}행`);

// ② 비공개 맵은 한 행도 보이면 안 된다 — 이게 이 기능의 핵심 안전장치다
const { data: priv, error: privErr } = await supabase
  .from('maps')
  .select('id')
  .eq('is_public', false);
check('비공개 맵 차단', !privErr && (priv?.length ?? 0) === 0, `${priv?.length ?? 0}행 (0이어야 함)`);

// ③ 삭제된 맵도 공개로 켜져 있든 말든 보이면 안 된다
const { data: del } = await supabase.from('maps').select('id').not('deleted_at', 'is', null);
check('삭제된 맵 차단', (del?.length ?? 0) === 0, `${del?.length ?? 0}행 (0이어야 함)`);

// ④ 닉네임은 읽을 수 있어야 한다 (공개 주소 확인용)
const { data: profiles, error: profErr } = await supabase.from('profiles').select('handle');
check('닉네임 조회', !profErr && (profiles?.length ?? 0) > 0, profErr?.message ?? `${profiles?.length ?? 0}행`);

// ⑤ 이메일이 새지 않는지 — profiles에 이메일 비슷한 컬럼이 있으면 설계 위반이다
const { data: oneProfile } = await supabase.from('profiles').select('*').limit(1).maybeSingle();
const leakyKeys = Object.keys(oneProfile ?? {}).filter((k) => /email|mail|phone/i.test(k));
check('프로필에 연락처 없음', leakyKeys.length === 0, leakyKeys.join(', ') || '없음');

// ⑥ 익명이 남의 맵을 고칠 수 없어야 한다.
//    PostgREST는 "0행 수정"도 성공으로 돌려주므로, 에러가 아니라 **바뀐 행 수**를 본다.
const target = pub?.[0];
if (target) {
  const { data: changed } = await supabase
    .from('maps')
    .update({ title: 'RLS 검증 — 이 글자가 남으면 안 된다' })
    .eq('id', target.id)
    .select('id');
  check('익명 수정 차단', (changed?.length ?? 0) === 0, `${changed?.length ?? 0}행 수정됨 (0이어야 함)`);

  const { data: deleted } = await supabase.from('maps').delete().eq('id', target.id).select('id');
  check('익명 삭제 차단', (deleted?.length ?? 0) === 0, `${deleted?.length ?? 0}행 삭제됨 (0이어야 함)`);
} else {
  check('익명 수정·삭제 차단', false, '공개 맵이 없어 검사하지 못함');
}

// ⑦ 익명이 닉네임을 선점할 수 없어야 한다
const { error: insErr } = await supabase
  .from('profiles')
  .insert({ user_id: '00000000-0000-0000-0000-000000000000', handle: `rls-test-${Date.now()}` });
check('익명 닉네임 생성 차단', Boolean(insErr), insErr?.message ?? '막히지 않았다');

console.log(failed === 0 ? '\n전부 통과' : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
