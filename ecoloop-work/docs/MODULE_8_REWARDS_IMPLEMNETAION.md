# MODULE 8 — REWARDS — IMPLEMENTATION GUIDE

## 0. Overview
Module 8 replaces every mock behind the Customer Module's **Rewards** tab
with real Supabase reads/writes: a real reward-points balance (reused from
Module 5), a real reward store, a real atomic redemption flow, a real
redemption history, a real achievement/badge system, and a real top-10
leaderboard. No other Customer Module tab is touched.

## 1. What Module 8 Adds
| Task | What's added | How |
|---|---|---|
| 8.1 Reward points | ✅ Already real since Module 5 — no refetch needed | `dashStats.rewardPoints` (`customer_profiles.reward_points`) is now what the Rewards tab displays, same pattern as Module 7 reusing `dashStats.walletBalance` |
| 8.2 Badges | ✅ New | `badges` catalog + `customer_badges` earned table, evaluated against real stats via `evaluate_and_award_badges()` |
| 8.3 Reward history | ✅ New | `reward_redemptions` table, read via `getRedemptionHistory` |
| 8.4 Reward store | ✅ Fixed | `reward_products` existed since Module 3 but had **no SELECT policy** — fixed here |
| 8.5 Redeem rewards | ✅ New | `redeem_reward(p_reward_id)` — a single atomic Postgres function |
| 8.6 Leaderboard | ✅ New | `get_leaderboard(p_limit)` — a privacy-safe RPC, never exposes email/phone/address |

## 2. Files to Create
- `supabase/module8_rewards_schema.sql` — all schema/RLS/RPC changes for this module
- `src/services/rewardsService.ts` — every Supabase call for this module
- `src/hooks/useCustomerRewards.ts` — loads store/history/badges/leaderboard, exposes `redeemReward`
- `docs/MODULE_8_REWARDS.md` *(optional companion spec doc, same 13-section format as `MODULE_7_WALLET.md` — not required to ship, this guide is the authoritative reference)*

## 3. Files to Modify
- `src/types.ts` — add `RewardRedemption`, `Badge`, `LeaderboardEntry` types
- `src/components/CustomerModule.tsx` — import + wire the new hook, replace `handleRedeemReward`, replace the Rewards tab JSX, expose dashboard `refresh`

No other file needs to change. `src/data.ts` and `src/context/DatabaseContext.tsx` are **left alone** — same call Module 7 made for `transactions`: the mock `rewardStore` / `INITIAL_REWARD_PRODUCTS` stay in place because nothing else in the app still reads them after this module, but removing them isn't required and risks breaking something outside scope.

---

## 4. Database Changes — `supabase/module8_rewards_schema.sql`

Run this in Supabase SQL Editor. Prerequisite: `module3_database_schema.sql` and `Rls_gap_fix.sql` must already be applied.

**What it does, in order:**
1. Adds the **missing SELECT policy** on `reward_products` (it existed since Module 3 but nobody but an admin could read it — the same class of bug `Rls_gap_fix.sql` fixed for `customer_profiles`).
2. Creates `reward_redemptions` (real redemption history) with owner-only SELECT — no customer INSERT policy, because every row is written exclusively by the RPC function below.
3. Creates `badges` (public-read catalog, seeded with 8 starter badges) and `customer_badges` (owner-only SELECT, no customer INSERT).
4. Creates `redeem_reward(p_reward_id)` — `SECURITY DEFINER`, does the balance check + points deduction + `transactions` insert + `reward_redemptions` insert **atomically**, so a redemption can never be partially applied.
5. Creates `evaluate_and_award_badges(p_user_id)` — `SECURITY DEFINER`, checks real completed-pickup count, approved-DIY count, redemption count, and total earnings against each badge's threshold, and awards anything newly earned.
6. Creates `get_leaderboard(p_limit)` — `SECURITY DEFINER`, returns only `rank`, `display_name`, `reward_points`, `is_you` for the top N customers — never full profile rows.

```sql
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
```

**No Storage bucket changes needed for this module.**

---

## 5. New Types — `src/types.ts`

