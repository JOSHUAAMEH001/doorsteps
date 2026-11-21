-- =============================================================================
-- Admin-editable form choices + rider form simplification
-- Additive / relaxing only. Nothing is dropped; existing rows are untouched.
--
-- 1. form_options: lists shown in the /join forms (waitlist areas, vendor
--    categories). Anyone can read them; only admins can change them, from
--    Admin -> Pre-launch sign-ups -> Form choices.
-- 2. Rider applications: "Do you have the vehicle?" was removed from the form,
--    so vehicle_access becomes optional, and Tricycle (Keke) is no longer
--    offered for new applications.
-- =============================================================================

create table if not exists public.form_options (
  key text primary key check (key in ('waitlist_areas', 'vendor_categories')),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 1 and 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
alter table public.form_options enable row level security;
create policy "anyone reads form options" on public.form_options for select to anon, authenticated using (true);
create policy "admin updates form options" on public.form_options for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Current lists, as approved on 2026-11-21 (areas to be edited by the DOORS team).
insert into public.form_options (key, options) values
  ('waitlist_areas', '["ESUT campus (hostel)", "ESUT staff quarters", "Agbani town", "Amechi Uwani / nearby"]'::jsonb),
  ('vendor_categories', '["Restaurant", "Food vendor / Buka", "Supermarket", "Grocery store", "Bakery & snacks", "Drinks & smoothies"]'::jsonb)
on conflict (key) do nothing;

alter table public.rider_applications alter column vehicle_access drop not null;

create or replace function public.submit_rider_application(p jsonb, p_ip_hash text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text := public.recruit_text(p->>'full_name', 80);
  v_phone text := public.recruit_text(p->>'phone', 20);
  v_norm text := public.recruit_phone(p->>'phone');
  v_whatsapp text := public.recruit_text(p->>'whatsapp', 20);
  v_email text := public.recruit_email(p->>'email');
  v_area text := public.recruit_text(p->>'residential_area', 120);
  v_vehicle text := coalesce(p->>'vehicle_type', '');
  v_access text := nullif(coalesce(p->>'vehicle_access', ''), '');
  v_avail text := public.recruit_text(p->>'availability', 120);
  v_em_name text := public.recruit_text(p->>'emergency_name', 80);
  v_em_phone text := public.recruit_text(p->>'emergency_phone', 20);
begin
  if v_name is null or char_length(v_name) < 2 then return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.'); end if;
  if v_norm is null then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a valid Nigerian phone number.'); end if;
  if v_whatsapp is not null and public.recruit_phone(v_whatsapp) is null then return jsonb_build_object('ok', false, 'field', 'whatsapp', 'error', 'Enter a valid WhatsApp number or leave it blank.'); end if;
  if v_email = 'invalid' then return jsonb_build_object('ok', false, 'field', 'email', 'error', 'Check your email address.'); end if;
  if v_area is null then return jsonb_build_object('ok', false, 'field', 'residential_area', 'error', 'Tell us where you live.'); end if;
  if coalesce((p->>'is_adult')::boolean, false) is not true then return jsonb_build_object('ok', false, 'field', 'is_adult', 'error', 'Riders must be 18 or older.'); end if;
  if v_vehicle not in ('bicycle', 'motorcycle', 'other') then return jsonb_build_object('ok', false, 'field', 'vehicle_type', 'error', 'Choose your vehicle type.'); end if;
  if v_access is not null and v_access not in ('own', 'access', 'none') then v_access := null; end if;
  if v_avail is null then return jsonb_build_object('ok', false, 'field', 'availability', 'error', 'Choose when you can work.'); end if;
  if v_em_name is null then return jsonb_build_object('ok', false, 'field', 'emergency_name', 'error', 'Enter an emergency contact name.'); end if;
  if public.recruit_phone(v_em_phone) is null then return jsonb_build_object('ok', false, 'field', 'emergency_phone', 'error', 'Enter a valid emergency contact number.'); end if;
  if public.recruit_phone(v_em_phone) = v_norm then return jsonb_build_object('ok', false, 'field', 'emergency_phone', 'error', 'Use someone else''s number for your emergency contact.'); end if;
  if coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'field', 'consent', 'error', 'Please agree so we can review your application.'); end if;
  if exists (select 1 from public.rider_applications where phone_norm = v_norm) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if public.recruit_rate_limited('rider_applications', p_ip_hash) then return jsonb_build_object('ok', false, 'error', 'Too many applications from this network. Please try again later.'); end if;

  insert into public.rider_applications (full_name, phone, phone_norm, whatsapp, email, residential_area, is_adult, vehicle_type,
    vehicle_access, availability, experience, emergency_name, emergency_phone, consent, ip_hash)
  values (v_name, v_phone, v_norm, v_whatsapp, v_email, v_area, true, v_vehicle, v_access, v_avail,
    public.recruit_text(p->>'experience', 500), v_em_name, v_em_phone, true, p_ip_hash)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;
