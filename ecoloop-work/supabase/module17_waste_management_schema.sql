-- ============================================================================
-- ECOLOOP — MODULE 17: WASTE MANAGEMENT (Industry side)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql, Rls_gap_fix.sql,
--               module16_industry_dashboard_schema.sql already ran.
-- ============================================================================
-- Real-world flow this module wires up: a Partner marks a pickup
-- 'Completed' (Module 13) — that pickup is now real bulk cargo sitting at
-- the facility gate with no home yet (`assigned_industry_id is null`). An
-- Industry account can now:
--   - see every such unclaimed 'Completed' pickup ("Incoming waste")
--   - accept one, which atomically claims it, adds its weight to that
--     industry's real `industry_inventory` silo, and bumps the real
--     `industry_profiles` counters ("Accept delivery" + "Storage")
--   - reject one — same as the Partner side's "Ignore" button (Module 12):
--     purely a client-side session filter, no DB write, so a rejected
--     cargo item stays available for a different Industry account
--   - advance a claimed delivery through Received -> Sorting -> Processing
--     -> Completed ("Processing")
--   - see everything they've ever claimed, at any stage ("History")
--
-- What was missing at the database level:
--   1. No column to track an Industry's own internal processing stage —
--      `pickup_requests.status` (Module 3) stops at 'Completed'/'Delivered'
--      and its check constraint can't be widened without touching Modules
--      1–14's existing values, so this adds a separate column instead.
--   2. No RLS letting an Industry account see or claim an unassigned
--      'Completed' pickup — same root cause Module 12 fixed for Partners.
--   3. No atomic way to "accept + add to inventory + bump counters" in one
--      trip — doing it as 3 separate client-side calls risks a partial
--      write if one step fails, so this uses a single `security definer`
--      function, same pattern as Module 12's
--      `apply_partner_completion_stats`.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. pickup_requests — new column for the Industry-side processing stage
-- ----------------------------------------------------------------------------
alter table public.pickup_requests
  add column if not exists industry_processing_status text
  check (industry_processing_status in ('Received','Sorting','Processing','Completed'));

-- Deliberately nullable with no default — stays null for every pickup until
-- an Industry actually accepts it, at which point it's set to 'Received'.


-- ----------------------------------------------------------------------------
-- 2. pickup_requests — an Industry can SEE unclaimed 'Completed' cargo,
--    and everything already assigned to them (History)
-- ----------------------------------------------------------------------------
create policy "pickups_industry_view_unassigned_completed" on public.pickup_requests
  for select using (
    status = 'Completed'
    and assigned_industry_id is null
    and public.current_user_role() = 'industry'
  );

create policy "pickups_industry_view_own" on public.pickup_requests
  for select using (assigned_industry_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3. pickup_requests — an Industry can ACCEPT (claim) an unclaimed
--    'Completed' pickup by setting `assigned_industry_id` to themselves
-- ----------------------------------------------------------------------------
create policy "pickups_industry_accept_unassigned" on public.pickup_requests
  for update using (
    status = 'Completed'
    and assigned_industry_id is null
    and public.current_user_role() = 'industry'
  )
  with check (
    assigned_industry_id = auth.uid()
  );


-- ----------------------------------------------------------------------------
-- 4. pickup_requests — an Industry can advance `industry_processing_status`
--    on cargo already assigned to them
-- ----------------------------------------------------------------------------
create policy "pickups_industry_update_own" on public.pickup_requests
  for update using (assigned_industry_id = auth.uid() or public.current_user_role() = 'admin')
  with check (assigned_industry_id = auth.uid() or public.current_user_role() = 'admin');


-- ----------------------------------------------------------------------------
-- 5. Atomic "accept delivery" function — claims the pickup, adds its
--    weight to the matching silo, and bumps the industry's stat counters,
--    all in one trip to avoid a partial write if any single step failed.
-- ----------------------------------------------------------------------------
create or replace function public.accept_industry_delivery(
  p_pickup_id bigint,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
  v_weight numeric;
begin
  if p_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  -- Claim it — fails (0 rows) if someone else already claimed it first,
  -- same "first write wins" race protection as Module 12's partner accept.
  update public.pickup_requests
    set assigned_industry_id = p_user_id,
        industry_processing_status = 'Received'
    where id = p_pickup_id
      and status = 'Completed'
      and assigned_industry_id is null
    returning category, coalesce(actual_weight, estimated_weight) into v_category, v_weight;

  if v_category is null then
    raise exception 'This cargo was already claimed by another facility.';
  end if;

  update public.industry_profiles
    set waste_received_kg = waste_received_kg + v_weight,
        deliveries_count = deliveries_count + 1
    where user_id = p_user_id;

  insert into public.industry_inventory (industry_id, category, quantity_kg, capacity_kg, location)
    values (p_user_id, v_category, v_weight, 20000, null)
  on conflict (industry_id, category)
    do update set quantity_kg = public.industry_inventory.quantity_kg + excluded.quantity_kg,
                  updated_at = now();
end;
$$;

grant execute on function public.accept_industry_delivery(bigint, uuid) to authenticated;


-- ============================================================================
-- VERIFY (run after the block above)
-- ============================================================================
-- 1) Confirm the new column + all 4 new policies + the function exist:
-- select column_name from information_schema.columns
--   where table_name = 'pickup_requests' and column_name = 'industry_processing_status';
-- select policyname, cmd from pg_policies where tablename = 'pickup_requests'
--   and policyname like 'pickups_industry_%';
-- select proname from pg_proc where proname = 'accept_industry_delivery';
--
-- 2) As a signed-in Industry account, this should list any real
--    Partner-completed pickup nobody has claimed yet:
-- select id, category, actual_weight, estimated_weight, status
--   from public.pickup_requests where status = 'Completed' and assigned_industry_id is null;
--
-- 3) Calling `select accept_industry_delivery(<that id>, auth.uid());` should
--    succeed once, then fail with "already claimed" if run again for the
--    same pickup — and `industry_inventory`/`industry_profiles` for your
--    account should reflect the added weight immediately after.
