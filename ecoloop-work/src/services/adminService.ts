/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  ADMIN SERVICE — Modules 19 & 20 (Admin Dashboard, User Management)
 * ============================================================
 *  Every real database read/write for the Admin's "Administrator
 *  Control Cabin" overview (Module 19) and its Customer/Partner/
 *  Industry directories with search, filter, approve, reject,
 *  and suspend (Module 20) lives here.
 *
 *  WHY NO NEW SQL FILE FOR EITHER MODULE: every table both
 *  modules touch (`profiles`, `customer_profiles`,
 *  `partner_profiles`, `industry_profiles`, `pickup_requests`,
 *  `diy_projects`) already had an
 *  `... or public.current_user_role() = 'admin'` clause on its
 *  SELECT policy since Module 3/Rls_gap_fix.sql, AND `profiles`
 *  already had a real admin-bypass UPDATE policy
 *  (`profiles_update_own_or_admin`) since Module 3 — an admin
 *  account could already read everything and change any user's
 *  `status` at the database level, it just had no real UI using
 *  either capability yet.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - The 4 dashboard stat cards, the DIY audit queue mini-list,
 *    the two charts, and Recent Platform Activity are all real
 *    reads (Module 19).
 *  - Customer Database, Partner Roster, and Industry
 *    Certification (search, filter, approve, reject, suspend)
 *    are all real reads/writes now too (Module 20).
 *  - Every OTHER Admin tab (Global Dispatch Log, Silo Pricing,
 *    DIY Auditing, Broadcaster System, Live Partner Monitoring)
 *    is untouched — those are Modules 21–25's scope, and still
 *    read/write the `DatabaseContext` mock exactly as before.
 *  - "Platform Revenue Log" uses a real sum of `final_amount`
 *    across paid pickups, replacing the old hardcoded
 *    "₹18,45,290.00" placeholder.
 *  - There is no dedicated audit-log table in this schema —
 *    "Recent Platform Activity" is a real, honest feed derived
 *    from existing `created_at` timestamps across `profiles`,
 *    `pickup_requests`, and `diy_projects` (new signups, new
 *    pickup requests, new DIY submissions), not a fabricated
 *    log and not a full status-transition history (that would
 *    need a dedicated audit table — a reasonable future
 *    addition, not invented here to keep this module honest
 *    about what it actually tracks).
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface AdminOverviewStats {
  totalCustomers: number;
  totalPartners: number;
  totalIndustries: number;
  pendingPartnerApprovals: number;
  pendingIndustryApprovals: number;
  unassignedPickups: number;
  pendingDIYSubmissions: number;
  totalRevenue: number;
}

