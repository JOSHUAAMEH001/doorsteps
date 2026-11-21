-- =============================================================================
-- Vendor menu photos & videos (uploaded files, not links)
-- STATUS: APPLIED to production on 2026-11-21 as "vendor_menu_media".
--
-- * menu_items.video_url: optional short product video.
-- * Bucket "menu-images" (already public, used by admins) now accepts only
--   image/video files up to 50 MB.
-- * Vendors may upload/replace/delete files ONLY inside
--   vendors/<their vendor_id>/ in that bucket. Admin policies are unchanged.
-- =============================================================================

alter table public.menu_items
  add column if not exists video_url text;

update storage.buckets
set file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id = 'menu-images';

create policy "vendor uploads own menu media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and public.my_role() = 'vendor'
    and (storage.foldername(name))[1] = 'vendors'
    and (storage.foldername(name))[2] = public.my_vendor_id()::text
  );

create policy "vendor updates own menu media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-images'
    and public.my_role() = 'vendor'
    and (storage.foldername(name))[1] = 'vendors'
    and (storage.foldername(name))[2] = public.my_vendor_id()::text
  )
  with check (
    bucket_id = 'menu-images'
    and public.my_role() = 'vendor'
    and (storage.foldername(name))[1] = 'vendors'
    and (storage.foldername(name))[2] = public.my_vendor_id()::text
  );

create policy "vendor deletes own menu media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and public.my_role() = 'vendor'
    and (storage.foldername(name))[1] = 'vendors'
    and (storage.foldername(name))[2] = public.my_vendor_id()::text
  );
