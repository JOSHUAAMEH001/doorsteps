-- =============================================================================
-- DOORS pre-launch recruitment: customer waitlist, vendor & rider applications
-- -----------------------------------------------------------------------------
-- Additive only: new tables, new functions, one new PRIVATE storage bucket.
-- Nothing existing is changed or dropped.
--
-- Security model
--  * The three tables have RLS ON and NO public policies: visitors can't read,
--    list, update or delete anything. Only admins (is_admin()) can read/update.
--  * Visitors submit ONLY through the submit_* functions below. They validate
--    every field, block duplicates (same phone) and rate-limit per network.
--  * Uploaded files go to the PRIVATE bucket "applications". A visitor can only
--    upload into the folder of an application created in the last hour, up to
--    12 files, images/PDF only, 10 MB each. Nobody but admins can read them
--    (admins view them through short-lived signed links).
-- =============================================================================

-- ---------------------------------------------------------------- tables ----

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  phone_norm text not null unique,
  email text,
  area text not null,
  service text not null check (service in ('food', 'groceries', 'both')),
  whatsapp text,
  favourite text,
  comments text,
  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),
  admin_notes text,
  ip_hash text
);

create table if not exists public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null,
  category text not null,
  owner_name text not null,
  phone text not null,
  phone_norm text not null unique,
  whatsapp text,
  email text,
  address text not null,
  landmark text,
  description text,
  operating_hours text,
  social_link text,
  menu_text text,
  products jsonb not null default '[]'::jsonb,
  registration_status text not null default 'not_registered'
    check (registration_status in ('registered', 'in_progress', 'not_registered')),
  contact_method text not null default 'whatsapp' check (contact_method in ('whatsapp', 'call', 'sms', 'email')),
  consent boolean not null check (consent),
  files_uploaded integer not null default 0,
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected')),
  admin_notes text,
  ip_hash text
);

create table if not exists public.rider_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  phone_norm text not null unique,
  whatsapp text,
  email text,
  residential_area text not null,
  is_adult boolean not null check (is_adult),
  vehicle_type text not null check (vehicle_type in ('bicycle', 'motorcycle', 'tricycle', 'other')),
  vehicle_access text not null check (vehicle_access in ('own', 'access', 'none')),
  availability text not null,
  experience text,
  emergency_name text not null,
  emergency_phone text not null,
  consent boolean not null check (consent),
  files_uploaded integer not null default 0,
  status text not null default 'new' check (status in ('new', 'reviewing', 'shortlisted', 'approved', 'rejected')),
  admin_notes text,
  ip_hash text
);

create index if not exists waitlist_signups_created_idx on public.waitlist_signups (created_at desc);
create index if not exists waitlist_signups_ip_idx on public.waitlist_signups (ip_hash, created_at);
create index if not exists vendor_applications_created_idx on public.vendor_applications (created_at desc);
create index if not exists vendor_applications_ip_idx on public.vendor_applications (ip_hash, created_at);
create index if not exists rider_applications_created_idx on public.rider_applications (created_at desc);
create index if not exists rider_applications_ip_idx on public.rider_applications (ip_hash, created_at);

alter table public.waitlist_signups enable row level security;
alter table public.vendor_applications enable row level security;
alter table public.rider_applications enable row level security;

create policy "admin reads waitlist" on public.waitlist_signups for select to authenticated using (public.is_admin());
create policy "admin updates waitlist" on public.waitlist_signups for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin reads vendor applications" on public.vendor_applications for select to authenticated using (public.is_admin());
create policy "admin updates vendor applications" on public.vendor_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin reads rider applications" on public.rider_applications for select to authenticated using (public.is_admin());
create policy "admin updates rider applications" on public.rider_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------- helpers ----

-- Trim, collapse whitespace, cap length; empty -> null.
create or replace function public.recruit_text(v text, max_len int)
returns text language sql immutable set search_path = public as $$
  select nullif(left(regexp_replace(btrim(coalesce(v, '')), '\s+', ' ', 'g'), max_len), '')
$$;

-- Nigerian phone -> 234XXXXXXXXXX, or null if it doesn't look like a phone number.
create or replace function public.recruit_phone(v text)
returns text language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(v, ''), '\D', '', 'g');
begin
  if d ~ '^0[789][01]\d{8}$' then return '234' || substr(d, 2); end if;
  if d ~ '^234[789][01]\d{8}$' then return d; end if;
  if d ~ '^[789][01]\d{8}$' then return '234' || d; end if;
  return null;
end;
$$;

create or replace function public.recruit_email(v text)
returns text language sql immutable set search_path = public as $$
  select case
    when public.recruit_text(v, 254) is null then null
    when lower(public.recruit_text(v, 254)) ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then lower(public.recruit_text(v, 254))
    else 'invalid'
  end
$$;