export interface PickupsByDay {
  date: string;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface ActivityEvent {
  id: string;
  type: 'signup' | 'pickup' | 'diy';
  message: string;
  timestamp: string;
}

interface RawPickupRow {
  status: string;
  final_amount: number | null;
  payment_status: string;
  category: string;
  created_at: string;
}

/** Task 19.1 — Dashboard. Reads real counts across `profiles`/`pickup_requests`/`diy_projects`. */
export async function getOverviewStats(): Promise<{ stats: AdminOverviewStats; pickupRows: RawPickupRow[] } | null> {
  const [profilesResult, pickupsResult, diyResult] = await Promise.all([
    supabase.from('profiles').select('role, status'),
    supabase.from('pickup_requests').select('status, final_amount, payment_status, category, created_at'),
    supabase.from('diy_projects').select('status'),
  ]);

  if (profilesResult.error) {
    console.error('[EcoLoop] Fetching profiles for admin overview failed:', profilesResult.error.message);
    return null;
  }
  if (pickupsResult.error) {
    console.error('[EcoLoop] Fetching pickups for admin overview failed:', pickupsResult.error.message);
    return null;
  }
  if (diyResult.error) {
    console.error('[EcoLoop] Fetching DIY projects for admin overview failed:', diyResult.error.message);
    return null;
  }

  const profiles = profilesResult.data ?? [];
  const pickupRows = (pickupsResult.data ?? []) as RawPickupRow[];
  const diyProjects = diyResult.data ?? [];

  const stats: AdminOverviewStats = {
    totalCustomers: profiles.filter((p) => p.role === 'customer').length,
    totalPartners: profiles.filter((p) => p.role === 'partner').length,
    totalIndustries: profiles.filter((p) => p.role === 'industry').length,
    pendingPartnerApprovals: profiles.filter((p) => p.role === 'partner' && p.status === 'Pending Approval').length,
    pendingIndustryApprovals: profiles.filter((p) => p.role === 'industry' && p.status === 'Pending Approval').length,
    unassignedPickups: pickupRows.filter((p) => p.status === 'Pending').length,
    pendingDIYSubmissions: diyProjects.filter((d) => d.status === 'Pending').length,
    totalRevenue: pickupRows
      .filter((p) => p.payment_status === 'Paid' && p.final_amount !== null)
      .reduce((sum, p) => sum + Number(p.final_amount), 0),
  };

  return { stats, pickupRows };
}

/** Task 19.2/19.3 — Analytics & Charts. Pure computation from the pickup rows fetched above. */
export function computePickupsByDay(pickupRows: { created_at: string }[], days = 7): PickupsByDay[] {
  const buckets = new Map<string, number>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  pickupRows.forEach((row) => {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  });

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    count,
  }));
}