### Find → Replace
```
Find:
export interface NotificationItem {

Replace:
// ============================================================================
// MODULE 8 — REWARDS TYPES
// ============================================================================

/** Mirrors a row returned by reading `reward_redemptions` (task 8.3). */
export interface RewardRedemption {
  id: number;
  rewardId: number;
  rewardName: string;
  rewardImage: string;
  costPoints: number;
  redeemedAt: string;
}

/** Mirrors a row in `public.badges` — the achievement catalog (task 8.2). */
export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  metric: 'completed_pickups' | 'approved_diy_projects' | 'reward_redemptions' | 'total_earnings';
  thresholdValue: number;
  earned: boolean;
  earnedAt: string | null;
}

/** One row of the `get_leaderboard` RPC result (task 8.6). */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  rewardPoints: number;
  isYou: boolean;
}

export interface NotificationItem {
```

---

## 6. New Service — `src/services/rewardsService.ts` (complete file)

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  REWARDS SERVICE — Module 8 (Rewards)
 * ============================================================
 *  Every real database read/write for the Customer's "Rewards"
 *  tab lives here. CustomerModule.tsx never talks to `supabase`
 *  directly for rewards data — it calls these functions (via
 *  useCustomerRewards) instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Reward points balance was already made real in Module 5
 *    (`customerService.getDashboardStats` reads
 *    `customer_profiles.reward_points`) — this module's hook
 *    reuses that same number, it doesn't refetch it.
 *  - The reward store reads the real `reward_products` table
 *    (it existed since Module 3 but had no SELECT policy until
 *    this module's schema file fixed that).
 *  - Redeeming a reward calls the `redeem_reward` Postgres
 *    function (SECURITY DEFINER) so the points deduction, the
 *    transactions ledger row, and the redemption-history row
 *    all happen atomically — a customer can never end up with a
 *    redemption recorded without the matching points loss, or
 *    vice versa.
 *  - Badges are evaluated for real against real stats
 *    (completed pickups, approved DIY projects, redemption
 *    count, total earnings) via `evaluate_and_award_badges`,
 *    never randomly or client-side.
 *  - The leaderboard calls `get_leaderboard`, which exposes only
 *    a display name + points + rank for other customers — never
 *    their email/phone/address.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';
import type { Badge, LeaderboardEntry, RewardRedemption } from '../types';

export interface RealRewardProduct {
  id: number;
  name: string;
  description: string;
  costPoints: number;
  image: string;
  category: 'Voucher' | 'Merchandise' | 'Tree Planting' | 'Carbon Offset';
  available: boolean;
}

/** Task 8.4 — Reward store, real catalog rows only (available items first). */
export async function getRewardProducts(): Promise<RealRewardProduct[]> {
  const { data, error } = await supabase
    .from('reward_products')
    .select('id, name, description, cost_points, image, category, available')
    .order('available', { ascending: false })
    .order('cost_points', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Fetching reward products failed:', error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    costPoints: r.cost_points,
    image: r.image ?? '',
    category: r.category,
    available: r.available,
  }));
}

/** Task 8.3 — Real redemption history, newest first. */
export async function getRedemptionHistory(userId: string): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('id, reward_id, reward_snapshot, cost_points, redeemed_at')
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching redemption history failed:', error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    rewardId: r.reward_id,
    rewardName: r.reward_snapshot?.name ?? 'Redeemed Reward',
    rewardImage: r.reward_snapshot?.image ?? '',
    costPoints: r.cost_points,
    redeemedAt: r.redeemed_at,
  }));
}

/**
 * Task 8.5 — Redeem a reward. Calls the `redeem_reward` Postgres function so
 * the points deduction + transactions row + redemption row are all-or-
 * nothing (see module8_rewards_schema.sql). Never deducts points on the
 * client and never trusts a client-computed balance.
 */
export async function redeemReward(
  rewardId: number
): Promise<{ success: boolean; error?: string; remainingPoints?: number }> {
  const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });

  if (error) {
    console.error('[EcoLoop] Redeeming reward failed:', error.message);
    return { success: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) {
    return { success: false, error: row?.error_message ?? 'Redemption failed.' };
  }

  return { success: true, remainingPoints: row.remaining_points };
}

/**
 * Task 8.2 — Ask the database to check real stats against every badge's
 * threshold and award any newly-earned ones, then return the full catalog
 * annotated with each badge's earned status for this customer.
 */
