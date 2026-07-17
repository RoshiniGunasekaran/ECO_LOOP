/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  CUSTOMER SERVICE — Module 5 (Customer Dashboard)
 * ============================================================
 *  Every real database read for the Customer Dashboard screen
 *  lives here. CustomerModule.tsx never talks to `supabase`
 *  directly for this data — it calls these functions instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL MOCK (be honest with yourself
 *  about this while testing):
 *  - Wallet balance, reward points, pending-pickup count,
 *    recent pickups, recent transactions, notifications, and
 *    all 3 charts below now come from your real Supabase data.
 *  - The "live tracking" banner (driver on the way) still uses
 *    the old mock data for now — that's real GPS/live-tracking
 *    work that belongs to Module 6 (Pickup Management), not
 *    this one.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
  fullName: string;
  profilePicUrl: string | null;
  walletBalance: number;
  rewardPoints: number;
  totalEarnings: number;
  pendingPickupsCount: number;
}

export interface RecentPickup {
  id: number;
  category: string;
  status: string;
  preferredDate: string;
  estimatedWeight: number;
  estimatedAmount: number;
  finalAmount: number | null;
}

export interface RecentTransaction {
  id: number;
  type: 'Credit' | 'Withdrawal' | 'Refund' | 'Reward';
  amount: number;
  points: number | null;
  description: string | null;
  date: string;
}

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  isRead: boolean;
  createdAt: string;
}

export interface MonthlyEarningPoint { month: string; amount: number }
export interface WasteSlice { category: string; weightKg: number; percent: number }
export interface PointsWeekPoint { week: string; points: number }

/** Task 5.1 — Dashboard statistics (wallet, points, pending pickups). */
export async function getDashboardStats(userId: string): Promise<DashboardStats | null> {
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, profile_pic_url')
    .eq('id', userId)
    .maybeSingle();

  const { data: customerRow, error: customerError } = await supabase
    .from('customer_profiles')
    .select('wallet_balance, reward_points, total_earnings')
    .eq('user_id', userId)
    .maybeSingle();

  const { count: pendingCount, error: countError } = await supabase
    .from('pickup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .not('status', 'in', '(Completed,Cancelled)');

  if (profileError || customerError || countError) {
    console.error('[EcoLoop] Dashboard stats fetch failed:', profileError || customerError || countError);
    return null;
  }

  return {
    fullName: profileRow?.full_name ?? 'there',
    profilePicUrl: profileRow?.profile_pic_url ?? null,
    walletBalance: Number(customerRow?.wallet_balance ?? 0),
    rewardPoints: Number(customerRow?.reward_points ?? 0),
    totalEarnings: Number(customerRow?.total_earnings ?? 0),
    pendingPickupsCount: pendingCount ?? 0,
  };
}

/** Task 5.2 — Recent activity (last 3 pickups). */
export async function getRecentPickups(userId: string, limit = 3): Promise<RecentPickup[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select('id, category, status, preferred_date, estimated_weight, estimated_amount, final_amount')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[EcoLoop] Recent pickups fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    category: p.category,
    status: p.status,
    preferredDate: p.preferred_date,
    estimatedWeight: Number(p.estimated_weight),
    estimatedAmount: Number(p.estimated_amount),
    finalAmount: p.final_amount === null ? null : Number(p.final_amount),
  }));
}

/** Task 5.2 (continued) — Recent activity (last 3 wallet transactions). */
export async function getRecentTransactions(userId: string, limit = 3): Promise<RecentTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, points, description, txn_date')
    .eq('user_id', userId)
    .order('txn_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[EcoLoop] Recent transactions fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    points: t.points,
    description: t.description,
    date: t.txn_date,
  }));
}

/** Task 5.3 — Notifications (own + broadcast, most recent 20). */
export async function getNotifications(userId: string): Promise<DashboardNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[EcoLoop] Notifications fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.is_read,
    createdAt: n.created_at,
  }));
}

