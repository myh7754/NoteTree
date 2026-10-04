-- 마인드맵 클라우드 저장 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists public.maps (
  -- 앱이 만드는 nanoid를 그대로 쓴다. 전역 고유값이라 사용자가 섞여도 안전하다.
  id          text        primary key,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  title       text        not null default '',
  -- mindMapData 전체 (nodes, children, rootId ...)
  data        jsonb       not null,
  positions   jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  -- 소프트 삭제. 실제로 지우면 다른 기기가 "여긴 없네" 하고 되살려 올린다.
  deleted_at  timestamptz
);

-- 내 맵 목록 조회가 가장 잦은 쿼리
create index if not exists maps_owner_updated_idx
  on public.maps (owner_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: "각자 자기 맵만" 을 앱이 아니라 DB가 강제한다.
-- 앱 쿼리에 실수가 있어도 남의 행이 새지 않는다.
-- ─────────────────────────────────────────────────────────────
alter table public.maps enable row level security;

drop policy if exists "본인 맵만 조회" on public.maps;
create policy "본인 맵만 조회"
  on public.maps for select
  using (auth.uid() = owner_id);

drop policy if exists "본인 맵만 생성" on public.maps;
create policy "본인 맵만 생성"
  on public.maps for insert
  with check (auth.uid() = owner_id);

drop policy if exists "본인 맵만 수정" on public.maps;
create policy "본인 맵만 수정"
  on public.maps for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "본인 맵만 삭제" on public.maps;
create policy "본인 맵만 삭제"
  on public.maps for delete
  using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- 공개 발행: 사용자가 직접 켠 맵만 로그인 없이 누구나 "읽는다".
-- 수정·삭제 정책은 위의 "본인만" 그대로라 쓰기는 여전히 본인만 된다.
-- (같은 동작의 정책이 여럿이면 OR로 합쳐진다 — select만 넓어진다)
--
-- 2026-10-01에 showcase_owners(운영자 계정 하나만 공개)를 대체했다.
-- 이전 절차는 migrations/2026-10-01-public-publishing.sql 참고.
-- ─────────────────────────────────────────────────────────────

-- 닉네임. 공개 주소 /u/<handle> 의 근거.
-- 이메일은 넣지 않는다 — 익명이 읽는 테이블이라 넣는 순간 공개된다.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  handle     text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "닉네임은 누구나 조회" on public.profiles;
create policy "닉네임은 누구나 조회"
  on public.profiles for select
  using (true);

drop policy if exists "본인 닉네임만 생성" on public.profiles;
create policy "본인 닉네임만 생성"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "본인 닉네임만 수정" on public.profiles;
create policy "본인 닉네임만 수정"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 공개 여부와 주소.
-- default false 가 이 설계에서 가장 중요한 한 줄이다 — 공개는 본인이 켜야 켜진다.
alter table public.maps add column if not exists is_public boolean not null default false;
alter table public.maps add column if not exists slug text;

-- 공개 주소는 /m/<닉네임>/<슬러그> 이다 (2026-10-02부터). 닉네임이 주소에 들어가므로
-- 슬러그는 **그 사람 안에서만** 겹치지 않으면 된다. 그 전에는 전체에서 유일해야 해서
-- 제목 뒤에 난수 6자를 붙였다 — 그때 만든 값은 legacy_slug에 남겨, 이미 보낸 옛 링크
-- (/m/<제목-난수>)로 들어온 사람을 새 주소로 넘겨준다.
-- 이전 절차는 migrations/2026-10-02-handle-urls-and-auto-public.sql 참고.
alter table public.maps add column if not exists legacy_slug text;
alter table public.maps drop constraint if exists maps_slug_key;
create unique index if not exists maps_owner_slug_key on public.maps (owner_id, slug);
create index if not exists maps_legacy_slug_idx on public.maps (legacy_slug);

-- 대부분의 행은 비공개이므로 공개된 것만 인덱스에 넣는다.
create index if not exists maps_slug_idx on public.maps (slug) where is_public;

-- "전체 공개" 모드. 켜 두면 앱이 새로 만든 맵도 공개로 켠다.
-- 맵 하나를 개별로 끄면 앱이 이 값도 끈다.
alter table public.profiles add column if not exists auto_public boolean not null default false;

drop policy if exists "공개 맵은 누구나 조회" on public.maps;
create policy "공개 맵은 누구나 조회"
  on public.maps for select
  using (is_public = true and deleted_at is null);

-- ─────────────────────────────────────────────────────────────
-- 보유 기간: 소프트 삭제한 맵을 30일 뒤 완전히 지운다 (2026-10-01 적용)
--
-- 맵 삭제가 소프트 삭제인 이유는 따로 있다 — 실제로 지우면 다른 기기가 "여긴 없네" 하고
-- 되살려 올린다(deleted_at 주석 참고). 하지만 영구 보존은 개인정보 처리방침과 맞지 않는다.
-- 30일이면 모든 기기가 삭제를 전파받고도 남는다.
--
-- pg_cron은 이 프로젝트에서 pg_catalog 스키마에 설치돼 있다.
-- 시각은 UTC다: 18:00 UTC = KST 03:00.
-- 등록 상태 확인:  select jobid, jobname, schedule, active from cron.job;
-- 실행 이력 확인:  select * from cron.job_run_details order by start_time desc limit 10;
-- 해제:            select cron.unschedule('purge-deleted-maps');
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_cron;

-- 이미 등록돼 있으면 지우고 다시 건다 (cron.schedule은 같은 이름이면 덮어쓰지만 명시해 둔다)
-- select cron.unschedule('purge-deleted-maps');
select cron.schedule(
  'purge-deleted-maps',
  '0 18 * * *',
  $$delete from public.maps where deleted_at is not null and deleted_at < now() - interval '30 days'$$
);

-- ─────────────────────────────────────────────────────────────
-- 용량 상한 (2026-10-03). 노드 개수 제한은 두지 않는다 — 이 앱을 만든 이유가 그것이다.
-- 막는 것은 하나: 누군가 무료 DB(500MB)를 혼자 채워 모든 사용자의 저장이 멈추는 일.
--   맵 하나      10MB  (217노드짜리 맵이 약 0.36MB)
--   한 사람 전체  30MB  (지운 지 30일이 안 된 맵 포함 — 만들고 지우기를 반복해 우회하지 못하게)
-- 숫자를 바꾸면 src/db/cloudSync.ts의 quotaMessage 문장도 같이 고친다.
-- 적용 절차는 migrations/2026-10-03-storage-quota.sql 참고.
-- ─────────────────────────────────────────────────────────────
alter table public.maps add column if not exists size_bytes bigint not null default 0;

create or replace function public.maps_enforce_quota()
returns trigger
language plpgsql
as $$
declare
  used bigint;
begin
  new.size_bytes := octet_length(new.data::text) + octet_length(new.positions::text);
  if new.size_bytes > 10485760 then
    raise exception 'MAP_TOO_LARGE';
  end if;
  select coalesce(sum(size_bytes), 0) into used
    from public.maps
    where owner_id = new.owner_id and id <> new.id;
  if used + new.size_bytes > 31457280 then
    raise exception 'QUOTA_EXCEEDED';
  end if;
  return new;
end;
$$;

drop trigger if exists maps_quota on public.maps;
create trigger maps_quota
  before insert or update of data, positions on public.maps
  for each row execute function public.maps_enforce_quota();

-- ─────────────────────────────────────────────────────────────
-- 노트에 넣는 사진 (2026-10-04). DB가 아니라 파일 저장소(무료 1GB, DB 500MB와 별개)에 둔다.
--
-- 공개 버킷이다: 주소를 아는 사람은 로그인 없이 읽는다. 공개 맵의 방문자가 사진을 봐야 해서다.
-- 파일 이름이 무작위(<계정 번호>/<uuid>.webp)라 주소를 맞힐 수는 없고, 목록 조회 정책이 없어
-- 남의 폴더를 훑어볼 수도 없다. 대신 비공개 맵의 사진도 주소가 새면 보인다.
--
--   한 장      2MB  (앱이 올리기 전에 긴 변 1600px로 줄인다. 버킷이 크기와 형식을 강제)
--   한 사람    50MB (올리기 정책이 강제. 이미 쓴 양만 보므로 마지막 한 장만큼 넘칠 수 있다)
-- 숫자를 바꾸면 src/db/images.ts와 이용약관 4항도 같이 고친다.
-- 노트에서 사진을 지워도 파일은 남는다(정리 기능 없음). 탈퇴하면 delete-account 함수가 지운다.
-- ─────────────────────────────────────────────────────────────
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
    -- 하위 폴더를 만들지 못하게 한다. 탈퇴 함수가 본인 폴더 바로 아래만 지운다
    and array_length(storage.foldername(name), 1) = 1
    and public.note_images_used() < 52428800
  );
