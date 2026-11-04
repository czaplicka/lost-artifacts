begin;

-- Run after the original Holmes SQL. Existing claims are retained.
alter table public.holmes_daily_hint_claims
  add column if not exists request_id uuid,
  add column if not exists delivery_ref text;

create unique index if not exists holmes_hint_request_per_user
  on public.holmes_daily_hint_claims (user_id, request_id)
  where request_id is not null;

-- Remove the old signature so PostgREST has no ambiguous overload.
drop function if exists public.holmes_daily_hint(boolean);
drop function if exists public.holmes_daily_hint(boolean, uuid, text);

create or replace function public.holmes_daily_hint(
  p_claim boolean default false,
  p_request_id uuid default null,
  p_delivery_ref text default null,
  p_expected_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_now timestamptz;
  v_day date;
  v_next_reset timestamptz;
  v_row public.holmes_daily_hint_claims%rowtype;
  v_new boolean := false;
  v_delivery boolean := false;
  v_claimed_today boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'login_required');
  end if;

  if p_expected_user_id is distinct from v_user_id then
    return jsonb_build_object('ok', false, 'reason', 'account_changed');
  end if;

  select u.is_anonymous into v_is_anonymous
    from auth.users as u where u.id = v_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'login_required');
  end if;
  if v_is_anonymous is distinct from false then
    return jsonb_build_object('ok', false, 'reason', 'registered_account_required');
  end if;

  if p_claim is true then
    if p_request_id is null or p_delivery_ref is null
      or length(p_delivery_ref) < 1 or length(p_delivery_ref) > 512 then
      return jsonb_build_object('ok', false, 'reason', 'invalid_request');
    end if;
    -- Serialise claims/retries for this account, including across midnight.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_user_id::text, 0)
    );
  end if;

  v_now := clock_timestamp();
  v_day := (v_now at time zone 'UTC')::date;
  v_next_reset := ((v_day + 1)::timestamp at time zone 'UTC');

  if p_claim is true then
    -- Retry a known request, even if it was accepted on an earlier day.
    select c.* into v_row
      from public.holmes_daily_hint_claims as c
      where c.user_id = v_user_id and c.request_id = p_request_id;
    if found then
      if v_row.delivery_ref is distinct from p_delivery_ref then
        return jsonb_build_object('ok', false, 'reason', 'different_save');
      end if;
      v_delivery := true;
    else
      insert into public.holmes_daily_hint_claims (
        user_id, claim_day, claimed_at, request_id, delivery_ref
      ) values (
        v_user_id, v_day, v_now, p_request_id, p_delivery_ref
      ) on conflict (user_id, claim_day) do nothing
      returning * into v_row;
      v_new := found;
      v_delivery := v_new;
    end if;
  end if;

  select exists (
    select 1 from public.holmes_daily_hint_claims as c
    where c.user_id = v_user_id and c.claim_day = v_day
  ) into v_claimed_today;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'new_claim', v_new,
    'delivery_allowed', v_delivery,
    'claim_day', case when v_delivery then v_row.claim_day else v_day end,
    'claimed_today', v_claimed_today,
    'available', not v_claimed_today,
    'next_reset_at', v_next_reset,
    'timezone', 'UTC'
  );
end;
$function$;

alter table public.holmes_daily_hint_claims enable row level security;
revoke all privileges on table public.holmes_daily_hint_claims
  from public, anon, authenticated;
revoke all privileges on function public.holmes_daily_hint(boolean, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.holmes_daily_hint(boolean, uuid, text, uuid)
  to authenticated;

notify pgrst, 'reload schema';
commit;