export function computeCategoryBreakdown(pickupRows: { category: string }[]): CategoryBreakdown[] {
  const counts = new Map<string, number>();
  pickupRows.forEach((row) => {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/** Task 19.4 — Activity logs. A real, honest feed derived from creation timestamps across the platform. */
export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const [signupsResult, pickupsResult, diyResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('pickup_requests').select('id, category, status, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('diy_projects').select('id, project_name, status, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const events: ActivityEvent[] = [];

  (signupsResult.data ?? []).forEach((row: any) => {
    events.push({
      id: `signup-${row.id}`,
      type: 'signup',
      message: `${row.full_name} joined as a new ${row.role}`,
      timestamp: row.created_at,
    });
  });

  (pickupsResult.data ?? []).forEach((row: any) => {
    events.push({
      id: `pickup-${row.id}`,
      type: 'pickup',
      message: `New ${row.category} pickup request submitted (#${row.id}, ${row.status})`,
      timestamp: row.created_at,
    });
  });

  (diyResult.data ?? []).forEach((row: any) => {
    events.push({
      id: `diy-${row.id}`,
      type: 'diy',
      message: `New DIY project submitted: "${row.project_name}"`,
      timestamp: row.created_at,
    });
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);
}

// ============================================================================
// MODULE 20 — USER MANAGEMENT
// ============================================================================

export type AdminUserStatus = 'Active' | 'Suspended' | 'Pending Approval';

export interface AdminCustomerRow {
  id: string;
  displayCode: string | null;
  name: string;
  email: string;
  profilePic: string | null;
  status: AdminUserStatus;
  walletBalance: number;
  rewardPoints: number;
  createdAt: string;
}

export interface AdminPartnerRow {
  id: string;
  displayCode: string | null;
  name: string;
  email: string;
  profilePic: string | null;
  status: AdminUserStatus;
  vehicleType: string | null;
  vehicleNumber: string | null;
  drivingLicense: string | null;
  aadhaarNumber: string | null;
  createdAt: string;
}

export interface AdminIndustryRow {
  id: string;
  displayCode: string | null;
  name: string;
  email: string;
  status: AdminUserStatus;
  companyName: string;
  industryType: string | null;
  gstNumber: string | null;
  address: string | null;
  createdAt: string;
}

/** Task 20.1 — Customers. Real `profiles` + `customer_profiles` join, admin-only (RLS bypass). */
export async function getCustomers(): Promise<AdminCustomerRow[]> {
  const [profilesResult, childResult] = await Promise.all([
    supabase.from('profiles').select('id, display_code, full_name, email, profile_pic_url, status, created_at').eq('role', 'customer'),
    supabase.from('customer_profiles').select('user_id, wallet_balance, reward_points'),
  ]);

  if (profilesResult.error || childResult.error) {
    console.error('[EcoLoop] Fetching customers failed:', profilesResult.error?.message, childResult.error?.message);
    return [];
  }

  const childById = new Map((childResult.data ?? []).map((c: any) => [c.user_id, c]));

  return (profilesResult.data ?? []).map((p: any) => {
    const child = childById.get(p.id);
    return {
      id: p.id,
      displayCode: p.display_code,
      name: p.full_name,
      email: p.email,
      profilePic: p.profile_pic_url,
      status: p.status,
      walletBalance: Number(child?.wallet_balance ?? 0),
      rewardPoints: child?.reward_points ?? 0,
      createdAt: p.created_at,
    };
  });
}

/** Task 20.1 — Partners. Real `profiles` + `partner_profiles` join. */
export async function getPartners(): Promise<AdminPartnerRow[]> {
  const [profilesResult, childResult] = await Promise.all([
    supabase.from('profiles').select('id, display_code, full_name, email, profile_pic_url, status, created_at').eq('role', 'partner'),
    supabase.from('partner_profiles').select('user_id, vehicle_type, vehicle_number, driving_license, aadhaar_number'),
  ]);

  if (profilesResult.error || childResult.error) {
    console.error('[EcoLoop] Fetching partners failed:', profilesResult.error?.message, childResult.error?.message);
    return [];
  }

  const childById = new Map((childResult.data ?? []).map((c: any) => [c.user_id, c]));

  return (profilesResult.data ?? []).map((p: any) => {
    const child = childById.get(p.id);
    return {
      id: p.id,
      displayCode: p.display_code,
      name: p.full_name,
      email: p.email,
      profilePic: p.profile_pic_url,
      status: p.status,
      vehicleType: child?.vehicle_type ?? null,
      vehicleNumber: child?.vehicle_number ?? null,
      drivingLicense: child?.driving_license ?? null,
      aadhaarNumber: child?.aadhaar_number ?? null,
      createdAt: p.created_at,
    };
  });
}

/** Task 20.1 — Industries. Real `profiles` + `industry_profiles` join. */
export async function getIndustries(): Promise<AdminIndustryRow[]> {
  const [profilesResult, childResult] = await Promise.all([
    supabase.from('profiles').select('id, display_code, full_name, email, address, status, created_at').eq('role', 'industry'),
    supabase.from('industry_profiles').select('user_id, company_name, industry_type, gst_number'),
  ]);

  if (profilesResult.error || childResult.error) {
    console.error('[EcoLoop] Fetching industries failed:', profilesResult.error?.message, childResult.error?.message);
    return [];
  }

  const childById = new Map((childResult.data ?? []).map((c: any) => [c.user_id, c]));

  return (profilesResult.data ?? []).map((p: any) => {
    const child = childById.get(p.id);
    return {
      id: p.id,
      displayCode: p.display_code,
      name: p.full_name,
      email: p.email,
      status: p.status,
      companyName: child?.company_name ?? p.full_name,
      industryType: child?.industry_type ?? null,
      gstNumber: child?.gst_number ?? null,
      address: p.address,
      createdAt: p.created_at,
    };
  });
}

/** Tasks 20.6/20.7/20.8 — Approve / Reject / Suspend. One real status write, any role. */
export async function updateUserStatus(
  userId: string,
  status: AdminUserStatus
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[EcoLoop] Updating user status failed:', error.message);
    return { success: false, error: 'Could not update this account. Please try again.' };
  }
  return { success: true };
}
