/**
 * 공개 발행 — 읽기(누구나)와 켜기/끄기(본인만).
 *
 * 누가 무엇을 읽어도 되는지는 여기서 정하지 않는다. **RLS가 정한다**(supabase/schema.sql).
 * 이 파일의 쿼리에 실수가 있어도 남의 비공개 맵은 나오지 않는다 — 그게 권한을 DB에
 * 둔 이유다. 여기서는 "무엇을 보여줄지"만 다룬다.
 *
 * ponytail: 목록에서도 맵 본문(data)을 통째로 받아 노드 수를 센다. 공개 맵이 수십 개를
 * 넘어 느려지면 노드 수를 컬럼으로 저장할 것. 지금은 쿼리 하나가 더 싸다.
 */
import type { MindMapData } from '../types';
import { supabase } from './supabase';
import { makeSlug } from '../utils/publish';

export interface PublicMapSummary {
  id: string;
  title: string;
  slug: string;
  nodeCount: number;
  updatedAt: number;
}

/** 맵 본문에서 노드 수를 센다. 목록 카드에 쓴다. */
function countNodes(data: MindMapData | null): number {
  return data?.nodes ? Object.keys(data.nodes).length : 0;
}

/** 닉네임 → 그 사람이 공개한 맵 목록. 없는 닉네임이면 null (404 화면용). */
export async function loadPublicMapsByHandle(
  handle: string
): Promise<PublicMapSummary[] | null> {
  if (!supabase) return null;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('handle', handle)
    .maybeSingle();
  if (profileErr) throw new Error(`사용자를 찾지 못했습니다: ${profileErr.message}`);
  if (!profile) return null; // 없는 닉네임과 "공개한 맵이 0개"는 다른 화면이다

  const { data, error } = await supabase
    .from('maps')
    .select('id, title, slug, data, updated_at')
    .eq('owner_id', profile.user_id)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`맵을 읽지 못했습니다: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) || '제목 없음',
    slug: r.slug as string,
    nodeCount: countNodes(r.data as MindMapData),
    updatedAt: new Date(r.updated_at as string).getTime(),
  }));
}

/** 슬러그 → 공개 맵 하나. 없거나 비공개면 null. */
export async function loadPublicMapBySlug(slug: string): Promise<MindMapData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('maps')
    .select('data')
    .eq('slug', slug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`맵을 읽지 못했습니다: ${error.message}`);
  return (data?.data as MindMapData) ?? null;
}

/** 로그인한 본인의 닉네임. 아직 안 정했으면 null. */
export async function getMyHandle(): Promise<string | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('handle')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`닉네임을 읽지 못했습니다: ${error.message}`);
  return (data?.handle as string) ?? null;
}

/** 닉네임 등록. 이미 쓰는 이름이면 사용자에게 보여줄 문장으로 바꿔 던진다. */
export async function claimHandle(handle: string): Promise<void> {
  if (!supabase) throw new Error('클라우드가 꺼져 있습니다.');
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase.from('profiles').insert({ user_id: userId, handle });
  if (error) {
    // 23505 = unique 위반. 두 가지 경우가 같은 코드로 온다 —
    // 남이 쓰는 닉네임(handle 중복)과 내가 이미 정함(user_id 중복).
    if (error.code === '23505') {
      throw new Error(
        error.message.includes('user_id')
          ? '이미 닉네임을 정했습니다.'
          : '이미 쓰이는 닉네임입니다. 다른 이름을 골라 주세요.'
      );
    }
    throw new Error(`닉네임을 저장하지 못했습니다: ${error.message}`);
  }
}

/** 공개한 맵의 슬러그를 포함한 현재 상태. 툴바 토글이 쓴다. */
export interface PublishState {
  isPublic: boolean;
  slug: string | null;
}

export async function getPublishState(mapId: string): Promise<PublishState> {
  if (!supabase) return { isPublic: false, slug: null };
  const { data, error } = await supabase
    .from('maps')
    .select('is_public, slug')
    .eq('id', mapId)
    .maybeSingle();
  if (error) throw new Error(`공개 상태를 읽지 못했습니다: ${error.message}`);
  return { isPublic: Boolean(data?.is_public), slug: (data?.slug as string) ?? null };
}

/**
 * 공개 켜기/끄기.
 *
 * 슬러그는 **처음 켤 때 한 번만** 만든다. 껐다 켜도, 제목을 바꿔도 그대로다 —
 * 안 그러면 남에게 보낸 링크가 조용히 깨진다.
 */
export async function setMapPublic(
  mapId: string,
  title: string,
  isPublic: boolean
): Promise<PublishState> {
  if (!supabase) throw new Error('클라우드가 꺼져 있습니다.');

  const current = await getPublishState(mapId);
  const slug = current.slug ?? (isPublic ? makeSlug(title) : null);

  const { error } = await supabase
    .from('maps')
    .update({ is_public: isPublic, slug })
    .eq('id', mapId);
  if (error) {
    // 슬러그가 겹치는 일은 난수 6자라 거의 없지만, 났다면 다시 누르면 다른 난수가 나온다.
    if (error.code === '23505') throw new Error('주소가 겹쳤습니다. 다시 눌러 주세요.');
    throw new Error(`공개 설정을 바꾸지 못했습니다: ${error.message}`);
  }
  return { isPublic, slug };
}
