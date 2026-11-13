begin;
do $$ begin
 if to_regclass('public.city_editor_admins') is null then
  raise exception 'Najpierw skonfiguruj city_editor_admins i konta administratorów.';
 end if;
end $$;
create table if not exists public.city_editor_music_drafts (
 id text primary key check(id ~ '^[A-Za-z][A-Za-z0-9_-]{1,63}$'),title text not null,content jsonb not null,
 version bigint not null default 1 check(version>0),base_head text,
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
create table if not exists public.city_editor_music_previews (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),head text not null,
 branch text not null,payload jsonb not null,expires_at timestamptz not null,consumed boolean not null default false,
 result jsonb,created_at timestamptz not null default now()
);
create index if not exists city_editor_music_previews_expiry_idx on public.city_editor_music_previews(user_id,expires_at);
alter table public.city_editor_music_drafts enable row level security;
alter table public.city_editor_music_previews enable row level security;
revoke all on public.city_editor_music_drafts from public,anon,authenticated;
revoke all on public.city_editor_music_previews from public,anon,authenticated;
grant all on public.city_editor_music_drafts to service_role;
grant all on public.city_editor_music_previews to service_role;
commit;
