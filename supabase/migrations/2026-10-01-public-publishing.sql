-- 사용자별 공개 발행 (2026-10-01)
--
-- showcase_owners(운영자 계정 하나만 공개) → 누구나 자기 맵을 공개할 수 있는 구조로.
--
-- 순서가 중요하다. 새 구조를 **먼저** 세우고 운영자 데이터를 옮긴 뒤 옛 구조를 지운다.
-- 반대로 하면 그 사이 공개 페이지가 빈 화면이 된다 (정책이 OR로 합쳐지므로 겹쳐도 안전).
--
-- 적용: Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 실행.

-- ── 1. 닉네임 ────────────────────────────────────────────────
-- 공개 주소 /u/<handle> 의 근거. 이메일은 여기 넣지 않는다 —
-- 이 테이블은 익명이 읽을 수 있으므로, 들어오는 순간 이메일이 공개된다.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  handle     text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- 닉네임은 누구나 읽는다 (공개 페이지 주소를 확인해야 하므로)
drop policy if exists "닉네임은 누구나 조회" on public.profiles;
create policy "닉네임은 누구나 조회"
  on public.profiles for select
  using (true);

-- 만들고 바꾸는 건 본인 것만
drop policy if exists "본인 닉네임만 생성" on public.profiles;
create policy "본인 닉네임만 생성"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "본인 닉네임만 수정" on public.profiles;
create policy "본인 닉네임만 수정"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. 맵에 공개 여부와 주소 ──────────────────────────────────
-- default false 가 이 설계에서 가장 중요한 한 줄이다.
-- 남의 공부 기록이 의도치 않게 노출되는 것이 이 기능 최악의 사고다.
alter table public.maps add column if not exists is_public boolean not null default false;
alter table public.maps add column if not exists slug text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'maps_slug_key') then
    alter table public.maps add constraint maps_slug_key unique (slug);
  end if;
end $$;

-- /m/<슬러그> 조회용. 공개된 것만 인덱스에 넣는다 (대부분의 행은 비공개다).
create index if not exists maps_slug_idx on public.maps (slug) where is_public;

-- ── 3. 익명 읽기 정책 ────────────────────────────────────────
-- 공개로 켠 맵만, 삭제되지 않은 것만. 쓰기 정책은 건드리지 않는다 —
-- 읽기만 넓어지고 수정·삭제는 여전히 본인만이다.
drop policy if exists "공개 맵은 누구나 조회" on public.maps;
create policy "공개 맵은 누구나 조회"
  on public.maps for select
  using (is_public = true and deleted_at is null);

-- ── 4. 운영자 데이터 이전 ────────────────────────────────────
-- 이력서에 뿌린 링크가 끊기지 않도록, 옛 공개 계정의 맵을 그대로 공개 상태로 옮긴다.
-- 닉네임은 'myh'. 슬러그는 제목이 비거나 겹칠 수 있으니 id를 섞어 확실히 유일하게 만든다
-- (앱이 만드는 슬러그는 '제목-난수6자'이고, 여기 것도 같은 모양이 된다).
insert into public.profiles (user_id, handle)
select owner_id, 'myh' from public.showcase_owners limit 1
on conflict (user_id) do nothing;

update public.maps m
set
  is_public = true,
  slug = coalesce(
    m.slug,
    -- trim: 제목이 기호로 끝나면 'db--a1b2c3' 처럼 하이픈이 겹친다. 앱의 makeSlug와 같은 모양으로 맞춘다.
    nullif(trim(both '-' from regexp_replace(lower(m.title), '[^[:alnum:]가-힣]+', '-', 'g')), '')
      || '-' || lower(right(m.id, 6))
  )
where m.owner_id in (select owner_id from public.showcase_owners)
  and m.deleted_at is null;

-- 제목이 통째로 기호였던 맵은 위에서 slug가 null로 남는다. 그런 것만 id로 채운다.
update public.maps
set slug = lower(right(id, 6))
where is_public and slug is null;

-- ── 5. 옛 구조 제거 ──────────────────────────────────────────
-- 4번이 끝난 뒤에야 지운다.
drop policy if exists "공개 계정 맵은 누구나 조회" on public.maps;
drop table if exists public.showcase_owners;

-- ── 확인 ─────────────────────────────────────────────────────
-- select handle from public.profiles;
-- select id, title, is_public, slug from public.maps where is_public;