export async function getBadges(userId: string): Promise<Badge[]> {
  const { error: evalError } = await supabase.rpc('evaluate_and_award_badges', { p_user_id: userId });
  if (evalError) {
    console.error('[EcoLoop] Evaluating badges failed:', evalError.message);
  }

  const [catalogResult, earnedResult] = await Promise.all([
    supabase.from('badges').select('id, code, name, description, icon, metric, threshold_value'),
    supabase.from('customer_badges').select('badge_id, earned_at').eq('user_id', userId),
  ]);

  if (catalogResult.error) {
    console.error('[EcoLoop] Fetching badge catalog failed:', catalogResult.error.message);
    return [];
  }

  const earnedMap = new Map<number, string>();
  (earnedResult.data ?? []).forEach((row) => earnedMap.set(row.badge_id, row.earned_at));

  return (catalogResult.data ?? []).map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    description: b.description,
    icon: b.icon,
    metric: b.metric,
    thresholdValue: Number(b.threshold_value),
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) ?? null,
  }));
}

/** Task 8.6 — Top-N leaderboard. Never exposes email/phone/address. */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: limit });

  if (error) {
    console.error('[EcoLoop] Fetching leaderboard failed:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    rank: Number(row.rank),
    displayName: row.display_name ?? 'Eco Member',
    rewardPoints: Number(row.reward_points),
    isYou: Boolean(row.is_you),
  }));
}
```

---

## 7. New Hook — `src/hooks/useCustomerRewards.ts` (complete file)

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerRewards — Module 8 (Rewards)
 * ============================================================
 *  Loads the logged-in customer's real reward store, redemption
 *  history, badges, and the leaderboard, and exposes a
 *  `redeemReward` action. Reward points themselves are NOT
 *  refetched here — they already live in Module 5's
 *  `useCustomerDashboard` -> `dashStats.rewardPoints`; this hook
 *  reuses that value the same way Module 7's wallet hook reused
 *  `dashStats.walletBalance`.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as rewardsService from '../services/rewardsService';
import type { RealRewardProduct } from '../services/rewardsService';
import type { Badge, LeaderboardEntry, RewardRedemption } from '../types';

interface UseCustomerRewardsResult {
  loading: boolean;
  rewardStore: RealRewardProduct[];
  redemptionHistory: RewardRedemption[];
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  redeeming: number | null; // reward id currently being redeemed, if any
  refresh: () => Promise<void>;
  redeemReward: (rewardId: number) => Promise<{ success: boolean; error?: string; remainingPoints?: number }>;
}

export function useCustomerRewards(): UseCustomerRewardsResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [rewardStore, setRewardStore] = useState<RealRewardProduct[]>([]);
  const [redemptionHistory, setRedemptionHistory] = useState<RewardRedemption[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [storeResult, historyResult, badgesResult, leaderboardResult] = await Promise.all([
      rewardsService.getRewardProducts(),
      rewardsService.getRedemptionHistory(userId),
      rewardsService.getBadges(userId),
      rewardsService.getLeaderboard(10),
    ]);
    setRewardStore(storeResult);
    setRedemptionHistory(historyResult);
    setBadges(badgesResult);
    setLeaderboard(leaderboardResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const redeemReward = useCallback(
    async (rewardId: number) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      setRedeeming(rewardId);
      const result = await rewardsService.redeemReward(rewardId);
      if (result.success) await load();
      setRedeeming(null);
      return result;
    },
    [userId, load]
  );

  return {
    loading,
    rewardStore,
    redemptionHistory,
    badges,
    leaderboard,
    redeeming,
    refresh: load,
    redeemReward,
  };
}
```

---

## 8. Edits to `src/components/CustomerModule.tsx`

### 8.1 Import the new hook

```
Find:
import { useCustomerWallet } from '../hooks/useCustomerWallet';

Replace:
import { useCustomerWallet } from '../hooks/useCustomerWallet';
import { useCustomerRewards } from '../hooks/useCustomerRewards';
```

### 8.2 Drop the now-unused `RewardProduct` mock type import

```
Find:
  CustomerItem, PickupRequest, DIYProject, Transaction, RewardProduct, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback 

Replace:
  CustomerItem, PickupRequest, DIYProject, Transaction, 
  NotificationItem, WasteCategory, PickupStatus, SupportTicket, SavedAddress, PickupFeedback 
```

### 8.3 Add `Trophy` and `Lock` icons

