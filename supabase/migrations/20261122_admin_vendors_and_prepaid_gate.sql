-- =============================================================================
-- 1. Admins can manage vendors (Store editor).
-- 2. Restaurants only see prepaid orders after payment is confirmed.
-- STATUS: APPLIED to production on 2026-11-22 (owner approved both) as
--         "admin_vendors_and_prepaid_gate".
--
-- Nothing is dropped and no rows are changed.
--
-- 1. vendors had a single policy ("Anyone can view active vendors"), so admins could
--    not see hidden vendors or change names/banners. New admin-only policies:
--    read all, update, add. No delete (vendors linked to past orders must stay).
--
-- 2. Before: a restaurant saw every order except unpaid 'paystack' ones, so it saw
--    bank-transfer orders before DOORS knew the money had arrived. After: it sees
--    cash orders straight away and any prepaid order (transfer now, card later)
--    only once payment_status = 'paid' (Admin → Payments → "Confirm payment").
--
-- Rollback (restores the old rules exactly):
--   drop policy "admin reads all vendors" on public.vendors;
--   drop policy "admin updates vendors" on public.vendors;
--   drop policy "admin adds vendors" on public.vendors;
--   alter policy "vendor reads own orders" on public.orders using ((my_role() = 'vendor'::text) AND (vendor_id = my_vendor_id()) AND ((payment_method <> 'paystack'::text) OR (payment_status = 'paid'::text)));
--   alter policy "vendor updates own orders" on public.orders using ((my_role() = 'vendor'::text) AND (vendor_id = my_vendor_id()) AND ((payment_method <> 'paystack'::text) OR (payment_status = 'paid'::text)));
--   alter policy "vendor reads own order items" on public.order_items using ((my_role() = 'vendor'::text) AND (EXISTS (SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND (o.vendor_id = my_vendor_id()) AND ((o.payment_method <> 'paystack'::text) OR (o.payment_status = 'paid'::text))))));
-- =============================================================================

-- 1. Admin vendor management
create policy "admin reads all vendors" on public.vendors
  for select to authenticated using (public.is_admin());
create policy "admin updates vendors" on public.vendors
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin adds vendors" on public.vendors
  for insert to authenticated with check (public.is_admin());

-- 2. Prepaid orders reach the restaurant only after payment is confirmed
alter policy "vendor reads own orders" on public.orders
  using ((public.my_role() = 'vendor') and (vendor_id = public.my_vendor_id())
         and (payment_method = 'cash' or payment_status = 'paid'));

alter policy "vendor updates own orders" on public.orders
  using ((public.my_role() = 'vendor') and (vendor_id = public.my_vendor_id())
         and (payment_method = 'cash' or payment_status = 'paid'));

alter policy "vendor reads own order items" on public.order_items
  using ((public.my_role() = 'vendor') and exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and o.vendor_id = public.my_vendor_id()
       and (o.payment_method = 'cash' or o.payment_status = 'paid')));
