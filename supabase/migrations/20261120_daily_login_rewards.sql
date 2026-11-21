begin;
create table if not exists public.daily_login_rewards (
 user_id uuid not null references auth.users(id) on delete cascade,
 reward_day date not null,
 rotation_index integer not null check(rotation_index between 0 and 4),
 state text not null default 'offered' check(state in ('offered','reserved','delivered')),
 delivery_scope text,
 delivery_token uuid,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 primary key(user_id,reward_day)
);
alter table public.daily_login_rewards enable row level security;
revoke all on public.daily_login_rewards from public, anon, authenticated;
create unique index if not exists daily_login_rewards_one_pending
 on public.daily_login_rewards(user_id) where state='reserved';
create or replace function public.daily_login_reward(
 p_action text default 'status',
 p_expected_user_id uuid default null,
 p_scope text default null,
 p_token uuid default null,
 p_day date default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid();
 today date := (statement_timestamp() at time zone 'UTC')::date;
 r public.daily_login_rewards%rowtype;
 idx integer;
 payload jsonb;
begin
 if u is null or u is distinct from p_expected_user_id then
  raise exception 'Account changed. Please sign in again.';
 end if;
 if not exists(select 1 from auth.users where id=u and is_anonymous=false) then
  raise exception 'A registered account is required.';
 end if;
 if p_action not in ('status','reserve','ack') then raise exception 'Invalid action.'; end if;
 perform pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,793144));
 if p_action='status' then
  select * into r from public.daily_login_rewards where user_id=u and state='reserved';
  if not found then
   select * into r from public.daily_login_rewards where user_id=u and reward_day=today;
   if not found then
    select (count(*) % 5)::integer into idx from public.daily_login_rewards
      where user_id=u and state in ('reserved','delivered');
    insert into public.daily_login_rewards(user_id,reward_day,rotation_index)
      values(u,today,idx) returning * into r;
   end if;
  end if;
 else
  if p_scope is null or length(p_scope) not between 1 and 200 or p_token is null or p_day is null then
   raise exception 'Missing delivery identity.';
  end if;
  select * into r from public.daily_login_rewards where user_id=u and reward_day=p_day for update;
  if not found then raise exception 'Refresh your reward mail.'; end if;
  if p_action='reserve' then
   if r.state='offered' then
    if r.reward_day<>today then raise exception 'This offer has expired. Refresh your mail.' using errcode='P0002'; end if;
    if exists(select 1 from public.daily_login_rewards where user_id=u and state='reserved') then
     raise exception 'Finish the pending reward first.';
    end if;
    update public.daily_login_rewards set state='reserved',delivery_scope=p_scope,delivery_token=p_token
     where user_id=u and reward_day=p_day returning * into r;
   end if;
  end if;
  if r.delivery_scope is distinct from p_scope or r.delivery_token is distinct from p_token then
   raise exception 'Pending delivery belongs to another browser or campaign. Finish it there.';
  end if;
  if p_action='ack' then
   if r.state not in ('reserved','delivered') then raise exception 'Reward is not reserved.'; end if;
   update public.daily_login_rewards set state='delivered',delivered_at=coalesce(delivered_at,now())
    where user_id=u and reward_day=p_day returning * into r;
  end if;
 end if;
 payload := jsonb_build_object('user_id',u,'day',r.reward_day,'index',r.rotation_index,
  'state',r.state,'scope',r.delivery_scope,'server_day',today,
  'next_reset_at',((today+1)::timestamp at time zone 'UTC'));
 return payload;
end;
$$;
revoke all on function public.daily_login_reward(text,uuid,text,uuid,date) from public,anon;
grant execute on function public.daily_login_reward(text,uuid,text,uuid,date) to authenticated;
commit;