/**
 * Marks every currently-visible notification as read.
 * NOTE — known limitation carried over from the schema design:
 * broadcast notifications (user_id = null) share ONE row for
 * every user, so "marking read" affects what every customer
 * sees, not just you. Fixing this properly needs a separate
 * per-user "notification_reads" table — worth doing later, but
 * out of scope for Module 5.
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq('is_read', false);

  if (error) {
    console.error('[EcoLoop] Marking notifications read failed:', error.message);
    return false;
  }
  return true;
}

/** Task 5.4 — Chart 1: monthly earnings trend (last 5 months, real Credit transactions). */
export async function getMonthlyEarnings(userId: string): Promise<MonthlyEarningPoint[]> {
  const fiveMonthsAgo = new Date();
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 4);
  fiveMonthsAgo.setDate(1);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, txn_date')
    .eq('user_id', userId)
    .eq('type', 'Credit')
    .gte('txn_date', fiveMonthsAgo.toISOString());

  if (error) {
    console.error('[EcoLoop] Monthly earnings fetch failed:', error.message);
    return [];
  }

  // Build the last 5 calendar months as empty buckets first, so months
  // with zero earnings still show up on the chart as ₹0 instead of vanishing.
  const buckets: MonthlyEarningPoint[] = [];
  const cursor = new Date(fiveMonthsAgo);
  for (let i = 0; i < 5; i++) {
    buckets.push({ month: cursor.toLocaleString('en-IN', { month: 'short' }), amount: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  (data ?? []).forEach((row) => {
    const rowMonth = new Date(row.txn_date).toLocaleString('en-IN', { month: 'short' });
    const bucket = buckets.find((b) => b.month === rowMonth);
    if (bucket) bucket.amount += Number(row.amount);
  });

  return buckets;
}

/** Task 5.4 — Chart 2: waste category distribution (by weight, all pickups). */
export async function getWasteDistribution(userId: string): Promise<WasteSlice[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select('category, estimated_weight, actual_weight')
    .eq('customer_id', userId);

  if (error) {
    console.error('[EcoLoop] Waste distribution fetch failed:', error.message);
    return [];
  }

  const totals = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const weight = Number(row.actual_weight ?? row.estimated_weight ?? 0);
    totals.set(row.category, (totals.get(row.category) ?? 0) + weight);
  });

  const grandTotal = Array.from(totals.values()).reduce((sum, v) => sum + v, 0);
  if (grandTotal === 0) return [];

  return Array.from(totals.entries())
    .map(([category, weightKg]) => ({
      category,
      weightKg,
      percent: Math.round((weightKg / grandTotal) * 100),
    }))
    .sort((a, b) => b.weightKg - a.weightKg);
}

/** Task 5.4 — Chart 3: reward points accumulation (cumulative, by week, last 4 weeks). */
export async function getPointsAccumulation(userId: string): Promise<PointsWeekPoint[]> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data, error } = await supabase
    .from('transactions')
    .select('points, txn_date')
    .eq('user_id', userId)
    .eq('type', 'Reward')
    .gte('txn_date', fourWeeksAgo.toISOString())
    .order('txn_date', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Points accumulation fetch failed:', error.message);
    return [];
  }

  const buckets: PointsWeekPoint[] = [
    { week: 'Week 1', points: 0 },
    { week: 'Week 2', points: 0 },
    { week: 'Week 3', points: 0 },
    { week: 'Week 4', points: 0 },
  ];

  (data ?? []).forEach((row) => {
    const daysAgo = Math.floor((Date.now() - new Date(row.txn_date).getTime()) / 86400000);
    const weekIndex = Math.min(3, Math.max(0, 3 - Math.floor(daysAgo / 7)));
    buckets[weekIndex].points += Number(row.points ?? 0);
  });

  // Make it cumulative (Week 2 total includes Week 1, etc.) to match the
  // original "accumulation" chart's meaning.
  let running = 0;
  return buckets.map((b) => {
    running += b.points;
    return { week: b.week, points: running };
  });
}
