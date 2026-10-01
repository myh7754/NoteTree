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

export interface PublicOwner {
  handle: string;
  /** 그 사람이 공개한 맵 전부 (지금 보고 있는 것 포함). 본문은 싣지 않는다. */
  maps: { title: string; slug: string }[];
}

export interface PublicMap {
  map: MindMapData;
  owner: PublicOwner;
}

/**
 * 닉네임 + 슬러그 → 공개 맵 하나와, 그 사람이 공개한 다른 맵 목록.
 *
 * 목록을 같이 주는 이유: 링크 하나를 받은 사람이 그 사람이 공개한 나머지도 볼 수
 * 있어야 한다 — 공개로 켰다는 건 보여주겠다는 뜻이다. 비공개 맵은 RLS가 걸러서
 * 여기에 절대 섞이지 않는다.
 *
 * 없는 닉네임이거나, 그 사람에게 그런 공개 맵이 없으면 null.
 */
export async function loadPublicMap(handle: string, slug: string): Promise<PublicMap | null> {
  if (!supabase) return null;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('handle', handle)
    .maybeSingle();
  if (profileErr) throw new Error(`사용자를 찾지 못했습니다: ${profileErr.message}`);
  if (!profile) return null;

  const [mapRes, listRes] = await Promise.all([
    supabase
      .from('maps')
      .select('data')
      .eq('owner_id', profile.user_id)
      .eq('slug', slug)
      .eq('is_public', true)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('maps')
      .select('title, slug')
      .eq('owner_id', profile.user_id)
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);
  if (mapRes.error) throw new Error(`맵을 읽지 못했습니다: ${mapRes.error.message}`);
  if (!mapRes.data) return null;

  return {
    map: mapRes.data.data as MindMapData,
    owner: {
      handle,
      // 목록을 못 읽어도 맵은 보여준다 — 목록은 부가 기능이다
      maps: (listRes.data ?? []).map((m) => ({
        title: (m.title as string) || '제목 없음',
        slug: m.slug as string,
      })),
    },
  };
}

/**
 * 옛 주소(/m/<제목-난수6자>) → 새 주소의 닉네임과 슬러그.
 *
 * 2026-10-02에 주소를 /m/<닉네임>/<슬러그>로 바꾸면서, 그 전에 보낸 링크가 깨지지
 * 않도록 옛 슬러그를 legacy_slug 컬럼에 남겨 두었다. 못 찾으면 null.
 */
export async function resolveLegacySlug(
  legacySlug: string
): Promise<{ handle: string; slug: string } | null> {
  if (!supabase) return null;
  const { data: row } = await supabase
    .from('maps')
    .select('owner_id, slug')
    .eq('legacy_slug', legacySlug)
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();
  if (!row?.slug) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('user_id', row.owner_id)
    .maybeSingle();
  if (!profile?.handle) return null;
  return { handle: profile.handle as string, slug: row.slug as string };
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

export interface MyMapPublish {
  id: string;
  title: string;
  isPublic: boolean;
  slug: string | null;
}

/**
 * 내 맵 전체와 각각의 공개 여부. 설정창의 공개 탭이 쓴다.
 *
 * 서버에 올라간 맵만 나온다 — 아직 동기화되지 않은 맵은 서버에 행이 없어
 * 공개할 대상 자체가 없다. (공개를 켤 때는 호출부가 먼저 동기화한다)
 */
export async function listMyMapsPublish(): Promise<MyMapPublish[]> {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('maps')
    .select('id, title, is_public, slug')
    .eq('owner_id', userId) // 남의 공개 맵도 RLS로는 읽히므로 내 것만 거른다
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`맵 목록을 읽지 못했습니다: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) || '제목 없음',
    isPublic: Boolean(r.is_public),
    slug: (r.slug as string) ?? null,
  }));
}

/**
 * 공개 켜기/끄기.
 *
 * 슬러그는 **처음 켤 때 한 번만** 만든다. 껐다 켜도, 제목을 바꿔도 그대로다 —
 * 안 그러면 남에게 보낸 링크가 조용히 깨진다.
 *
 * 맵 하나를 끄면 "전체 공개" 모드도 같이 꺼진다. 일부를 비공개로 돌린 사람에게
 * 새 맵을 계속 자동으로 공개하는 건 그 사람의 뜻과 어긋난다.
 */
export async function setMapPublic(
  mapId: string,
  title: string,
  isPublic: boolean
): Promise<PublishState> {
  if (!supabase) throw new Error('클라우드가 꺼져 있습니다.');
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const current = await getPublishState(mapId);
  let slug = current.slug;
  if (!slug && isPublic) {
    // 내가 이미 쓰는 슬러그를 피한다 (비공개로 돌린 맵의 것도 포함 — 다시 켤 수 있으므로)
    const { data: mine, error: listErr } = await supabase
      .from('maps')
      .select('slug')
      .eq('owner_id', userId)
      .not('slug', 'is', null);
    if (listErr) throw new Error(`공개 설정을 바꾸지 못했습니다: ${listErr.message}`);
    slug = makeSlug(title, (mine ?? []).map((r) => r.slug as string));
  }

  const { error } = await supabase
    .from('maps')
    .update({ is_public: isPublic, slug })
    .eq('id', mapId);
  if (error) {
    // 다른 탭에서 동시에 같은 제목을 공개한 경우. 다시 누르면 다음 번호가 붙는다.
    if (error.code === '23505') throw new Error('주소가 겹쳤습니다. 다시 눌러 주세요.');
    throw new Error(`공개 설정을 바꾸지 못했습니다: ${error.message}`);
  }

  if (!isPublic) await setAutoPublic(false);
  return { isPublic, slug };
}

/** "전체 공개" 모드인가 — 켜져 있으면 새로 만드는 맵도 공개된다. */
export async function getAutoPublic(): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('auto_public')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`공개 설정을 읽지 못했습니다: ${error.message}`);
  return Boolean(data?.auto_public);
}

export async function setAutoPublic(value: boolean): Promise<void> {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('profiles')
    .update({ auto_public: value })
    .eq('user_id', userId);
  if (error) throw new Error(`공개 설정을 저장하지 못했습니다: ${error.message}`);
  autoPublishChecked.clear();
}

/**
 * 이번 세션에서 이미 확인한 맵. 자동 저장은 0.5초마다 올 수 있어서, 맵마다 한 번만
 * 서버에 물어본다. 전체 공개 설정이 바뀌면 비운다.
 */
const autoPublishChecked = new Set<string>();

/**
 * 전체 공개 모드면, 방금 서버에 올라간 **새 맵**을 공개한다. 공개했으면 true.
 *
 * "새 맵"의 기준은 슬러그가 한 번도 만들어진 적 없는 것이다. 슬러그가 있는데
 * 비공개인 맵은 사용자가 직접 끈 것이므로 건드리지 않는다.
 */
export async function maybeAutoPublish(mapId: string, title: string): Promise<boolean> {
  if (!supabase || autoPublishChecked.has(mapId)) return false;
  autoPublishChecked.add(mapId);
  try {
    if (!(await getAutoPublic())) return false;
    const state = await getPublishState(mapId);
    if (state.isPublic || state.slug !== null) return false;
    await setMapPublic(mapId, title, true);
    return true;
  } catch {
    // 실패하면 다음 저장 때 다시 시도한다. 저장 자체를 막을 일은 아니다.
    autoPublishChecked.delete(mapId);
    return false;
  }
}
