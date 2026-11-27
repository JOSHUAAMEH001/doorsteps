-- =============================================================================
-- Online payment with Squad (GTCO): let place_order accept payment_method 'card'.
-- STATUS: NOT APPLIED. Needs the owner's approval before it is run on production.
--
-- What changes: ONE check inside public.place_order. Before, it refused 'card'
-- ("Card payment isn't available yet"). After, it accepts 'cash', 'transfer' or 'card'.
-- 'card' means "pay online with Squad" (card, bank transfer or USSD on Squad's page).
-- No tables, columns, policies, triggers or rows change. The orders.payment_method check
-- constraint already allows 'card'.
--
-- Why it is safe:
--   * A 'card' order is created unpaid (orders_guard forces payment_status = 'unpaid').
--   * Restaurants cannot see it until payment_status = 'paid' (existing prepaid RLS gate).
--   * Only trusted server code marks it paid, and only after Squad's verify API confirms the
--     payment and the amount (lib/payments/squad-confirm.ts).
--   * The app only offers "Pay online" once SQUAD_SECRET_KEY is set in Vercel.
--
-- The function body below is the production body as of 2026-11-27 (md5 of prosrc
-- 9a5f75ba7f22f039ae04cb7bc957b56d), with only the payment-method check edited.
--
-- Rollback: run the same statement with the check restored to
--   if v_method not in ('cash', 'transfer') then
--     return jsonb_build_object('ok', false, 'code', 'payment_method', 'error', 'Card payment isn''t available yet. Please choose cash on delivery or bank transfer.');
-- =============================================================================

create or replace function public.place_order(p jsonb)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
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

  select id, order_code, total into v_existing from public.orders where user_id = v_uid and client_request_id = v_request;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'order_code', v_existing.order_code, 'total', v_existing.total);
  end if;

  if v_method not in ('cash', 'transfer', 'card') then
    return jsonb_build_object('ok', false, 'code', 'payment_method', 'error', 'Please choose a payment method: pay online, cash on delivery or bank transfer.');
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

  select string_agg((x->>'quantity') || 'x ' || m.name, ', ' order by m.name)
    into v_descr
    from jsonb_array_elements(v_items) x
    join public.menu_items m on m.id::text = x->>'menu_item_id' and m.vendor_id = v_vendor;
  if v_descr is null then
    return jsonb_build_object('ok', false, 'code', 'cart', 'error', 'Some items are no longer available. Please refresh your cart.');
  end if;

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
    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
    values (v_order.id, (v_item->>'menu_item_id')::uuid, '', 0, (v_item->>'quantity')::int);
    v_count := v_count + 1;
  end loop;

  select order_code, total into v_existing from public.orders where id = v_order.id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'order_code', v_existing.order_code, 'total', v_existing.total, 'items', v_count);

exception
  when unique_violation then
    select order_code, total into v_existing from public.orders where user_id = v_uid and client_request_id = v_request;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'order_code', v_existing.order_code, 'total', v_existing.total);
    end if;
    raise;
end;
$function$;