-- Per-network and global flood limits. Returns true when the caller must be refused.
create or replace function public.recruit_rate_limited(p_table text, p_ip_hash text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare per_ip int; total int;
begin
  execute format('select count(*) filter (where ip_hash = $1 and created_at > now() - interval ''1 hour''),
                         count(*) filter (where created_at > now() - interval ''10 minutes'')
                  from public.%I where created_at > now() - interval ''1 hour''', p_table)
    into per_ip, total using coalesce(p_ip_hash, '');
  return (p_ip_hash is not null and per_ip >= 5) or total >= 300;
end;
$$;

-- ----------------------------------------------------------- submissions ----

create or replace function public.submit_waitlist(p jsonb, p_ip_hash text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := public.recruit_text(p->>'full_name', 80);
  v_phone text := public.recruit_text(p->>'phone', 20);
  v_norm text := public.recruit_phone(p->>'phone');
  v_email text := public.recruit_email(p->>'email');
  v_area text := public.recruit_text(p->>'area', 80);
  v_service text := lower(coalesce(p->>'service', ''));
  v_whatsapp text := public.recruit_text(p->>'whatsapp', 20);
begin
  if v_name is null or char_length(v_name) < 2 then return jsonb_build_object('ok', false, 'field', 'full_name', 'error', 'Enter your full name.'); end if;
  if v_norm is null then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a valid Nigerian phone number.'); end if;
  if v_email = 'invalid' then return jsonb_build_object('ok', false, 'field', 'email', 'error', 'Check your email address.'); end if;
  if v_area is null then return jsonb_build_object('ok', false, 'field', 'area', 'error', 'Tell us where you are.'); end if;
  if v_service not in ('food', 'groceries', 'both') then return jsonb_build_object('ok', false, 'field', 'service', 'error', 'Choose food, groceries or both.'); end if;
  if v_whatsapp is not null and public.recruit_phone(v_whatsapp) is null then return jsonb_build_object('ok', false, 'field', 'whatsapp', 'error', 'Enter a valid WhatsApp number or leave it blank.'); end if;
  if exists (select 1 from public.waitlist_signups where phone_norm = v_norm) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if public.recruit_rate_limited('waitlist_signups', p_ip_hash) then return jsonb_build_object('ok', false, 'error', 'Too many sign-ups from this network. Please try again later.'); end if;

  insert into public.waitlist_signups (full_name, phone, phone_norm, email, area, service, whatsapp, favourite, comments, ip_hash)
  values (v_name, v_phone, v_norm, v_email, v_area, v_service, v_whatsapp,
          public.recruit_text(p->>'favourite', 120), public.recruit_text(p->>'comments', 500), p_ip_hash);
  return jsonb_build_object('ok', true, 'duplicate', false);
exception when unique_violation then
  return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;

create or replace function public.submit_vendor_application(p jsonb, p_ip_hash text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_business text := public.recruit_text(p->>'business_name', 80);
  v_category text := public.recruit_text(p->>'category', 40);
  v_owner text := public.recruit_text(p->>'owner_name', 80);
  v_phone text := public.recruit_text(p->>'phone', 20);
  v_norm text := public.recruit_phone(p->>'phone');
  v_whatsapp text := public.recruit_text(p->>'whatsapp', 20);
  v_email text := public.recruit_email(p->>'email');
  v_address text := public.recruit_text(p->>'address', 200);
  v_social text := public.recruit_text(p->>'social_link', 200);
  v_reg text := coalesce(p->>'registration_status', 'not_registered');
  v_contact text := coalesce(p->>'contact_method', 'whatsapp');
  v_products jsonb := '[]'::jsonb;
begin
  if v_business is null or char_length(v_business) < 2 then return jsonb_build_object('ok', false, 'field', 'business_name', 'error', 'Enter your business name.'); end if;
  if v_category is null then return jsonb_build_object('ok', false, 'field', 'category', 'error', 'Choose a business category.'); end if;
  if v_owner is null or char_length(v_owner) < 2 then return jsonb_build_object('ok', false, 'field', 'owner_name', 'error', 'Enter the owner''s full name.'); end if;
  if v_norm is null then return jsonb_build_object('ok', false, 'field', 'phone', 'error', 'Enter a valid Nigerian phone number.'); end if;
  if v_whatsapp is not null and public.recruit_phone(v_whatsapp) is null then return jsonb_build_object('ok', false, 'field', 'whatsapp', 'error', 'Enter a valid WhatsApp number or leave it blank.'); end if;
  if v_email = 'invalid' then return jsonb_build_object('ok', false, 'field', 'email', 'error', 'Check the email address.'); end if;
  if v_address is null then return jsonb_build_object('ok', false, 'field', 'address', 'error', 'Enter your business location.'); end if;
  if v_social is not null and v_social !~* '^(https?://|@)?[\w.@/:?=&%#~+-]+$' then return jsonb_build_object('ok', false, 'field', 'social_link', 'error', 'Check the social media link.'); end if;
  if v_reg not in ('registered', 'in_progress', 'not_registered') then v_reg := 'not_registered'; end if;
  if v_contact not in ('whatsapp', 'call', 'sms', 'email') then v_contact := 'whatsapp'; end if;
  if coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'field', 'consent', 'error', 'Please agree so we can review your application.'); end if;

  -- Up to 8 sample products: {name, price}
  if jsonb_typeof(p->'products') = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', public.recruit_text(x->>'name', 60),
             'price', case when (x->>'price') ~ '^\d{1,7}(\.\d{1,2})?$' then (x->>'price')::numeric else null end)), '[]'::jsonb)
      into v_products
      from (select x from jsonb_array_elements(p->'products') x limit 8) s
     where public.recruit_text(x->>'name', 60) is not null;
  end if;

  if exists (select 1 from public.vendor_applications where phone_norm = v_norm) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if public.recruit_rate_limited('vendor_applications', p_ip_hash) then return jsonb_build_object('ok', false, 'error', 'Too many applications from this network. Please try again later.'); end if;

  insert into public.vendor_applications (business_name, category, owner_name, phone, phone_norm, whatsapp, email, address, landmark,
    description, operating_hours, social_link, menu_text, products, registration_status, contact_method, consent, ip_hash)
  values (v_business, v_category, v_owner, v_phone, v_norm, v_whatsapp, v_email, v_address, public.recruit_text(p->>'landmark', 120),
    public.recruit_text(p->>'description', 600), public.recruit_text(p->>'operating_hours', 120), v_social,
    left(btrim(coalesce(p->>'menu_text', '')), 3000), v_products, v_reg, v_contact, true, p_ip_hash)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;

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
  v_access text := coalesce(p->>'vehicle_access', '');
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
  if v_vehicle not in ('bicycle', 'motorcycle', 'tricycle', 'other') then return jsonb_build_object('ok', false, 'field', 'vehicle_type', 'error', 'Choose your vehicle type.'); end if;
  if v_access not in ('own', 'access', 'none') then return jsonb_build_object('ok', false, 'field', 'vehicle_access', 'error', 'Tell us if you own or can use the vehicle.'); end if;
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

-- --------------------------------------------------------------- uploads ----

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

-- A visitor may upload into  vendor/<application id>/...  or  rider/<application id>/...
-- only within 1 hour of submitting, and at most 12 files per application.
create or replace function public.can_upload_application_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
  v_id uuid;
  v_recent boolean;
begin
  if array_length(parts, 1) <> 3 or parts[1] not in ('vendor', 'rider') then return false; end if;
  if parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  if parts[3] !~ '^[a-z0-9-]{1,60}\.(jpg|jpeg|png|webp|heic|heif|pdf)$' then return false; end if;
  v_id := parts[2]::uuid;
  if parts[1] = 'vendor' then
    select created_at > now() - interval '1 hour' into v_recent from public.vendor_applications where id = v_id;
  else
    select created_at > now() - interval '1 hour' into v_recent from public.rider_applications where id = v_id;
  end if;
  if v_recent is not true then return false; end if;
  return (select count(*) from storage.objects o where o.bucket_id = 'applications' and o.name like parts[1] || '/' || parts[2] || '/%') < 12;
end;
$$;

create policy "visitors upload application files" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'applications' and public.can_upload_application_file(name));
create policy "admin reads application files" on storage.objects
  for select to authenticated using (bucket_id = 'applications' and public.is_admin());
create policy "admin deletes application files" on storage.objects
  for delete to authenticated using (bucket_id = 'applications' and public.is_admin());

-- After uploading, the form records how many files arrived (shown to admins).
create or replace function public.finalize_application_files(p_kind text, p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_kind not in ('vendor', 'rider') then return 0; end if;
  select count(*) into n from storage.objects where bucket_id = 'applications' and name like p_kind || '/' || p_id::text || '/%';
  if p_kind = 'vendor' then
    update public.vendor_applications set files_uploaded = n where id = p_id and created_at > now() - interval '1 hour';
  else
    update public.rider_applications set files_uploaded = n where id = p_id and created_at > now() - interval '1 hour';
  end if;
  return n;
end;
$$;

-- --------------------------------------------------------------- grants -----

revoke all on function public.recruit_rate_limited(text, text) from public, anon, authenticated;
revoke all on function public.can_upload_application_file(text) from public;
grant execute on function public.can_upload_application_file(text) to anon, authenticated;
revoke all on function public.submit_waitlist(jsonb, text) from public;
revoke all on function public.submit_vendor_application(jsonb, text) from public;
revoke all on function public.submit_rider_application(jsonb, text) from public;
revoke all on function public.finalize_application_files(text, uuid) from public;
grant execute on function public.submit_waitlist(jsonb, text) to anon, authenticated;
grant execute on function public.submit_vendor_application(jsonb, text) to anon, authenticated;
grant execute on function public.submit_rider_application(jsonb, text) to anon, authenticated;
grant execute on function public.finalize_application_files(text, uuid) to anon, authenticated;
