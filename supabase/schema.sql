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

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'maps_slug_key') then
    alter table public.maps add constraint maps_slug_key unique (slug);
  end if;
end $$;

-- /m/<슬러그> 조회용. 대부분의 행은 비공개이므로 공개된 것만 인덱스에 넣는다.
create index if not exists maps_slug_idx on public.maps (slug) where is_public;

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