```
Find:
  Settings, HelpCircle, Star, Copy, Shield, ChevronDown, Download, Share2, Globe, Send, RefreshCw, AlertTriangle
} from 'lucide-react';

Replace:
  Settings, HelpCircle, Star, Copy, Shield, ChevronDown, Download, Share2, Globe, Send, RefreshCw, AlertTriangle,
  Trophy, Lock
} from 'lucide-react';
```

### 8.4 Expose the dashboard's `refresh` (so redeeming can update `dashStats.rewardPoints`)

```
Find:
    pointsAccumulation: dashPointsAccumulation,
    markAllNotificationsRead: markAllDashNotificationsRead,
  } = useCustomerDashboard();

Replace:
    pointsAccumulation: dashPointsAccumulation,
    markAllNotificationsRead: markAllDashNotificationsRead,
    refresh: refreshDashStats,
  } = useCustomerDashboard();
```

### 8.5 Wire up the Module 8 hook (placed right after the Module 7 wallet hook)

```
Find:
    savePayoutMethod: wlSavePayoutMethod,
    submitWithdrawalRequest: wlSubmitWithdrawalRequest,
  } = useCustomerWallet();

Replace:
    savePayoutMethod: wlSavePayoutMethod,
    submitWithdrawalRequest: wlSubmitWithdrawalRequest,
  } = useCustomerWallet();

  // Module 8 (Rewards) — REAL Supabase-backed data. Prefixed with "rw" so
  // it never collides with the mock `rewardStore` / `transactions` above
  // (the mock `transactions` array is still used by DIY's "Reward" writes
  // until DIY approval gets its own real module).
  const {
    loading: rwLoading,
    rewardStore: rwRewardStore,
    redemptionHistory: rwRedemptionHistory,
    badges: rwBadges,
    leaderboard: rwLeaderboard,
    redeeming: rwRedeeming,
    redeemReward: rwRedeemReward,
  } = useCustomerRewards();
```

### 8.6 Replace `handleRedeemReward` with a real, atomic version

```
Find:
  const handleRedeemReward = (reward: RewardProduct) => {
    if (customer.rewardPoints < reward.costPoints) {
      alert(`Insufficient Eco Points! You need ${reward.costPoints - customer.rewardPoints} more points to redeem this.`);
      return;
    }

    if (confirm(`Redeem "${reward.name}" for ${reward.costPoints} Eco Points?`)) {
      setCustomer({
        ...customer,
        rewardPoints: customer.rewardPoints - reward.costPoints
      });

      const newTx: Transaction = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: customer.id,
        type: 'Reward',
        amount: 0,
        points: reward.costPoints,
        description: `Redeemed ${reward.name}`,
        status: 'Completed',
        date: new Date().toISOString()
      };

      setTransactions([newTx, ...transactions]);

      alert(`Success! Check your registered email for your digital voucher or redemption details.`);
    }
  };

Replace:
  const handleRedeemReward = async (reward: { id: number; name: string; costPoints: number }) => {
    const currentPoints = dashStats?.rewardPoints ?? 0;
    if (currentPoints < reward.costPoints) {
      alert(`Insufficient Eco Points! You need ${reward.costPoints - currentPoints} more points to redeem this.`);
      return;
    }

    if (!confirm(`Redeem "${reward.name}" for ${reward.costPoints} Eco Points?`)) return;

    const result = await rwRedeemReward(reward.id);
    if (result.success) {
      await refreshDashStats(); // dashStats.rewardPoints is the source of truth for the balance shown
      alert(`Success! Check your registered email for your digital voucher or redemption details.`);
    } else {
      alert(result.error ?? 'Could not redeem this reward. Please try again.');
    }
  };
```

### 8.7 Replace the Rewards tab JSX

Find the block starting at `{/* REWARDS STORE VIEW */}` and ending right before `{/* DIY PROJECTS VIEW */}`, and replace the entire `{activeTab === 'rewards' && ( ... )}` block with:

