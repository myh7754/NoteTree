alter table public.maps
  add column if not exists size_bytes bigint
  not null default 0;

create or replace function public.maps_enforce_quota()
returns trigger
language plpgsql
as $$
declare
  used bigint;
begin
  new.size_bytes :=
    octet_length(new.data::text)
    + octet_length(new.positions::text);
  if new.size_bytes > 10485760 then
    raise exception 'MAP_TOO_LARGE';
  end if;
  select coalesce(sum(size_bytes), 0)
    into used
    from public.maps
    where owner_id = new.owner_id
      and id <> new.id;
  if used + new.size_bytes > 52428800 then
    raise exception 'QUOTA_EXCEEDED';
  end if;
  return new;
end;
$$;

drop trigger if exists maps_quota on public.maps;

create trigger maps_quota
  before insert or update of data, positions
  on public.maps
  for each row
  execute function public.maps_enforce_quota();

update public.maps
set size_bytes =
  octet_length(data::text)
  + octet_length(positions::text);
