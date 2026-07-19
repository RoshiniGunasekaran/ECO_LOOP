-- ============================================================================
-- ECOLOOP — MODULE 11: CUSTOMER PROFILE (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql and Rls_gap_fix.sql must
--               already be run.
-- ============================================================================
-- WHAT ALREADY EXISTED (from Module 3, unused for real writes until now):
--   - public.profiles            — real table, real columns (full_name, phone,
--     address, city, state, pincode, profile_pic_url), RLS enabled, with a
--     working SELECT/UPDATE-own-or-admin policy already in place. Module 11's
--     "Update Account Details" and "Save Profile Changes" forms can use this
--     policy exactly as-is — no policy change needed for text-field edits.
--   - public.saved_addresses     — real table, RLS enabled, with a working
--     "owner can do everything to their own rows" policy already in place.
--     Module 11's Address Management section can use this as-is too.
--
-- WHAT THIS FILE ADDS: the ONE thing Module 3 never anticipated — a place to
-- put an uploaded profile picture file. `profiles.profile_pic_url` has been a
-- plain text column since Module 3, but until now nothing has ever uploaded a
-- real file into it; the mock UI only ever pointed at a hardcoded avatar URL.
-- ============================================================================


-- ============================================================================
-- 1. STORAGE — `profile-photos` bucket for customer avatar uploads
-- ============================================================================
-- Public bucket (read-only for anyone, same shape as `pickup-photos` and
-- `diy-photos`): a user may only write inside their own `${user_id}/...`
-- folder, and only ever create/replace/delete their own files.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_public_read" on storage.objects
  for select using (bucket_id = 'profile-photos');

create policy "profile_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_update" on storage.objects
  for update using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- 2. VERIFY (structure-only checks — no data required)
-- ============================================================================
-- 1) Confirm the bucket exists and is public:
-- select id, name, public from storage.buckets where id = 'profile-photos';
--
-- 2) Confirm the 4 storage policies above were created:
-- select policyname from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--   and policyname like 'profile_photos_%';
--
-- 3) Confirm profiles/saved_addresses RLS is still enabled (should be true):
-- select relname, relrowsecurity from pg_class
--   where relname in ('profiles','saved_addresses');
