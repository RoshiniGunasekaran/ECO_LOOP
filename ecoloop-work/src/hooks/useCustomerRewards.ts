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