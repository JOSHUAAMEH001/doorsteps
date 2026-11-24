-- =============================================================================
-- Safe order placement: atomic + idempotent, fees decided by the server
-- STATUS: APPLIED to production on 2026-11-22 (owner approved) as "safe_order_placement",
--         plus "safe_order_placement_fee_reader" (section 2b fix: customers can't read
--         site_settings under RLS, so the fee is read through current_delivery_fee()).
--
-- Additive only. Nothing is dropped; no existing rows are changed.
-- Rollback: drop function public.place_order(jsonb); drop function public.current_delivery_fee();
--           drop index if exists public.orders_user_request_uidx;
--           alter table public.orders drop column client_request_id;   (new, empty column)
--           alter table public.site_settings drop column delivery_fee; (new column)
--
-- Why:
--  * Today the app inserts the order and its items in two separate requests. If the
--    second fails, the "cleanup" delete is blocked by RLS (customers can't delete orders),
--    leaving an order with no items. A double tap or network retry can also create two
--    orders. The delivery fee is also taken from the customer's device.
--  * place_order() does it all in ONE transaction (all-or-nothing), returns the same order
--    if the same checkout attempt is sent twice, and reads the delivery fee from settings.
--  * It runs as the signed-in customer (SECURITY INVOKER), so every existing protection
--    still applies: RLS policies, orders_guard (ordering open, status/payment reset,
--    user_id = auth.uid()), order_items_guard (real menu item, available, same vendor,
--    price and name copied from the menu) and order_items_recalc (subtotal/total).
-- =============================================================================

-- 1. One checkout attempt = one order.
alter table public.orders add column if not exists client_request_id uuid;
create unique index if not exists orders_user_request_uidx
  on public.orders (user_id, client_request_id) where client_request_id is not null;

-- 2. Delivery fee is set by DOORS (admin), never by the customer's device. Default 0 = today's behaviour.
alter table public.site_settings add column if not exists delivery_fee numeric(12,2) not null default 0
  check (delivery_fee >= 0 and delivery_fee <= 100000);

-- 2b. site_settings is deny-all under RLS (no policies), so a customer can't read it.
--     This helper returns ONLY the delivery fee (nothing else from site_settings).
create or replace function public.current_delivery_fee()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.delivery_fee from public.site_settings s where s.id), 0)
$$;
revoke all on function public.current_delivery_fee() from public, anon;
grant execute on function public.current_delivery_fee() to authenticated;

