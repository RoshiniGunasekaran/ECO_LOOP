-- ============================================================================
-- ECOLOOP — MODULE 18: INDUSTRY PROFILE
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql, Rls_gap_fix.sql,
--               module16_industry_dashboard_schema.sql,
--               module17_waste_management_schema.sql already ran.
-- ============================================================================
-- What Module 18 needs vs. what already exists:
--
--   1. Company information (company name, industry type, GST number,
--      registration number) and Contact (contact person) all already have
--      columns on `industry_profiles` (Module 3) — but there has NEVER
--      been an UPDATE policy for that table (Rls_gap_fix.sql only added
--      SELECT). This file adds it, same gap Module 12 fixed for
--      `partner_profiles`.
--   2. Contact's phone number lives on the shared `profiles` table, which
--      already has a real UPDATE policy since Module 3
--      (`profiles_update_own_or_admin`) — no change needed there.
--   3. Documents (GST certificate photo, registration certificate photo)
--      are genuinely new — no columns or bucket existed for them.
--   4. Settings: this module adds exactly one real, persisted setting
--      (email notification opt-out) — no other role in this project has
--      a fully-persisted settings table yet, so Module 18 keeps this
--      minimal and honest rather than inventing a larger preferences
--      system nothing else uses yet.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. industry_profiles — owner can UPDATE their own row
-- ----------------------------------------------------------------------------
create policy "industry_profiles_owner_update" on public.industry_profiles
  for update using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');


-- ----------------------------------------------------------------------------
-- 2. industry_profiles — 3 new columns: 2 document photo URLs + 1 setting
-- ----------------------------------------------------------------------------
alter table public.industry_profiles
  add column if not exists gst_doc_url text,
  add column if not exists registration_doc_url text,
  add column if not exists email_notifications_enabled boolean not null default true;


-- ----------------------------------------------------------------------------
-- 3. industry-documents storage bucket — same public + owner-folder
--    pattern as `partner-documents` (Module 15) / `profile-photos`
--    (Module 11) / `pickup-photos` (Module 6/13)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('industry-documents', 'industry-documents', true)
on conflict (id) do nothing;

create policy "industry_documents_public_read" on storage.objects
  for select using (bucket_id = 'industry-documents');

create policy "industry_documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'industry-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "industry_documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'industry-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "industry_documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'industry-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- VERIFY (run after the block above)
-- ============================================================================
-- 1) Confirm the new columns exist:
-- select column_name from information_schema.columns where table_name = 'industry_profiles'
--   and column_name in ('gst_doc_url','registration_doc_url','email_notifications_enabled');
--
-- 2) Confirm the owner UPDATE policy + the 4 new storage policies exist:
-- select policyname, cmd from pg_policies where tablename = 'industry_profiles';
-- select policyname from pg_policies where tablename = 'objects' and policyname like 'industry_documents_%';
--
-- 3) As a signed-in Industry account, this should now succeed (previously
--    impossible — no UPDATE policy existed on this table at all):
-- update public.industry_profiles set contact_person = contact_person where user_id = auth.uid();
