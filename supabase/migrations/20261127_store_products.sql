-- Agency Catalog: two products sold with PayPal (and with medals in the game).
-- Ids must match paypalProductId in systems/StoreEntitlements.js.
-- Change amount_cents here to change the PayPal price (and priceEur in StoreEntitlements.js to match the label).
insert into public.store_sandbox_products (id, title, currency, amount_cents, active)
values
  ('dead_mail', 'Dead Mail', 'EUR', 999, true),
  ('music_pack_noir_1', 'Noir Music Pack', 'EUR', 999, true)
on conflict (id) do update
  set title = excluded.title,
      currency = excluded.currency,
      amount_cents = excluded.amount_cents,
      active = excluded.active;

-- Generic version of store_sandbox_complete_order: checks the order against the product row
-- instead of the hard-coded 1 EUR test product.
create or replace function public.store_complete_order(
  p_order_id uuid, p_user_id uuid, p_paypal_order_id text, p_capture_id text
) returns void
language plpgsql
set search_path to ''
as $$
declare
  v_order public.store_sandbox_orders%rowtype;
begin
  select * into v_order
  from public.store_sandbox_orders
  where id = p_order_id and user_id = p_user_id
  for update;

  if not found then raise exception 'Order not found'; end if;
  if v_order.paypal_order_id is distinct from p_paypal_order_id then raise exception 'PayPal order mismatch'; end if;
  if p_capture_id is null or length(trim(p_capture_id)) = 0 then raise exception 'Capture ID required'; end if;

  if not exists (
    select 1 from public.store_sandbox_products p
    where p.id = v_order.product_id
      and p.currency = v_order.currency
      and p.amount_cents = v_order.amount_cents
  ) then
    raise exception 'Order does not match the product';
  end if;

  if v_order.status not in ('CREATED', 'APPROVED', 'PENDING', 'COMPLETED') then
    raise exception 'Order cannot be completed';
  end if;
  if v_order.paypal_capture_id is not null and v_order.paypal_capture_id <> p_capture_id then
    raise exception 'Capture mismatch';
  end if;

  update public.store_sandbox_orders
  set status = 'COMPLETED', paypal_capture_id = p_capture_id
  where id = v_order.id;

  insert into public.store_sandbox_entitlements (user_id, product_id, order_id)
  values (v_order.user_id, v_order.product_id, v_order.id)
  on conflict (user_id, product_id) do nothing;

  -- A revoked entitlement is never restored automatically.
  if not exists (
    select 1 from public.store_sandbox_entitlements
    where user_id = v_order.user_id and product_id = v_order.product_id and revoked_at is null
  ) then
    raise exception 'Entitlement requires manual review';
  end if;
end;
$$;

revoke all on function public.store_complete_order(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.store_complete_order(uuid, uuid, text, text) to service_role;

-- Old sandbox-only test setup (1 EUR test product) is no longer used.
delete from public.store_sandbox_orders
where product_id = 'sandbox_test_expansion' and status = 'CREATED' and paypal_capture_id is null;
delete from public.store_sandbox_products where id = 'sandbox_test_expansion';
drop function if exists public.store_sandbox_complete_order(uuid, uuid, text, text);
