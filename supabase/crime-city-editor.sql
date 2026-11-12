begin;
do $$ begin
 if to_regclass('public.city_editor_admins') is null or to_regclass('public.city_editor_previews') is null then
  raise exception 'Najpierw skonfiguruj poprzedni panel online i administratorów.';
 end if;
end $$;
create table if not exists public.city_editor_crime_drafts (
 id text primary key check(id ~ '^[a-z][a-z0-9_]{1,47}$'),
 content jsonb not null,
 version bigint not null default 1 check(version>0),
 base_head text,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.city_editor_crime_drafts enable row level security;
revoke all on public.city_editor_crime_drafts from public,anon,authenticated;
grant all on public.city_editor_crime_drafts to service_role;
commit;
