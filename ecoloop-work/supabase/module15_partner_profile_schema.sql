-- ============================================================================
-- ECOLOOP — MODULE 15: PARTNER PROFILE
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql, Rls_gap_fix.sql, and
-- module12_partner_dashboard_schema.sql already ran.
-- ============================================================================
-- What Module 15 needs vs. what already exists:
--
--   1. Personal details (name/phone) -> `profiles` already has a real
--      `profiles_update_own_or_admin` UPDATE policy (Module 3) — the same
--      one Module 11's Customer Profile edit form already relies on. No new
--      policy needed; a partner updating their own `full_name`/`phone` row
--      already works today.
--   2. Profile picture upload -> the `profile-photos` bucket (Module 11)
--      is already public with owner insert/update/delete policies scoped
--      by `(storage.foldername(name))[1] = auth.uid()::text` — not
--      Customer-specific in any way. Reused as-is; no new bucket needed.
--   3. Vehicle type / vehicle number / driving license number / Aadhaar
--      number -> `partner_profiles` already has all 4 columns (Module 3),
--      and `partner_profiles_owner_update` (Module 12) already lets a
--      partner UPDATE their own row. No new columns or policy needed for
--      the text fields themselves.
--   4. Document PHOTOS (license photo, Aadhaar photo) -> genuinely new:
--      `partner_profiles` has no column to hold a document image URL, and
--      no bucket exists for partner ID documents. This file adds both.
--   5. Earnings history -> already real, unchanged since Module 12/14 (the
--      Earning Records tab already reads real `pickup_requests` rows).
--      Nothing to add here.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. partner_profiles — two new columns for uploaded document photos
-- ----------------------------------------------------------------------------
alter table public.partner_profiles
  add column if not exists driving_license_doc_url text,
  add column if not exists aadhaar_doc_url text;

-- No new SELECT/UPDATE policy needed: `partner_profiles_owner_select`
-- (Rls_gap_fix.sql) and `partner_profiles_owner_update` (Module 12) already
-- cover every column on this table, including the two new ones — Postgres
-- RLS policies are row-scoped, not column-scoped.


-- ----------------------------------------------------------------------------
-- 2. partner-documents storage bucket — same public + owner-folder pattern
--    as `profile-photos` (Module 11) and `pickup-photos` (Module 6/13)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('partner-documents', 'partner-documents', true)
on conflict (id) do nothing;

create policy "partner_documents_public_read" on storage.objects
  for select using (bucket_id = 'partner-documents');

create policy "partner_documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'partner-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "partner_documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'partner-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "partner_documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'partner-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- VERIFY (run after the block above)
-- ============================================================================
-- 1) Confirm both new columns exist:
-- select column_name from information_schema.columns
--   where table_name = 'partner_profiles'
--   and column_name in ('driving_license_doc_url','aadhaar_doc_url');
--
-- 2) Confirm the bucket exists and is public:
-- select id, name, public from storage.buckets where id = 'partner-documents';
--
-- 3) Confirm the 4 new storage policies exist:
-- select policyname from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--   and policyname like 'partner_documents_%';
--
-- 4) As a signed-in partner, this should succeed and only ever touch your
--    own row (no p_user_id-style bypass exists for this table):
-- update public.partner_profiles set vehicle_type = vehicle_type where user_id = auth.uid();
