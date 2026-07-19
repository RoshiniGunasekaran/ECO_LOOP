-- ============================================================================
-- ECOLOOP — RLS FIX: missing SELECT policies from Module 3
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================
-- WHAT HAPPENED: Module 3 ran `alter table ... enable row level security`
-- on every table, but never added a SELECT policy for these five. RLS with
-- zero policies means DEFAULT DENY for every real user — only the
-- `postgres`/service role (like the Table Editor) can still see the data,
-- which is why customer_profiles.wallet_balance looked correct in the Table
-- Editor but the Dashboard kept showing ₹0.00.
-- ============================================================================

-- customer_profiles: this is the one causing the wallet balance / reward
-- points bug you just found. Only SELECT is added — wallet_balance and
-- reward_points should never be customer-writable (only a future
-- admin/backend process should change those).
create policy "customer_profiles_owner_select" on public.customer_profiles
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- partner_profiles / industry_profiles: not used by the app yet, but same
-- gap — fixing it now avoids the identical bug resurfacing in Modules 12+/16+.
create policy "partner_profiles_owner_select" on public.partner_profiles
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "industry_profiles_owner_select" on public.industry_profiles
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- pickup_images / pickup_feedback: used by Module 6. Without this, uploaded
-- waste photos and submitted feedback exist in the database but the
-- customer (or partner, later) can never read them back.
create policy "pickup_images_visible_via_pickup" on public.pickup_images
  for select using (
    exists (
      select 1 from public.pickup_requests pr
      where pr.id = pickup_images.pickup_id
        and (pr.customer_id = auth.uid() or pr.partner_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "pickup_feedback_visible_via_pickup" on public.pickup_feedback
  for select using (
    exists (
      select 1 from public.pickup_requests pr
      where pr.id = pickup_feedback.pickup_id
        and (pr.customer_id = auth.uid() or pr.partner_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );