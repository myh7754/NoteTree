create table if not exists public.profiles (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  handle text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "p_read" on public.profiles;
create policy "p_read"
  on public.profiles
  for select
  using (true);

drop policy if exists "p_insert" on public.profiles;
create policy "p_insert"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "p_update" on public.profiles;
create policy "p_update"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.maps
  add column if not exists is_public boolean
  not null default false;

alter table public.maps
  add column if not exists slug text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'maps_slug_key'
  ) then
    alter table public.maps
      add constraint maps_slug_key unique (slug);
  end if;
end $$;

create index if not exists maps_slug_idx
  on public.maps (slug)
  where is_public;

drop policy if exists "m_public_read" on public.maps;
create policy "m_public_read"
  on public.maps
  for select
  using (
    is_public = true
    and deleted_at is null
  );

insert into public.profiles (user_id, handle)
select owner_id, 'myh'
from public.showcase_owners
limit 1
on conflict (user_id) do nothing;

update public.maps m
set
  is_public = true,
  slug = coalesce(
    m.slug,
    nullif(
      trim(both '-' from
        regexp_replace(
          lower(m.title),
          '[^[:alnum:]가-힣]+',
          '-',
          'g'
        )
      ),
      ''
    )
    || '-'
    || lower(right(m.id, 6))
  )
where m.owner_id in (
    select owner_id from public.showcase_owners
  )
  and m.deleted_at is null;

update public.maps
set slug = lower(right(id, 6))
where is_public
  and slug is null;

drop policy if exists
  "공개 계정 맵은 누구나 조회" on public.maps;

drop table if exists public.showcase_owners;
