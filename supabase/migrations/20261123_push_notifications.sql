-- =============================================================================
-- Push notifications + in-app notification centre
-- STATUS: written 2026-11-23 (owner: "push notification should work now").
--
-- Additive only: three new tables, helper functions, one AFTER trigger on orders,
-- and the pg_net extension (lets the database call the "send-push" Edge Function).
-- Nothing existing is dropped or changed.
--
-- How it works:
--   1. An order is placed or changes status -> notify_order_event() writes rows into
--      public.notifications for the customer, the restaurant's staff, the rider and admins.
--      It is wrapped in its own exception block: a notification problem can NEVER block,
--      fail or undo an order change.
--   2. New notification rows queue one HTTP call (pg_net, sent after commit) to the
--      "send-push" Edge Function, which delivers them as Web Push to every device the
--      person turned notifications on for. The function authenticates the call with a
--      random secret that lives only in the database (push_config.kick_secret).
--   3. VAPID keys (the app's push identity) are created by the Edge Function on first run
--      and stored in push_config, which nobody but the service role can read. The public
--      half is served by push_public_key(). The private key never leaves Supabase.
--
-- Security:
--   - notifications: users can only READ their own; marking read goes through
--     mark_my_notifications_read(). No one can insert/edit/delete rows from the app.
--   - push_subscriptions: users can read their own; saving/removing goes through
--     SECURITY DEFINER functions that always use auth.uid().
--   - push_config: RLS on, no policies, all grants revoked: service role only.
--
-- Rollback:
--   drop trigger orders_notify on public.orders;
--   drop trigger orders_notify_new on public.orders;
--   drop trigger notifications_push_kick on public.notifications;
--   drop function public.notify_order_event(), public.notify_new_order(), public.notifications_kick(), public.push_kick(),
--     public.add_notification(uuid, text, text, uuid, text, boolean),
--     public.add_admin_notification(text, text, uuid), public.add_vendor_notification(uuid, text, text, uuid),
--     public.add_rider_broadcast(text, text, uuid),
--     public.push_claim(integer), public.push_public_key(), public.save_push_subscription(text, text, text, text),
--     public.remove_push_subscription(text), public.mark_my_notifications_read(uuid[]);
--   drop table public.push_config, public.push_subscriptions, public.notifications;  -- deletes notification history
--   (pg_net can stay installed; it does nothing on its own.)
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------- tables -----
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 140),
  body text not null check (char_length(body) <= 400),
  order_id uuid references public.orders(id) on delete set null,
  -- In-app place to open when tapped, always a path on the DOORS site (e.g. '/?open=orders').
  link text check (link is null or (link like '/%' and char_length(link) <= 200)),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push boolean not null default true,
  pushed_at timestamptz,
  push_attempts smallint not null default 0
);
create index if not exists notifications_user_recent on public.notifications (user_id, created_at desc);
create index if not exists notifications_push_queue on public.notifications (created_at) where push and pushed_at is null;
alter table public.notifications enable row level security;
drop policy if exists "user reads own notifications" on public.notifications;
create policy "user reads own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.notifications from anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failures smallint not null default 0
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "user reads own push subscriptions" on public.push_subscriptions;
create policy "user reads own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.push_subscriptions from anon, authenticated;