-- 3. Atomic, idempotent order placement.
create or replace function public.place_order(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request uuid;
  v_vendor uuid;
  v_vendor_name text;
  v_method text := coalesce(p->>'payment_method', 'cash');
  v_name text := left(btrim(coalesce(p->>'customer_name', '')), 80);
  v_phone text := left(btrim(coalesce(p->>'phone', '')), 20);
  v_dropoff text := left(btrim(coalesce(p->>'dropoff_location', '')), 300);
  v_note text := nullif(left(btrim(coalesce(p->>'dropoff_note', '')), 300), '');
  v_lat double precision;
  v_lng double precision;
  v_fee numeric(12,2);
  v_items jsonb := p->'items';
  v_item jsonb;
  v_count int;
  v_descr text;
  v_order record;
  v_existing record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_signed_in', 'error', 'Please sign in to place your order.');
  end if;

  begin
    v_request := (p->>'request_id')::uuid;
    v_vendor := (p->>'vendor_id')::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'error', 'Something is wrong with this checkout. Please refresh and try again.');
  end;
  if v_request is null or v_vendor is null then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'error', 'Something is wrong with this checkout. Please refresh and try again.');
  end if;

  -- Same checkout attempt sent again (double tap, retry after a network error): return the existing order.
  select id, order_code, total into v_existing from public.orders where user_id = v_uid and client_request_id = v_request;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'order_code', v_existing.order_code, 'total', v_existing.total);
  end if;

  if v_method not in ('cash', 'transfer') then
    return jsonb_build_object('ok', false, 'code', 'payment_method', 'error', 'Card payment isn''t available yet. Please choose cash on delivery or bank transfer.');
  end if;
  if char_length(v_name) < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'error', 'Please add your name to your account.');
  end if;
  if public.recruit_phone(v_phone) is null then
    return jsonb_build_object('ok', false, 'code', 'phone', 'error', 'Enter a valid Nigerian phone number for the rider.');
  end if;
  if char_length(v_dropoff) < 3 then
    return jsonb_build_object('ok', false, 'code', 'address', 'error', 'Add your delivery address.');
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 30 then
    return jsonb_build_object('ok', false, 'code', 'cart', 'error', 'Your cart is empty or too large. Please review your cart.');
  end if;

  -- Only keep a pin that is a real coordinate inside Nigeria.
  begin
    v_lat := (p->>'dropoff_lat')::double precision;
    v_lng := (p->>'dropoff_lng')::double precision;
  exception when others then
    v_lat := null; v_lng := null;
  end;
  if v_lat is null or v_lng is null or v_lat not between 4 and 14 or v_lng not between 2.5 and 15 then
    v_lat := null; v_lng := null;
  end if;

  select name into v_vendor_name from public.vendors where id = v_vendor and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'vendor', 'error', 'This restaurant isn''t taking orders right now.');
  end if;

  if not public.can_place_orders() then
    return jsonb_build_object('ok', false, 'code', 'closed', 'error', 'DOORS has not launched yet. Ordering opens soon.');
  end if;

  v_fee := public.current_delivery_fee();

  -- Human-readable summary built from the menu (not from the device). Customers can't
  -- update orders afterwards (orders_guard), so it's set at insert time.
  select string_agg((x->>'quantity') || 'x ' || m.name, ', ' order by m.name)
    into v_descr
    from jsonb_array_elements(v_items) x
    join public.menu_items m on m.id::text = x->>'menu_item_id' and m.vendor_id = v_vendor;
  if v_descr is null then
    return jsonb_build_object('ok', false, 'code', 'cart', 'error', 'Some items are no longer available. Please refresh your cart.');
  end if;

  -- Everything below is one transaction: if any item is invalid, nothing is saved.
  insert into public.orders (customer_name, phone, pickup_location, dropoff_location, dropoff_lat, dropoff_lng, dropoff_note,
                             item_description, vendor_id, subtotal, delivery_fee, total, payment_method, client_request_id)
  values (v_name, v_phone, v_vendor_name, v_dropoff, v_lat, v_lng, v_note,
          left(v_descr, 500), v_vendor, 0, v_fee, v_fee, v_method, v_request)
  returning id, order_code into v_order;

  v_count := 0;
  for v_item in select * from jsonb_array_elements(v_items) loop
    if (v_item->>'quantity') !~ '^\d{1,2}$' or (v_item->>'quantity')::int not between 1 and 50 then
      raise exception using errcode = 'P0001', message = 'Quantity is too large.';
    end if;
    -- name and unit_price are overwritten from the menu by order_items_guard.
    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
    values (v_order.id, (v_item->>'menu_item_id')::uuid, '', 0, (v_item->>'quantity')::int);
    v_count := v_count + 1;
  end loop;

  select order_code, total into v_existing from public.orders where id = v_order.id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'order_code', v_existing.order_code, 'total', v_existing.total, 'items', v_count);

exception
  when unique_violation then
    -- Two identical requests raced each other: return the one that won.
    select order_code, total into v_existing from public.orders where user_id = v_uid and client_request_id = v_request;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'order_code', v_existing.order_code, 'total', v_existing.total);
    end if;
    raise;
end;
$$;

revoke all on function public.place_order(jsonb) from public, anon;
grant execute on function public.place_order(jsonb) to authenticated;
