-- 노트 사진 저장소. 설명은 schema.sql의 같은 구역에 있다. 여러 번 실행해도 안전하다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 내가 올린 사진의 합계. 정책과 화면(설정 → 계정)이 같은 숫자를 쓴다.
-- security definer: 목록 조회 정책이 없어서 본인도 storage.objects를 직접 읽지 못한다.
create or replace function public.note_images_used()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
    from storage.objects
    where bucket_id = 'note-images'
      and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;

drop policy if exists "본인 폴더에만 사진 올리기" on storage.objects;
create policy "본인 폴더에만 사진 올리기"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.note_images_used() < 52428800
  );