create table if not exists public.push_config (
  id boolean primary key default true check (id),
  vapid_public_key text,
  vapid_private_key text,
  -- ~244 random bits from two v4 UUIDs (core function, no extension needed).
  kick_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (id) values (true) on conflict (id) do nothing;

-- -------------------------------------------------------- app functions -----
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public as $$
  select vapid_public_key from public.push_config where id
$$;
revoke all on function public.push_public_key() from public;
grant execute on function public.push_public_key() to anon, authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please log in again.'; end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or char_length(p_endpoint) > 1000
     or coalesce(char_length(p_p256dh), 0) not between 20 and 200
     or coalesce(char_length(p_auth), 0) not between 8 and 100 then
    raise exception 'This device could not be registered for notifications.';
  end if;
  -- One phone = one subscription. If someone else used this phone before, it moves to the current user.
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, failures = 0;
  -- Keep each person's 10 most recent devices.
  delete from public.push_subscriptions
  where user_id = uid
    and id not in (select id from public.push_subscriptions where user_id = uid order by created_at desc limit 10);
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.remove_push_subscription(text) to authenticated;

create or replace function public.mark_my_notifications_read(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.mark_my_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;

-- ------------------------------------------------ sender (service role) -----
-- Hands out up to p_limit unsent notifications and marks them as being sent.
create or replace function public.push_claim(p_limit integer default 50)
returns table (id uuid, user_id uuid, title text, body text, link text, order_id uuid)
language sql security definer set search_path = public as $$
  update public.notifications n
     set pushed_at = now(), push_attempts = n.push_attempts + 1
   where n.id in (
     select q.id from public.notifications q
      where q.push and q.pushed_at is null and q.push_attempts < 3
        and q.created_at > now() - interval '1 day'
      order by q.created_at
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked)
  returning n.id, n.user_id, n.title, n.body, n.link, n.order_id
$$;
revoke all on function public.push_claim(integer) from public, anon, authenticated;
grant execute on function public.push_claim(integer) to service_role;

-- Asks the Edge Function to send whatever is queued. Queued by pg_net, sent after commit.
create or replace function public.push_kick()
returns void language plpgsql security definer set search_path = public as $$
declare secret text;
begin
  select kick_secret into secret from public.push_config where id;
  perform net.http_post(
    url := 'https://baskdegavbbysopgoetv.supabase.co/functions/v1/send-push',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-doors-push-key', secret),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'push_kick failed: %', sqlerrm;
end;
$$;
revoke all on function public.push_kick() from public, anon, authenticated;

create or replace function public.notifications_kick()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from new_rows where push) then
    perform public.push_kick();
  end if;
  return null;
end;
$$;
revoke all on function public.notifications_kick() from public, anon, authenticated;

drop trigger if exists notifications_push_kick on public.notifications;
create trigger notifications_push_kick after insert on public.notifications
  referencing new table as new_rows
  for each statement execute function public.notifications_kick();

-- --------------------------------------------------- order notifications -----
create or replace function public.add_notification(p_user uuid, p_title text, p_body text, p_order uuid, p_link text, p_push boolean default true)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, order_id, link, push)
  select p_user, left(p_title, 140), left(p_body, 400), p_order, p_link, p_push
  where p_user is not null
$$;
revoke all on function public.add_notification(uuid, text, text, uuid, text, boolean) from public, anon, authenticated;

create or replace function public.add_admin_notification(p_title text, p_body text, p_order uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, order_id, link)
  select p.id, left(p_title, 140), left(p_body, 400), p_order, '/'
  from public.profiles p where p.role = 'admin'
$$;
revoke all on function public.add_admin_notification(text, text, uuid) from public, anon, authenticated;

create or replace function public.add_vendor_notification(p_vendor uuid, p_title text, p_body text, p_order uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, order_id, link)
  select p.id, left(p_title, 140), left(p_body, 400), p_order, '/'
  from public.profiles p where p.role = 'vendor' and p.vendor_id = p_vendor and p_vendor is not null
$$;
revoke all on function public.add_vendor_notification(uuid, text, text, uuid) from public, anon, authenticated;

-- Riders pick delivery requests themselves, so every rider hears about a new one.
create or replace function public.add_rider_broadcast(p_title text, p_body text, p_order uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, order_id, link)
  select p.id, left(p_title, 140), left(p_body, 400), p_order, '/'
  from public.profiles p where p.role = 'rider'
$$;
revoke all on function public.add_rider_broadcast(text, text, uuid) from public, anon, authenticated;

-- New orders. Runs at the END of the transaction that created the order (deferred), because
-- place_order() inserts the order first and its items (and final total) right after.
create or replace function public.notify_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o record;
  vname text;
  money text;
  visible boolean;
begin
  -- Never let a notification problem block or undo an order.
  begin
    select * into o from public.orders where id = new.id;
    if not found then return null; end if;
    select v.name into vname from public.vendors v where v.id = o.vendor_id;
    vname := coalesce(nullif(btrim(vname), ''), 'the restaurant');
    money := '₦' || to_char(coalesce(o.total, 0), 'FM999,999,990');
    visible := o.payment_method = 'cash' or o.payment_status = 'paid';

    -- The customer just placed it: keep it in their notification list, no push.
    perform public.add_notification(o.user_id, 'Order ' || o.order_code || ' placed',
      case when visible
        then 'We''ve sent your order to ' || vname || '.'
        else 'Pay by transfer with ' || o.order_code || ' as the description. Your order goes to ' || vname || ' once your payment is confirmed.'
      end,
      o.id, '/?open=orders', false);
    perform public.add_admin_notification('New order ' || o.order_code,
      vname || ' · ' || money || case when visible then '' else ' · waiting for transfer' end, o.id);
    if visible then
      perform public.add_vendor_notification(o.vendor_id, 'New order ' || o.order_code, money || ' · Open DOORS to accept it.', o.id);
    end if;
  exception when others then
    raise warning 'notify_new_order failed for order %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.notify_new_order() from public, anon, authenticated;

-- Order changes (status, payment confirmed, rider assigned).
create or replace function public.notify_order_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  code text := coalesce(new.order_code, 'your order');
  vname text;
  money text := '₦' || to_char(coalesce(new.total, 0), 'FM999,999,990');
  visible_now boolean := new.payment_method = 'cash' or new.payment_status = 'paid';
  visible_before boolean := old.payment_method = 'cash' or old.payment_status = 'paid';
begin
  -- Never let a notification problem block or undo an order change.
  begin
    select v.name into vname from public.vendors v where v.id = new.vendor_id;
    vname := coalesce(nullif(btrim(vname), ''), 'the restaurant');

    -- Transfer/card payment confirmed: the restaurant can now see the order.
    if visible_now and not visible_before and new.status = 'pending' then
      perform public.add_notification(new.user_id, 'Payment confirmed',
        'We''ve received your payment for ' || code || ' and sent your order to ' || vname || '.', new.id, '/?open=orders');
      perform public.add_vendor_notification(new.vendor_id, 'New order ' || code, money || ' · Open DOORS to accept it.', new.id);
    end if;

    if new.status is distinct from old.status then
      if new.status = 'confirmed' then
        perform public.add_notification(new.user_id, vname || ' accepted your order', 'Order ' || code || ' is being prepared.', new.id, '/?open=orders');
        perform public.add_admin_notification(vname || ' accepted ' || code, 'Waiting for a rider.', new.id);
        if new.rider_id is null then
          perform public.add_rider_broadcast('New delivery request',
            'Pick up from ' || vname || ' and deliver to ' || coalesce(nullif(btrim(new.dropoff_location), ''), 'the customer') || '. Open DOORS to accept it.', new.id);
        end if;
      elsif new.status = 'assigned' then
        perform public.add_notification(new.user_id, 'A rider is on the way to ' || vname, 'Your rider will pick up ' || code || ' soon.', new.id, '/?open=orders');
      elsif new.status = 'picked_up' then
        perform public.add_notification(new.user_id, 'Your order is on the way', 'Your rider has picked up ' || code || ' from ' || vname || '.', new.id, '/?open=orders');
      elsif new.status = 'delivered' then
        perform public.add_notification(new.user_id, 'Order delivered', code || ' has been delivered. Enjoy!', new.id, '/?open=orders');
      elsif new.status = 'cancelled' then
        perform public.add_notification(new.user_id, 'Order ' || code || ' was cancelled', 'Call or WhatsApp DOORS if you have any questions.', new.id, '/?open=orders');
        perform public.add_admin_notification('Order ' || code || ' cancelled', vname, new.id);
      end if;
    end if;

    -- Given a delivery by someone else (an admin). Riders who accept a request themselves aren't notified.
    if new.rider_id is not null and new.rider_id is distinct from old.rider_id and auth.uid() is distinct from new.rider_id then
      perform public.add_notification(new.rider_id, 'New delivery ' || code,
        'Pick up from ' || vname || ' and deliver to ' || coalesce(nullif(btrim(new.dropoff_location), ''), 'the customer') || '.', new.id, '/');
    end if;
  exception when others then
    raise warning 'notify_order_event failed for order %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.notify_order_event() from public, anon, authenticated;

drop trigger if exists orders_notify_new on public.orders;
create constraint trigger orders_notify_new after insert on public.orders
  deferrable initially deferred
  for each row execute function public.notify_new_order();

drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after update on public.orders
  for each row execute function public.notify_order_event();
