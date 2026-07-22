/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useAdminDashboard — Module 19 (Admin Dashboard)
 * ============================================================
 *  Loads the real platform-wide overview stats, the two
 *  dashboard chart datasets, and the Recent Platform Activity
 *  feed. Every other Admin tab still reads/writes the
 *  `DatabaseContext` mock until Modules 20–25 land.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../services/adminService';
import type {
  ActivityEvent,
  AdminCustomerRow,
  AdminIndustryRow,
  AdminOverviewStats,
  AdminPartnerRow,
  AdminUserStatus,
  CategoryBreakdown,
  PickupsByDay,
} from '../services/adminService';

interface UseAdminDashboardResult {
  loading: boolean;
  stats: AdminOverviewStats | null;
  pickupsByDay: PickupsByDay[];
  categoryBreakdown: CategoryBreakdown[];
  recentActivity: ActivityEvent[];
  customers: AdminCustomerRow[];
  partners: AdminPartnerRow[];
  industries: AdminIndustryRow[];
  refresh: () => Promise<void>;
  updateUserStatus: (userId: string, status: AdminUserStatus) => Promise<{ success: boolean; error?: string }>;
}

export function useAdminDashboard(): UseAdminDashboardResult {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [pickupsByDay, setPickupsByDay] = useState<PickupsByDay[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [partners, setPartners] = useState<AdminPartnerRow[]>([]);
  const [industries, setIndustries] = useState<AdminIndustryRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [overview, activity, customerRows, partnerRows, industryRows] = await Promise.all([
      adminService.getOverviewStats(),
      adminService.getRecentActivity(),
      adminService.getCustomers(),
      adminService.getPartners(),
      adminService.getIndustries(),
    ]);

    if (overview) {
      setStats(overview.stats);
      setPickupsByDay(adminService.computePickupsByDay(overview.pickupRows));
      setCategoryBreakdown(adminService.computeCategoryBreakdown(overview.pickupRows));
    }
    setRecentActivity(activity);
    setCustomers(customerRows);
    setPartners(partnerRows);
    setIndustries(industryRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateUserStatus = useCallback(
    async (userId: string, status: AdminUserStatus) => {
      const result = await adminService.updateUserStatus(userId, status);
      if (result.success) await load();
      return result;
    },
    [load]
  );

  return {
    loading,
    stats,
    pickupsByDay,
    categoryBreakdown,
    recentActivity,
    customers,
    partners,
    industries,
    refresh: load,
    updateUserStatus,
  };
}
