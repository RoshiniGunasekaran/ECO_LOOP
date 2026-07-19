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