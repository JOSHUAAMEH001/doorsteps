-- =============================================================================
-- DOORS dashboard foundation
-- -----------------------------------------------------------------------------
-- STATUS: NOT APPLIED. Review, test on a Supabase branch, then apply.
--
-- Everything here is additive: new columns (with safe defaults), new tables,
-- new policies and one extra trigger. Nothing is dropped and no existing rows
-- are changed. Each section can be applied on its own.
--
-- Unlocks the dashboard features currently shown as "Needs database migration":
--   1. Order workflow enforced in the database (not just the app)
--   2. Vendor store controls (open/close, hours, phone) + admin vendor management
--   3. Vendor menu management (availability, price, new items)
--   4. Rider online status + contact phone
--   5. Audit log of order changes
--   6. Support tickets / complaints
--   7. Admin-editable site settings
--   8. Security advisor fixes
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Order workflow guard
-- The existing orders_guard trigger limits WHICH columns each role may change.
-- This adds WHEN: each role may only move an order one valid step forward.
-- Closes two gaps found in review:
--   * a vendor could cancel/"confirm" an order a rider already picked up
--   * a rider could mark an unclaimed order delivered without accepting it
-- Admins and server-side (service role) updates are not restricted here.
-- -----------------------------------------------------------------------------
create or replace function public.orders_workflow_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare r text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if auth.uid() is null or current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  r := public.my_role();

  if r = 'vendor' then
    if not (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) then
      raise exception 'Vendors can only accept or reject new orders.';
    end if;
  elsif r = 'rider' then
    if not (
      (old.status = 'confirmed' and new.status = 'assigned' and old.rider_id is null and new.rider_id = auth.uid())
      or (old.status = 'assigned' and new.status = 'picked_up' and old.rider_id = auth.uid())
      or (old.status = 'picked_up' and new.status = 'delivered' and old.rider_id = auth.uid())
    ) then
      raise exception 'That delivery step is not allowed.';
    end if;
  else
    raise exception 'Not allowed to change this order.';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_workflow_guard on public.orders;
create trigger orders_workflow_guard
  before update on public.orders
  for each row execute function public.orders_workflow_guard();

-- -----------------------------------------------------------------------------
-- 2. Vendor store controls + admin vendor management
-- -----------------------------------------------------------------------------
alter table public.vendors
  add column if not exists is_open boolean not null default true,
  add column if not exists phone text,
  add column if not exists address text,
  -- e.g. {"mon":[["08:00","21:00"]], "sun":[]}
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'suspended'));

-- Admins see every vendor (including hidden/pending), not just active ones.
create policy "admin reads all vendors" on public.vendors
  for select to authenticated using (public.is_admin());
create policy "admin manages vendors" on public.vendors
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin adds vendors" on public.vendors
  for insert to authenticated with check (public.is_admin());

-- Vendors can read their own store even when hidden, and update only it.
create policy "vendor reads own store" on public.vendors
  for select to authenticated using (public.my_role() = 'vendor' and id = public.my_vendor_id());
create policy "vendor updates own store" on public.vendors
  for update to authenticated
  using (public.my_role() = 'vendor' and id = public.my_vendor_id())
  with check (public.my_role() = 'vendor' and id = public.my_vendor_id());

-- Vendors may only change operational fields, never listing/approval/rating.
create or replace function public.vendors_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.name is distinct from old.name
     or new.category is distinct from old.category
     or new.is_active is distinct from old.is_active
     or new.rating is distinct from old.rating
     or new.approval_status is distinct from old.approval_status
     or new.created_at is distinct from old.created_at then
    raise exception 'You can only change opening status, hours and contact details.';
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_guard on public.vendors;
create trigger vendors_guard before update on public.vendors
  for each row execute function public.vendors_guard();

-- -----------------------------------------------------------------------------
-- 3. Vendor menu management
-- -----------------------------------------------------------------------------
alter table public.menu_items
  add column if not exists stock_quantity integer check (stock_quantity is null or stock_quantity >= 0);

