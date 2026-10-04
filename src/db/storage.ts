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

/**
 * 서버에 올라간 양이 바뀌었다는 신호. 올리기·동기화가 끝날 때 보내고, 사용량을 보여 주는 곳이 듣고 다시 읽는다.
 * db 층은 스토어를 모르므로(스토어가 db를 쓴다) 창 이벤트로 알린다.
 */
export const STORAGE_CHANGED = 'notetree:storage-changed';
export const notifyStorageChanged = () => window.dispatchEvent(new Event(STORAGE_CHANGED));

/** 사용량을 화면에 보여 줄 숫자들로 바꾼다. */
export function storageSummary(used: number) {
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  const ratio = Math.min(100, (used / QUOTA_BYTES) * 100);
  return {
    ratio,
    // 조금이라도 썼으면 1%부터 — 0%는 "아무것도 없다"로 읽힌다
    percent: used > 0 ? Math.max(1, Math.round(ratio)) : 0,
    usedMb: mb(used),
    quotaMb: mb(QUOTA_BYTES),
    // "노드 약 몇 개 더"는 어림이라 백 단위로 내린다
    nodesLeft: Math.max(0, Math.floor((QUOTA_BYTES - used) / BYTES_PER_NODE / 100) * 100),
  };
}
