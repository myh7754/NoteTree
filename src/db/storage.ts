import { supabase } from './supabase';

/**
 * 한 사람이 클라우드에 쓸 수 있는 전체 용량. DB 트리거(maps_enforce_quota)가 강제하고,
 * 여기 숫자는 화면에 남은 양을 보여 주는 데만 쓴다 — 바꿀 때는 supabase/schema.sql과 같이 고친다.
 */
export const QUOTA_BYTES = 30 * 1024 * 1024;

/**
 * 노트를 포함한 노드 하나의 평균 크기.
 * ponytail: 실제 맵 9개(323노드, 567KB)에서 잰 값을 고정으로 쓴다. "노드 약 몇 개 더"라는
 * 어림을 보여 주는 용도라 정확할 필요가 없다. 사람마다 크게 다르면 그 사람의 평균으로 바꾼다.
 */
export const BYTES_PER_NODE = 1750;

/** 내 맵들이 차지하는 용량(바이트). 로그인하지 않았거나 읽지 못하면 null. */
export async function getStorageUsed(): Promise<number | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  // 지운 지 30일이 안 된 맵도 센다 — DB의 상한 계산과 같은 기준이어야 숫자가 맞는다
  const { data, error } = await supabase.from('maps').select('size_bytes').eq('owner_id', userId);
  if (error || !data) return null;
  return data.reduce((sum, row) => sum + (Number(row.size_bytes) || 0), 0);
}
