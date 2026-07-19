-- ============================================================================
-- ECOLOOP — MODULE 8: REWARDS (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: Module 3 schema (module3_database_schema.sql) and
--               Rls_gap_fix.sql must already be run.
-- ============================================================================
-- WHAT ALREADY EXISTED (from Module 3, unused until now):
--   - public.customer_profiles.reward_points  — real column, already read by
--     customerService.getDashboardStats() since Module 5 (dashStats.rewardPoints).
--   - public.reward_products                  — real table, but it was created
--     WITHOUT a SELECT policy, so no one but an admin/service-role could read
--     it. Task 8.4 (Reward store) needs this fixed.
--   - public.transactions                     — real ledger. Customers only
--     have SELECT on this (see `transactions_owner`), never INSERT — same
--     reasoning as Module 7's wallet: a customer must never be able to forge
--     their own "Reward" transaction row for free points.
--
-- WHY THIS FILE EXISTS: three genuinely new pieces are needed for Module 8:
--   1. reward_products SELECT policy   — was missing since Module 3.
--   2. reward_redemptions              — a real, append-only redemption
--      history (task 8.3), separate from the generic transactions ledger,
--      the same way withdrawal_requests was its own table in Module 7.
--   3. badges / customer_badges        — a real achievement catalog +
--      per-customer earned records (task 8.2).
--   4. Three SECURITY DEFINER functions that do the things RLS intentionally
--      won't let a customer do directly:
--        - redeem_reward(p_reward_id)      — atomically checks balance,
--          decrements reward_points, inserts the transactions row AND the
--          reward_redemptions row, all-or-nothing.
--        - evaluate_and_award_badges(p_user_id) — checks real stats
--          (completed pickups, approved DIY projects, redemptions) against
--          each badge's threshold and awards any newly-earned ones.
--        - get_leaderboard(p_limit)        — returns only a display name +
--          points + rank for the top N customers, WITHOUT exposing full
--          profile rows (email, phone, address, etc.) to every other user.
-- ============================================================================


-- ============================================================================
-- 1. FIX: reward_products was missing a SELECT policy since Module 3
-- ============================================================================
create policy "reward_products_public_read" on public.reward_products
  for select using (true);
-- No insert/update/delete policy for customers on purpose — the reward
-- catalog is admin-managed (Module 23's job); until that module exists,
-- rows are added/edited via the Supabase Table Editor directly.


-- ============================================================================
-- 2. REWARD REDEMPTIONS  (Module 8 task 8.3 — Reward history)
-- ============================================================================
create table if not exists public.reward_redemptions (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles(id),
  reward_id         bigint not null references public.reward_products(id),
  reward_snapshot   jsonb not null,   -- name/description/image/cost copied at redemption time, in case the catalog row later changes
  cost_points       integer not null check (cost_points >= 0),
  transaction_id    bigint references public.transactions(id),
  redeemed_at       timestamptz not null default now()
);
create index if not exists idx_reward_redemptions_user on public.reward_redemptions(user_id);
create index if not exists idx_reward_redemptions_date on public.reward_redemptions(redeemed_at desc);

alter table public.reward_redemptions enable row level security;

create policy "reward_redemptions_owner_select" on public.reward_redemptions
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- No INSERT/UPDATE/DELETE policy for customers on purpose — every row here
-- is written exclusively by the redeem_reward() function below, which runs
-- as SECURITY DEFINER and therefore bypasses RLS. This guarantees a
-- redemption row can never exist without the matching points deduction and
-- transactions row happening in the very same atomic transaction.


-- ============================================================================
-- 3. BADGES  (Module 8 task 8.2 — catalog + per-customer earned records)
-- ============================================================================
create table if not exists public.badges (
  id              bigint generated always as identity primary key,
  code            text not null unique,          -- stable machine key, e.g. 'FIRST_PICKUP'
  name            text not null,
  description     text not null,
  icon            text not null default 'Award', -- lucide-react icon name, rendered by the frontend
  metric          text not null check (metric in ('completed_pickups','approved_diy_projects','reward_redemptions','total_earnings')),
  threshold_value numeric(12,2) not null check (threshold_value > 0)
);

alter table public.badges enable row level security;

create policy "badges_public_read" on public.badges
  for select using (true);

create table if not exists public.customer_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    bigint not null references public.badges(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.customer_badges enable row level security;

create policy "customer_badges_owner_select" on public.customer_badges
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');
-- No INSERT policy for customers — rows are written only by
-- evaluate_and_award_badges() below (SECURITY DEFINER), so a customer can
-- never award themselves a badge they haven't actually earned.

insert into public.badges (code, name, description, icon, metric, threshold_value)
values
  ('FIRST_PICKUP',        'First Drop-off',       'Completed your first pickup.',                 'Truck',   'completed_pickups',     1),
  ('PICKUP_VETERAN',      'Recycling Regular',    'Completed 10 pickups.',                        'Recycle', 'completed_pickups',     10),
  ('PICKUP_CHAMPION',     'Eco Champion',         'Completed 50 pickups.',                        'Trophy',  'completed_pickups',     50),
  ('FIRST_DIY',           'Maker in the Making',  'Had your first DIY project approved.',         'Sparkles','approved_diy_projects', 1),
  ('DIY_INNOVATOR',       'Upcycle Innovator',    'Had 5 DIY projects approved.',                  'Sparkles','approved_diy_projects', 5),
  ('FIRST_REDEMPTION',    'First Redemption',     'Redeemed your first reward.',                  'Gift',    'reward_redemptions',    1),
  ('REWARD_COLLECTOR',    'Reward Collector',     'Redeemed 5 rewards.',                          'Gift',    'reward_redemptions',    5),
  ('HIGH_EARNER',         'High Earner',          'Earned ₹5,000 lifetime from recycling.',       'Award',   'total_earnings',        5000)
on conflict (code) do nothing;


-- ============================================================================
-- 4. REDEEM REWARD  (Module 8 task 8.5 — atomic, all-or-nothing)
-- ============================================================================
create or replace function public.redeem_reward(p_reward_id bigint)
returns table (success boolean, error_message text, remaining_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := auth.uid();
  v_reward        record;
  v_current_pts   integer;
  v_txn_id        bigint;
begin
  if v_user_id is null then
    return query select false, 'Not signed in.', null::integer;
    return;
  end if;

  select id, name, description, image, cost_points, category, available
    into v_reward
    from public.reward_products
   where id = p_reward_id
   for update;

  if v_reward.id is null then
    return query select false, 'Reward not found.', null::integer;
    return;
  end if;

  if not v_reward.available then
    return query select false, 'This reward is currently unavailable.', null::integer;
    return;
  end if;

  select reward_points into v_current_pts
    from public.customer_profiles
   where user_id = v_user_id
   for update;

  if v_current_pts is null then
    return query select false, 'Customer profile not found.', null::integer;
    return;
  end if;

  if v_current_pts < v_reward.cost_points then
    return query select false,
      format('Insufficient Eco Points! You need %s more points to redeem this.', v_reward.cost_points - v_current_pts),
      v_current_pts;
    return;
  end if;

  update public.customer_profiles
     set reward_points = reward_points - v_reward.cost_points
   where user_id = v_user_id;

  insert into public.transactions (user_id, type, amount, points, description, status)
  values (v_user_id, 'Reward', 0, v_reward.cost_points, format('Redeemed %s', v_reward.name), 'Completed')
  returning id into v_txn_id;

  insert into public.reward_redemptions (user_id, reward_id, reward_snapshot, cost_points, transaction_id)
  values (
    v_user_id,
    v_reward.id,
    jsonb_build_object(
      'name', v_reward.name,
      'description', v_reward.description,
      'image', v_reward.image,
      'category', v_reward.category,
      'costPoints', v_reward.cost_points
    ),
    v_reward.cost_points,
    v_txn_id
  );

  return query select true, null::text, (v_current_pts - v_reward.cost_points);
end;
$$;

grant execute on function public.redeem_reward(bigint) to authenticated;


-- ============================================================================
-- 5. EVALUATE + AWARD BADGES  (Module 8 task 8.2)
-- ============================================================================
create or replace function public.evaluate_and_award_badges(p_user_id uuid)
returns setof public.badges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_pickups   numeric;
  v_approved_diy        numeric;
  v_redemptions         numeric;
  v_total_earnings      numeric;
  r                     record;
begin
  if auth.uid() is distinct from p_user_id and public.current_user_role() <> 'admin' then
    raise exception 'Not authorized to evaluate badges for another user.';
  end if;

  select count(*) into v_completed_pickups
    from public.pickup_requests where customer_id = p_user_id and status = 'Completed';

  select count(*) into v_approved_diy
    from public.diy_projects where customer_id = p_user_id and status = 'Approved';

  select count(*) into v_redemptions
    from public.reward_redemptions where user_id = p_user_id;

  select coalesce(total_earnings, 0) into v_total_earnings
    from public.customer_profiles where user_id = p_user_id;

  for r in
    select * from public.badges b
     where not exists (
       select 1 from public.customer_badges cb
        where cb.user_id = p_user_id and cb.badge_id = b.id
     )
  loop
    if (r.metric = 'completed_pickups'     and v_completed_pickups >= r.threshold_value)
    or (r.metric = 'approved_diy_projects' and v_approved_diy        >= r.threshold_value)
    or (r.metric = 'reward_redemptions'    and v_redemptions         >= r.threshold_value)
    or (r.metric = 'total_earnings'        and v_total_earnings      >= r.threshold_value)
    then
      insert into public.customer_badges (user_id, badge_id) values (p_user_id, r.id)
      on conflict do nothing;
    end if;
  end loop;

  return query
    select b.* from public.badges b
    join public.customer_badges cb on cb.badge_id = b.id
   where cb.user_id = p_user_id;
end;
$$;

grant execute on function public.evaluate_and_award_badges(uuid) to authenticated;


-- ============================================================================
-- 6. LEADERBOARD  (Module 8 task 8.6 — top N by reward points, privacy-safe)
-- ============================================================================
create or replace function public.get_leaderboard(p_limit integer default 10)
returns table (rank bigint, display_name text, reward_points integer, is_you boolean)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (order by cp.reward_points desc, cp.user_id) as rank,
    coalesce(p.display_code, split_part(p.full_name, ' ', 1)) as display_name,
    cp.reward_points,
    (cp.user_id = auth.uid()) as is_you
  from public.customer_profiles cp
  join public.profiles p on p.id = cp.user_id
  where p.status = 'Active'
  order by cp.reward_points desc, cp.user_id
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_leaderboard(integer) to authenticated;