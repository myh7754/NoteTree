import { supabase } from './supabase';
import { track } from '../lib/analytics';

/**
 * 노트에 넣는 사진. DB(maps.data)가 아니라 파일 저장소에 올리고 노트에는 주소만 남긴다 —
 * 사진을 노트 안에 넣으면 몇 장 만에 맵 하나의 상한(10MB)에 닿는다.
 *
 * 저장소는 "주소를 아는 사람은 누구나 읽는" 공개 버킷이다. 공개 맵을 로그인 없이 보는 사람도
 * 사진을 볼 수 있어야 해서다. 파일 이름이 무작위라 주소를 맞힐 수는 없다.
 *
 * 숫자를 바꾸면 supabase/schema.sql(버킷의 file_size_limit, 올리기 정책)과
 * 이용약관 4항을 같이 고친다.
 */
const BUCKET = 'note-images';
/** 긴 변이 이보다 크면 줄인다. 노트 창은 화면 폭의 75%까지라 일반 모니터에서는 이 이상이 보이지 않는다. */
export const IMAGE_MAX_SIDE = 1600;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_QUOTA_BYTES = 50 * 1024 * 1024;

export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));

/**
 * 올리기 전에 브라우저에서 줄인다. 저장소는 받은 파일을 그대로 보관할 뿐이라 여기서 줄여야 용량이 준다.
 * 이미 작은 PNG·WebP(화면 캡처 대부분)는 건드리지 않는다 — 다시 압축하면 글자가 흐려지기만 한다.
 * JPEG는 작아도 다시 저장한다: 휴대폰 사진에는 찍은 위치(EXIF)가 들어 있고, 사진 주소는 공개다.
 * 그 밖의 형식(AVIF, BMP 등)도 다시 저장한다 — 저장소가 받는 형식이 아니다.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  // 움직이는 GIF는 캔버스에 그리면 첫 장면만 남는다
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('이 사진 형식은 읽지 못했습니다. JPG나 PNG로 바꿔서 넣어 주세요.');
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, IMAGE_MAX_SIDE);
  const keep = file.type === 'image/png' || file.type === 'image/webp';
  if (keep && width === bitmap.width && file.size <= IMAGE_MAX_BYTES) return file;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP로 저장하지 못하는 브라우저는 요청을 무시하고 PNG를 돌려준다(오히려 커진다) — 그때는 JPEG로
  let blob = await toBlob(canvas, 'image/webp');
  if (blob?.type !== 'image/webp') {
    // JPEG에는 투명이 없다. 투명한 곳이 검게 나오지 않도록 그림 뒤에 흰색을 깐다
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    blob = await toBlob(canvas, 'image/jpeg');
  }
  if (!blob) throw new Error('사진을 읽지 못했습니다.');
  return blob;
}

/** 사진을 올리고 노트에 넣을 주소를 돌려준다. 못 올리면 사용자에게 보여 줄 문장으로 던진다. */
export async function uploadNoteImage(file: File, shrink = shrinkImage): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있습니다.');
  const userId = supabase && (await supabase.auth.getUser()).data.user?.id;
  if (!supabase || !userId) {
    throw new Error('로그인하면 사진 파일을 올릴 수 있습니다. 지금은 주소로만 넣을 수 있습니다.');
  }

  const blob = await shrink(file);
  if (blob.size > IMAGE_MAX_BYTES) throw new Error('사진이 너무 큽니다. 한 장에 2MB까지 올릴 수 있습니다.');

  // 서버의 올리기 정책이 "첫 폴더 = 본인 계정 번호"를 확인한다
  const path = `${userId}/${crypto.randomUUID()}.${blob.type.split('/')[1]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    // 캐시 시간은 기본값(1시간)을 둔다 — 길게 잡으면 탈퇴로 지운 사진이 그만큼 더 보인다
    .upload(path, blob, { contentType: blob.type });
  if (error) {
    // 본인 폴더에 올리는데 정책이 거부했다면 남은 이유는 계정 한도뿐이다
    if (error.message.includes('row-level security')) {
      throw new Error('사진 저장 공간(50MB)이 가득 차 올리지 못했습니다.');
    }
    throw new Error(`사진을 올리지 못했습니다: ${error.message}`);
  }
  track('image_uploaded', { kb: Math.round(blob.size / 1024) });
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 내가 올린 사진의 합계(바이트). 로그인하지 않았거나 읽지 못하면 null. */
export async function getImagesUsed(): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('note_images_used');
  return error || data === null ? null : Number(data);
}