```tsx
{/* REWARDS STORE VIEW */}
{activeTab === 'rewards' && (
  <div className="flex flex-col gap-6 animate-fade-in">
    <div className="bg-gradient-to-r from-emerald-800 to-brand-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
      <div>
        <span className="text-[9px] font-mono tracking-widest text-brand-300 font-bold uppercase">Gamified Sustainability</span>
        <h1 className="text-xl sm:text-2xl font-display font-extrabold mt-1">The Eco Reward Store</h1>
        <p className="text-xs text-brand-100 mt-1">Collect points from DIY crafts and recycling, redeem them for sustainable commodities.</p>
      </div>

      <div className="bg-brand-800/80 p-3.5 rounded-xl border border-brand-700 text-center shadow-md">
        <span className="text-[9px] text-brand-200 font-bold uppercase tracking-wider font-mono">My Active Balance</span>
        <p className="text-xl sm:text-2xl font-mono font-black text-brand-300">{dashStats?.rewardPoints ?? 0} XP</p>
      </div>
    </div>

    {/* Dynamic Store List — real reward_products rows (Task 8.4) */}
    {rwLoading ? (
      <div className="text-center text-xs text-slate-400 py-10">Loading reward store...</div>
    ) : rwRewardStore.length === 0 ? (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-xs text-slate-400">
        No rewards are available in the store right now. Check back soon.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rwRewardStore.map((reward) => (
          <div key={reward.id} className={`bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:border-slate-300 flex flex-col ${!reward.available ? 'opacity-50' : ''}`}>
            <img className="h-40 w-full object-cover" src={reward.image} alt={reward.name} />
            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] font-bold text-brand-600 uppercase font-mono">{reward.category}</span>
                <h4 className="text-xs font-bold text-slate-800 mt-1 leading-tight">{reward.name}</h4>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{reward.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                <span className="font-mono text-xs font-bold text-slate-800">{reward.costPoints} XP</span>
                <button
                  onClick={() => handleRedeemReward(reward)}
                  disabled={!reward.available || rwRedeeming === reward.id}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {rwRedeeming === reward.id ? 'Redeeming...' : !reward.available ? 'Unavailable' : 'Redeem Item'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* My Badges — Task 8.2, real achievements computed from real stats */}
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
      <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
        <Award className="w-4 h-4 text-brand-600" /> My Badges
      </h3>
      {rwLoading ? (
        <p className="text-xs text-slate-400 mt-3">Loading badges...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {rwBadges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 ${
                badge.earned ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              {badge.earned ? (
                <Award className="w-6 h-6 text-brand-600" />
              ) : (
                <Lock className="w-6 h-6 text-slate-400" />
              )}
              <span className="text-[10px] font-bold text-slate-800 leading-tight">{badge.name}</span>
              <span className="text-[9px] text-slate-400 leading-tight">{badge.description}</span>
              {badge.earned && badge.earnedAt && (
                <span className="text-[8px] font-mono text-brand-500">
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Leaderboard — Task 8.6, real top-10 by reward_points */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Community Leaderboard
        </h3>
        {rwLoading ? (
          <p className="text-xs text-slate-400 mt-3">Loading leaderboard...</p>
        ) : rwLeaderboard.length === 0 ? (
          <p className="text-xs text-slate-400 mt-3">No leaderboard data yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mt-4">
            {rwLeaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                  entry.isYou ? 'bg-brand-50 border border-brand-200 font-bold text-brand-700' : 'text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono w-5 text-slate-400">#{entry.rank}</span>
                  {entry.displayName} {entry.isYou && '(You)'}
                </span>
                <span className="font-mono font-bold">{entry.rewardPoints} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward History — Task 8.3, real redemption ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        <h3 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" /> Reward History
        </h3>
        {rwLoading ? (
          <p className="text-xs text-slate-400 mt-3">Loading history...</p>
        ) : rwRedemptionHistory.length === 0 ? (
          <p className="text-xs text-slate-400 mt-3">You haven't redeemed any rewards yet.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-4 max-h-72 overflow-y-auto">
            {rwRedemptionHistory.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                <div>
                  <p className="font-bold text-slate-700">{r.rewardName}</p>
                  <p className="text-[10px] text-slate-400">{new Date(r.redeemedAt).toLocaleString()}</p>
                </div>
                <span className="font-mono font-bold text-brand-600">-{r.costPoints} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

No other tab, no sidebar nav, no bottom nav, and no routing changes — the `rewards` tab id and its nav entries are unchanged.

---

## 9. Business Rules
- **Redemption is atomic, server-side.** A customer never decrements their own `reward_points` or inserts their own `Reward` transaction — `redeem_reward()` does the balance check, the deduction, the ledger insert, and the history insert as one `SECURITY DEFINER` transaction, so a redemption row can never exist without the matching points loss (or vice versa). Same "the real, honest piece" philosophy as Module 7's withdrawal requests.
- **Badges are earned, never granted.** `evaluate_and_award_badges()` only ever checks real counts against real thresholds — no random unlocks, no client-side awarding.
- **The leaderboard never exposes private profile data.** `get_leaderboard()` returns only `display_name` (the `display_code`, e.g. `C-3829`, falling back to a first name), `reward_points`, and `rank` — never email, phone, or address, and it runs `SECURITY DEFINER` specifically so a customer never needs a broad SELECT policy on other customers' `profiles`/`customer_profiles` rows.
- **The reward catalog stays admin-managed.** `reward_products` gets a public SELECT policy only — no customer INSERT/UPDATE/DELETE. Managing the catalog is Module 23's job; until then, rows are edited via the Supabase Table Editor.
- **A snapshot of the reward is stored with each redemption** (`reward_snapshot` in `reward_redemptions`), so if the catalog item is later edited or removed, past redemption history still shows exactly what was redeemed — mirrors `withdrawal_requests.payout_snapshot` from Module 7.

## 10. Edge Cases Handled
- No rewards in the store → empty-state message instead of a blank grid.
- A reward is `available = false` → card is dimmed, button is disabled and reads "Unavailable".
- Insufficient points → blocked client-side with a clear message before any network call, and the server (`redeem_reward`) re-checks anyway and returns a matching error if bypassed.
- Reward no longer exists / was deleted mid-session → `redeem_reward` returns `'Reward not found.'` instead of crashing.
- No badges earned yet → catalog still renders, locked badges shown dimmed with a lock icon.
- No redemption history yet → history card shows an empty state.
- No leaderboard data yet (e.g., fresh database) → empty-state message.
- Redemption RPC network/database failure → the button's "Redeeming..." state clears and an alert shows the real error instead of silently pretending success.

## 11. Verification
1. `npx tsc --noEmit` → confirmed clean (0 errors) after all Module 8 changes.
2. `npm run build` (`vite build`) → run this in your own environment after `npm install`; the sandbox used to write this guide has a stripped-down `node_modules` (no native Rollup binary) which fails at the bundling step for reasons unrelated to Module 8's code — it is not a TypeScript or logic error. If it still fails after a clean `npm install`, delete `node_modules` + `package-lock.json` and reinstall (this is a known npm/Rollup optional-dependency issue, referenced directly in the error message).
3. Confirm every other Customer tab (Dashboard, Create Pickup, Pickups, Wallet, DIY, Community, Settings, Support) still renders and behaves exactly as before — Module 8 only touches the Rewards tab, `types.ts`, and two new files.

## 12. Completion Report

**Files created**
- `supabase/module8_rewards_schema.sql`
- `src/services/rewardsService.ts`
- `src/hooks/useCustomerRewards.ts`
- `MODULE_8_IMPLEMENTATION_GUIDE.md` (this file)
- `MODULE_8_MANUAL_TEST_CHECKLIST.md`

**Files modified**
- `src/types.ts` — added `RewardRedemption`, `Badge`, `LeaderboardEntry`
- `src/components/CustomerModule.tsx` — imports, hook wiring, `handleRedeemReward`, and the entire Rewards tab JSX (store, badges, leaderboard, history)

**Tables used:** `customer_profiles.reward_points` (read-only, already real from Module 5), `reward_products` (existed, SELECT policy fixed), `transactions` (write only via the new RPC), `reward_redemptions` (**new**), `badges` (**new**), `customer_badges` (**new**). **No storage buckets needed.**

**Verification performed:** `npx tsc --noEmit` → clean.

**Features completed:** all 6 Module 8 tasks (8.1–8.6).

**Pending / explicitly out of scope for Module 8:**
- Admin management of the `badges` and `reward_products` catalogs — that's Module 22/23's job (Pricing & Categories / Reward Management); until then, rows are edited via the Supabase Table Editor.
- Actually fulfilling a redemption (shipping a voucher, planting a tree, etc.) — `redeem_reward` only records that the points were spent; fulfillment is an operational/manual process outside the app, same as Module 7 left withdrawal *approval* out of scope.
- DIY project approval still writes reward points via the old mock `transactions` array in `DatabaseContext`, not a real trigger — wiring DIY approval to real `customer_profiles.reward_points` increments is Admin Module territory (Module 23 — Reward Management), not this module's job.

**Next module:** Module 9 — DIY Projects.