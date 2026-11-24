-- =============================================================================
-- Customer profiles: name at sign-up, phone number and profile picture
-- STATUS: APPLIED to production 2026-11-23 (owner approved: "go ahead with no 2").
--         Rollback-tested before applying (a customer cannot make themselves admin).
--
-- Additive: two new columns, one guard trigger, one policy, one storage bucket.
-- Nothing is dropped; existing rows are not changed.
--
-- Security: before this, nobody could update public.profiles (no UPDATE policy). This adds
-- "a user may update their OWN row", and a guard trigger so a user can only change
-- full_name, phone and avatar_url. role, vendor_id, email, id and created_at can
-- never be changed by the user (so nobody can make themselves an admin or vendor).
-- avatar_url must be a picture in the user's own folder of the DOORS "avatars" bucket.
--
-- Rollback:
--   drop policy "user updates own profile" on public.profiles;
--   drop trigger profiles_self_edit_guard on public.profiles;
--   drop function public.profiles_self_edit_guard();
--   restore handle_new_user to: insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
--   drop the four "own avatar" storage policies, and the avatars bucket (only if empty);
--   alter table public.profiles drop column phone, drop column avatar_url;  -- deletes saved phones/pictures
-- =============================================================================

alter table public.profiles
  add column if not exists phone text check (phone is null or char_length(phone) <= 20),
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);

-- Only name / phone / picture can be changed by the user themself.
create or replace function public.profiles_self_edit_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Admins, the database owner and server-side jobs are not restricted here.
  if auth.uid() is null or current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.vendor_id is distinct from old.vendor_id
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'You can only change your name, phone number and profile picture.';
  end if;

  new.full_name := nullif(left(regexp_replace(btrim(coalesce(new.full_name, '')), '\s+', ' ', 'g'), 80), '');

  if new.phone is not null and btrim(new.phone) <> '' then
    -- Saved in one format (2347018038264) whatever way it was typed.
    new.phone := public.recruit_phone(new.phone);
    if new.phone is null then
      raise exception 'Enter a valid Nigerian phone number.';
    end if;
  else
    new.phone := null;
  end if;

  if new.avatar_url is not null and new.avatar_url is distinct from old.avatar_url
     and new.avatar_url not like 'https://baskdegavbbysopgoetv.supabase.co/storage/v1/object/public/avatars/' || auth.uid()::text || '/%' then
    raise exception 'Upload your profile picture from the DOORS app.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_self_edit_guard on public.profiles;
create trigger profiles_self_edit_guard before update on public.profiles
  for each row execute function public.profiles_self_edit_guard();
revoke all on function public.profiles_self_edit_guard() from public, anon, authenticated;

drop policy if exists "user updates own profile" on public.profiles;
create policy "user updates own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Save the name typed on the sign-up screen (sent as user metadata "full_name").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(regexp_replace(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), '\s+', ' ', 'g'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Profile pictures: public images, each user can only write inside avatars/<their id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "user reads own avatar files" on storage.objects;
create policy "user reads own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "user uploads own avatar" on storage.objects;
create policy "user uploads own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "user updates own avatar" on storage.objects;
create policy "user updates own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "user deletes own avatar" on storage.objects;
create policy "user deletes own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
