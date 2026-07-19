-- ============================================================================
-- ECOLOOP — MODULE 9: DIY PROJECTS (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql and Rls_gap_fix.sql must
--               already be run.
-- ============================================================================
-- WHAT ALREADY EXISTED (from Module 3, unused for real writes until now):
--   - public.diy_projects        — real table, real columns, RLS enabled.
--     Had SELECT (public can view Approved, owner can view own, admin all)
--     and INSERT (owner) policies, but its UPDATE policy let a customer
--     edit their row at ANY status — including after an admin had already
--     Approved/Rejected it — and there was no DELETE policy at all.
--   - public.diy_project_comments / public.diy_project_likes — real tables,
--     RLS enabled, but NO policies of any kind yet (default-deny). These
--     back the read-only "Community" showcase tab, which stays on mock
--     data until Module 10 (Community) wires it up — out of scope here.
--
-- WHY THIS FILE EXISTS: Module 9's six tasks (Submit project, Upload
-- images, Project history, Approval status, Edit project, Delete project)
-- need three things that don't exist yet:
--   1. A storage bucket for before/after craft photos (`diy-photos`) —
--      `diy_projects.before_image` / `after_image` have existed as plain
--      text columns since Module 3, but nothing has ever uploaded a real
--      file into them; the mock UI just took a pasted URL.
--   2. A tightened UPDATE policy — task 9.5 ("Edit project") only makes
--      sense while an admin hasn't reviewed the submission yet, the same
--      "customer can only edit while Pending" rule Module 6 applied to
--      pickup_requests.
--   3. A new DELETE policy — task 9.6 ("Delete project"), scoped the same
--      way: a customer may only delete their own still-Pending submission.
--      (Unlike pickup_requests, diy_projects has no 'Cancelled' status to
--      fall back on, so a real hard delete — restricted to Pending rows
--      only — is the correct behavior here, not a soft-cancel.)
-- ============================================================================


-- ============================================================================
-- 1. STORAGE — `diy-photos` bucket for before/after craft images
-- ============================================================================
-- Public bucket (read-only for anyone), same shape as `pickup-photos`
-- (Module 2): a customer may only write inside their own `${user_id}/...`
-- folder, and only ever create/replace/delete their own files.
insert into storage.buckets (id, name, public)
values ('diy-photos', 'diy-photos', true)
on conflict (id) do nothing;

create policy "diy_photos_public_read" on storage.objects
  for select using (bucket_id = 'diy-photos');

create policy "diy_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'diy-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "diy_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'diy-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- No UPDATE policy — a re-upload during Edit simply writes a new object
-- (unique, timestamped filename), it never overwrites an existing one.


-- ============================================================================
-- 2. FIX: diy_projects UPDATE policy — restrict customer edits to Pending
--    (Module 9 task 9.5 — Edit project)
-- ============================================================================
drop policy if exists "diy_owner_update" on public.diy_projects;

create policy "diy_owner_update_pending_or_admin" on public.diy_projects
  for update using (
    (customer_id = auth.uid() and status = 'Pending')
    or public.current_user_role() = 'admin'
  );
-- Before this fix, a customer could still edit project_name/description/etc.
-- on a project an admin had already Approved or Rejected — silently
-- invalidating whatever the admin reviewed. Admins are unaffected: they
-- still need full UPDATE access to Approve/Reject any submission
-- regardless of status (Module 23's job, not this module's, to build the
-- admin-facing screen for that — the RLS just needs to allow it).


-- ============================================================================
-- 3. NEW: diy_projects DELETE policy
--    (Module 9 task 9.6 — Delete project)
-- ============================================================================
create policy "diy_owner_delete_pending_or_admin" on public.diy_projects
  for delete using (
    (customer_id = auth.uid() and status = 'Pending')
    or public.current_user_role() = 'admin'
  );
-- A customer may permanently remove their own submission only while it is
-- still awaiting review. Once Approved or Rejected, it is part of the
-- historical/community record and can no longer be deleted by the
-- customer (an admin still can, for moderation). `on delete cascade` on
-- `diy_project_comments.project_id` / `diy_project_likes.project_id`
-- (from Module 3) means a delete here can never leave orphaned rows —
-- moot for a Pending project in practice, since nothing can comment/like
-- a project that isn't Approved yet, but the cascade is correct either way.
