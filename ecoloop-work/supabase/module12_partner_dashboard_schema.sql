-- ============================================================================
-- ECOLOOP — MODULE 12: PARTNER DASHBOARD (RLS additions)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql and Rls_gap_fix.sql already ran.
-- ============================================================================
-- No new TABLES are needed for Module 12 — `partner_profiles` (Module 3) and
-- `pickup_requests` (Module 3/6) already have every column the Partner
-- Dashboard needs (is_online, rating, today_pickups, completed_pickups,
-- earnings, distance_traveled / partner_id, status, partner_location_lat,
-- partner_location_lng). What was missing was RLS:
--
--   1. Rls_gap_fix.sql gave partners SELECT on their own `partner_profiles`
--      row, but never gave them UPDATE — so the "Go Online" toggle and the
--      stat counters (today_pickups, completed_pickups, earnings,
--      distance_traveled) could never actually be written.
--   2. Module 3's only SELECT policy on `pickup_requests` is
--      "customer_id = auth.uid() OR partner_id = auth.uid() OR admin" — a
--      partner can see a pickup already assigned to them, but can never see
--      an unassigned `Pending` pickup to accept it in the first place. The
--      "Nearby Dispatcher" tab would always be empty.
--   3. Module 3's only UPDATE policy on `pickup_requests` requires
--      `partner_id = auth.uid()` — which is impossible for a pickup that
--      hasn't been claimed yet (`partner_id` is still null), so "Accept
--      Trip" would always fail silently.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. partner_profiles — owner can UPDATE their own row (online toggle + stats)
-- ----------------------------------------------------------------------------
create policy "partner_profiles_owner_update" on public.partner_profiles
  for update using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');


-- ----------------------------------------------------------------------------
-- 2. pickup_requests — a partner can SEE unassigned Pending pickups
-- ----------------------------------------------------------------------------
-- Additive (permissive) policy: combines with the existing
-- "pickups_customer_own" policy via OR, so nothing customers/admins could
-- already see is hidden.
create policy "pickups_partner_view_unassigned_pending" on public.pickup_requests
  for select using (
    status = 'Pending'
    and partner_id is null
    and public.current_user_role() = 'partner'
  );


-- ----------------------------------------------------------------------------
-- 3. pickup_requests — a partner can ACCEPT (claim) an unassigned Pending
--    pickup by setting partner_id to themselves and status to 'Assigned'
-- ----------------------------------------------------------------------------
-- USING: which existing rows this policy allows targeting for update.
-- WITH CHECK: what the row is allowed to look like AFTER the update.
-- Together these only ever let a partner move ONE specific pickup from
-- (Pending, partner_id = null) to (any status, partner_id = themselves) —
-- they can never reassign a pickup that's already someone else's, and they
-- can never claim a pickup on behalf of a different partner.
create policy "pickups_partner_accept_unassigned" on public.pickup_requests
  for update using (
    status = 'Pending'
    and partner_id is null
    and public.current_user_role() = 'partner'
  )
  with check (
    partner_id = auth.uid()
  );


-- ----------------------------------------------------------------------------
-- 4. Atomic stat-counter functions (avoids read-then-write races on
--    partner_profiles when two devices/tabs act at once)
-- ----------------------------------------------------------------------------
-- Both functions are `security definer` so they can update the row even
-- though the RLS policy above only lets a partner UPDATE their own row via
-- a direct query — but each function still hard-checks `p_user_id = auth.uid()`
-- itself, so a partner can only ever bump their own counters, never anyone
-- else's, regardless of what they pass in.

create or replace function public.increment_partner_today_pickups(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.partner_profiles
    set today_pickups = today_pickups + 1
    where user_id = p_user_id;
end;
$$;

create or replace function public.apply_partner_completion_stats(
  p_user_id uuid,
  p_earned numeric,
  p_distance_km numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.partner_profiles
    set completed_pickups = completed_pickups + 1,
        earnings = earnings + p_earned,
        distance_traveled = distance_traveled + p_distance_km
    where user_id = p_user_id;
end;
$$;

grant execute on function public.increment_partner_today_pickups(uuid) to authenticated;
grant execute on function public.apply_partner_completion_stats(uuid, numeric, numeric) to authenticated;


-- ============================================================================
-- VERIFY (run after the block above)
-- ============================================================================
-- 1) Confirm all 3 new policies exist:
-- select policyname, tablename, cmd from pg_policies
--   where tablename in ('partner_profiles','pickup_requests')
--   order by tablename, policyname;
--
-- 2) As a signed-in partner, this should now return every unassigned
--    Pending pickup in the system (previously always returned 0 rows):
-- select id, category, pickup_address, status, partner_id
--   from public.pickup_requests where status = 'Pending' and partner_id is null;
