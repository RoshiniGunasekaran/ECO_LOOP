-- ============================================================================
-- ECOLOOP — MODULE 13: PICKUP OPERATIONS (RLS additions)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql, Rls_gap_fix.sql, and
--               module12_partner_dashboard_schema.sql already ran.
-- ============================================================================
-- Module 12 wired up Accept / Start / Arrive / Complete. Module 13 finishes
-- the roadmap's Pickup Operations task list with the two tasks that were
-- still missing: "Collect" (its own status, distinct from Arrived and
-- Completed) and "Upload proof" (photo evidence of the collected waste).
--
-- `pickup_requests.status` has allowed 'Collected' since Module 3's check
-- constraint — nothing needed to change there. What was actually missing:
--
--   1. `public.pickup_images` has had RLS enabled since Module 3, but
--      Rls_gap_fix.sql only ever added a SELECT policy for it — there has
--      NEVER been an INSERT policy. This means Module 6's own customer
--      waste-photo upload (`pickupService.uploadPickupImages`) has been
--      silently failing at the database level since it shipped (the
--      Storage object itself uploads fine; only the `pickup_images` link
--      row insert would be rejected by RLS). Module 13 fixes this for both
--      the pre-existing customer path and the new partner "proof" path in
--      one policy, since it's the same root cause.
--   2. The `pickup-photos` Storage bucket (created manually in Module 2)
--      only ever had a policy allowing a customer to write inside their
--      own `${customer_id}/...` folder. A partner uploading proof photos
--      writes to `${partner_id}/${pickup_id}/proof-...` instead, which
--      needs its own Storage policy scoped to "this pickup is actually
--      assigned to me."
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. pickup_images — INSERT policy (previously missing entirely)
-- ----------------------------------------------------------------------------
-- Allows an insert only when the caller is the customer who owns the
-- pickup, the partner currently assigned to it, or an admin — mirrors the
-- existing `pickup_images_visible_via_pickup` SELECT policy from
-- Rls_gap_fix.sql exactly, just for INSERT instead of SELECT.
create policy "pickup_images_insert_via_pickup" on public.pickup_images
  for insert with check (
    exists (
      select 1 from public.pickup_requests pr
      where pr.id = pickup_images.pickup_id
        and (pr.customer_id = auth.uid() or pr.partner_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );


-- ----------------------------------------------------------------------------
-- 2. storage.objects (pickup-photos bucket) — partner proof-photo INSERT
-- ----------------------------------------------------------------------------
-- Path convention: `${partner_id}/${pickup_id}/proof-<timestamp>-<n>-<name>`
-- (see `uploadProofPhotos` in partnerService.ts). This policy only allows
-- writing under the CALLER's own folder (`storage.foldername(name))[1] =
-- auth.uid()`), and only when the pickup named in the second path segment
-- is actually assigned to them — so a partner can never plant a "proof"
-- photo on someone else's pickup, and can never write outside their own
-- folder even for a pickup that IS theirs.
create policy "pickup_photos_partner_proof_insert" on storage.objects
  for insert with check (
    bucket_id = 'pickup-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.pickup_requests pr
      where pr.id = ((storage.foldername(name))[2])::bigint
        and pr.partner_id = auth.uid()
    )
  );


-- ============================================================================
-- VERIFY (run after the block above)
-- ============================================================================
-- 1) Confirm both new policies exist:
-- select policyname, tablename, cmd from pg_policies
--   where (tablename = 'pickup_images' and policyname = 'pickup_images_insert_via_pickup')
--      or (tablename = 'objects' and policyname = 'pickup_photos_partner_proof_insert')
--   order by tablename, policyname;
--
-- 2) As a signed-in partner with a pickup assigned to them in status
--    'Arrived' or 'Collected', uploading a file to
--    `pickup-photos/<their-uid>/<that-pickup-id>/proof-test.jpg` should
--    succeed; the same upload attempted for a pickup NOT assigned to them
--    should fail.
