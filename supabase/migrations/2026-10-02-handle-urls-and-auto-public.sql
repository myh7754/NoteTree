alter table public.profiles
  add column if not exists auto_public boolean
  not null default false;

alter table public.maps
  add column if not exists legacy_slug text;

update public.maps
set legacy_slug = slug
where legacy_slug is null
  and slug is not null;

alter table public.maps
  drop constraint if exists maps_slug_key;

with cleaned as (
  select
    id,
    owner_id,
    updated_at,
    coalesce(
      nullif(
        trim(both '-' from
          regexp_replace(
            lower(title),
            '[^[:alnum:]가-힣]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'map'
    ) as base
  from public.maps
  where slug is not null
),
numbered as (
  select
    id,
    base,
    row_number() over (
      partition by owner_id, base
      order by updated_at
    ) as n
  from cleaned
)
update public.maps m
set slug = case
    when numbered.n = 1 then numbered.base
    else numbered.base || '-' || numbered.n
  end
from numbered
where m.id = numbered.id;

create unique index if not exists maps_owner_slug_key
  on public.maps (owner_id, slug);

create index if not exists maps_legacy_slug_idx
  on public.maps (legacy_slug);
