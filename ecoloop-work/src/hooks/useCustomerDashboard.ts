/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerDashboard — Module 5 (Customer Dashboard)
 * ============================================================
 *  One hook that loads everything the Dashboard tab needs, in
 *  parallel, and gives the component simple things to render:
 *  `stats`, `recentPickups`, `recentTransactions`,
 *  `notifications`, `unreadCount`, a `loading` flag, and a
 *  `refresh()` function to re-fetch after something changes
 *  (like marking notifications as read).
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as customerService from '../services/customerService';
import type {
  DashboardStats,
  RecentPickup,
  RecentTransaction,
  DashboardNotification,
  MonthlyEarningPoint,
  WasteSlice,
  PointsWeekPoint,
} from '../services/customerService';

interface UseCustomerDashboardResult {
  loading: boolean;
  stats: DashboardStats | null;
  recentPickups: RecentPickup[];
  recentTransactions: RecentTransaction[];
  notifications: DashboardNotification[];
  unreadCount: number;
  monthlyEarnings: MonthlyEarningPoint[];
  wasteDistribution: WasteSlice[];
  pointsAccumulation: PointsWeekPoint[];
  refresh: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

export function useCustomerDashboard(): UseCustomerDashboardResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPickups, setRecentPickups] = useState<RecentPickup[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarningPoint[]>([]);
  const [wasteDistribution, setWasteDistribution] = useState<WasteSlice[]>([]);
  const [pointsAccumulation, setPointsAccumulation] = useState<PointsWeekPoint[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [
      statsResult,
      pickupsResult,
      transactionsResult,
      notificationsResult,
      earningsResult,
      wasteResult,
      pointsResult,
    ] = await Promise.all([
      customerService.getDashboardStats(userId),
      customerService.getRecentPickups(userId),
      customerService.getRecentTransactions(userId),
      customerService.getNotifications(userId),
      customerService.getMonthlyEarnings(userId),
      customerService.getWasteDistribution(userId),
      customerService.getPointsAccumulation(userId),
    ]);

    setStats(statsResult);
    setRecentPickups(pickupsResult);
    setRecentTransactions(transactionsResult);
    setNotifications(notificationsResult);
    setMonthlyEarnings(earningsResult);
    setWasteDistribution(wasteResult);
    setPointsAccumulation(pointsResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!userId) return;
    const success = await customerService.markAllNotificationsRead(userId);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    loading,
    stats,
    recentPickups,
    recentTransactions,
    notifications,
    unreadCount,
    monthlyEarnings,
    wasteDistribution,
    pointsAccumulation,
    refresh: load,
    markAllNotificationsRead,
  };
}