create policy "vendor reads own menu" on public.menu_items
  for select to authenticated using (public.my_role() = 'vendor' and vendor_id = public.my_vendor_id());
create policy "vendor updates own menu" on public.menu_items
  for update to authenticated
  using (public.my_role() = 'vendor' and vendor_id = public.my_vendor_id())
  with check (public.my_role() = 'vendor' and vendor_id = public.my_vendor_id());
create policy "vendor adds own menu items" on public.menu_items
  for insert to authenticated
  with check (public.my_role() = 'vendor' and vendor_id = public.my_vendor_id());
create policy "admin manages menu" on public.menu_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Rider online status + phone
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists is_online boolean not null default false,
  add column if not exists online_changed_at timestamptz;

-- Riders may flip only their own online flag / phone. Role and vendor_id stay locked.
create policy "user updates own contact and status" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.vendor_id is distinct from old.vendor_id
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'You can only change your name, phone and online status.';
  end if;
  if new.is_online is distinct from old.is_online then
    new.online_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- -----------------------------------------------------------------------------
-- 5. Audit log (append-only, written by trigger, readable by admins only)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users (id),
  actor_role text,
  entity text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb
);
alter table public.audit_logs enable row level security;
create policy "admin reads audit log" on public.audit_logs
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: only the trigger below (security definer) writes.

create or replace function public.audit_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status or new.rider_id is distinct from old.rider_id then
    insert into public.audit_logs (actor_id, actor_role, entity, entity_id, action, old_value, new_value)
    values (
      auth.uid(),
      public.my_role(),
      'order',
      new.id,
      case when new.rider_id is distinct from old.rider_id then 'rider_change' else 'status_change' end,
      jsonb_build_object('status', old.status, 'rider_id', old.rider_id),
      jsonb_build_object('status', new.status, 'rider_id', new.rider_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after update on public.orders
  for each row execute function public.audit_order_change();

-- -----------------------------------------------------------------------------
-- 6. Support tickets / complaints
-- -----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id),
  order_id uuid references public.orders (id),
  category text not null default 'other' check (category in ('order', 'delivery', 'payment', 'vendor', 'rider', 'account', 'other')),
  subject text not null check (char_length(subject) between 3 and 140),
  body text not null check (char_length(body) between 3 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolution text
);
alter table public.support_tickets enable row level security;
create policy "user creates own ticket" on public.support_tickets
  for insert to authenticated with check (created_by = auth.uid());
create policy "user reads own tickets" on public.support_tickets
  for select to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "admin updates tickets" on public.support_tickets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Admin-editable site settings (RLS is on with no policies today)
-- -----------------------------------------------------------------------------
create policy "admin reads settings" on public.site_settings
  for select to authenticated using (public.is_admin());
create policy "admin updates settings" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. Security advisor fixes
-- -----------------------------------------------------------------------------
-- Mutable search_path on a trigger function.
alter function public.set_rider_earning() set search_path = public;

-- Trigger-only functions should not be callable through /rest/v1/rpc.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.order_items_guard() from anon, authenticated, public;
revoke execute on function public.order_items_recalc() from anon, authenticated, public;
revoke execute on function public.apply_approved_role() from anon, authenticated, public;
revoke execute on function public.orders_workflow_guard() from anon, authenticated, public;
revoke execute on function public.vendors_guard() from anon, authenticated, public;
revoke execute on function public.profiles_guard() from anon, authenticated, public;
revoke execute on function public.audit_order_change() from anon, authenticated, public;
-- Note: is_admin(), my_role(), my_vendor_id(), can_place_orders() and
-- ordering_status() are used by RLS policies and the app, so they stay callable.
-- They only reveal the caller's own role, which is not sensitive.

commit;

-- Also recommended (Supabase dashboard, not SQL):
--   Authentication → Settings → enable "Leaked password protection".
