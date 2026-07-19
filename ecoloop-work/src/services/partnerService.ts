/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  PARTNER SERVICE — Module 12 (Partner Dashboard)
 * ============================================================
 *  Every real database read/write for the Delivery Partner's
 *  "Partner Dashboard", "Nearby Dispatcher", "Assigned Trips",
 *  and "Earning Records" tabs lives here. DeliveryPartnerModule.tsx
 *  never talks to `supabase` directly for this data — it calls
 *  these functions (via usePartnerDashboard) instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Partner profile (name/email/phone/vehicle/rating/stats),
 *    the Online/Offline toggle, the list of unassigned Pending
 *    pickups ("Nearby Dispatcher"), accepting a pickup, the
 *    Assigned-Trip status stepper (Assigned -> In-Transit ->
 *    Arrived), and completing a pickup (weight verification +
 *    invoice generation) are all real Supabase reads/writes now.
 *  - "Ignore" on the Nearby Dispatcher list is session-only (it
 *    just hides that request from this browser tab) — same as
 *    the Module-11-era behavior; it never touches the database,
 *    because ignoring isn't a real business state (any other
 *    online partner must still see the request).
 *  - `today_pickups` is a running counter on `partner_profiles`
 *    that increments every time this partner accepts a pickup.
 *    It does not automatically reset at midnight — a scheduled
 *    reset job is out of scope for Module 12 (would belong to a
 *    later Admin/ops module).
 *  - `distance_traveled` is incremented by a fixed placeholder
 *    (4.2 km) per completed pickup, same estimate the old mock
 *    UI used — real GPS-based distance tracking is out of scope
 *    until a maps integration exists (Module 26).
 *  - Editing vehicle type / vehicle number / documents on the
 *    Profile tab is NOT wired by this module — that's Module 15
 *    (Partner Profile). The Profile tab here only *displays* the
 *    real row; the old "Save Profile Specs" form has been removed
 *    to avoid silently discarding input the way the mock version
 *    did.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';
import type { PickupStatusValue } from './pickupService';

export interface RealPartnerProfile {
  id: string;
  displayCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  profilePicUrl: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  drivingLicense: string | null;
  aadhaarNumber: string | null;
  isOnline: boolean;
  rating: number;
  todayPickups: number;
  completedPickups: number;
  earnings: number;
  distanceTraveled: number;
  status: 'Active' | 'Suspended' | 'Pending Approval';
}

export interface PartnerPickup {
  id: number;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  category: string;
  subcategory: string;
  estimatedWeight: number;
  actualWeight: number | null;
  quantity: number;
  pickupAddress: string;
  landmark: string | null;
  preferredDate: string;
  preferredTime: string;
  status: PickupStatusValue;
  estimatedAmount: number;
  finalAmount: number | null;
  paymentStatus: string;
  invoiceId: string | null;
  createdAt: string;
}

export interface CompletePickupInput {
  actualWeight: number;
  verifiedCategory: string;
  remarks?: string;
}

/** Task 12.1 — Partner Dashboard. Reads the real `profiles` + `partner_profiles` row. */
export async function getPartnerProfile(userId: string): Promise<RealPartnerProfile | null> {
  const [profileResult, partnerResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_code, full_name, email, phone, profile_pic_url, status')
      .eq('id', userId)
      .single(),
    supabase
      .from('partner_profiles')
      .select(
        'vehicle_type, vehicle_number, driving_license, aadhaar_number, is_online, rating, today_pickups, completed_pickups, earnings, distance_traveled'
      )
      .eq('user_id', userId)
      .single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    console.error('[EcoLoop] Fetching partner profile failed:', profileResult.error?.message);
    return null;
  }
  if (partnerResult.error || !partnerResult.data) {
    console.error('[EcoLoop] Fetching partner_profiles row failed:', partnerResult.error?.message);
    return null;
  }

  const p = profileResult.data;
  const pp = partnerResult.data;

  return {
    id: p.id,
    displayCode: p.display_code,
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    profilePicUrl: p.profile_pic_url,
    vehicleType: pp.vehicle_type,
    vehicleNumber: pp.vehicle_number,
    drivingLicense: pp.driving_license,
    aadhaarNumber: pp.aadhaar_number,
    isOnline: pp.is_online,
    rating: Number(pp.rating),
    todayPickups: pp.today_pickups,
    completedPickups: pp.completed_pickups,
    earnings: Number(pp.earnings),
    distanceTraveled: Number(pp.distance_traveled),
    status: p.status,
  };
}

/** Availability toggle — flips `partner_profiles.is_online`. */
export async function setOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('partner_profiles')
    .update({ is_online: isOnline })
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Updating online status failed:', error.message);
    return false;
  }
  return true;
}

/** Shared row -> PartnerPickup mapper, given a customer lookup map. */
function mapPickupRow(
  row: any,
  customerById: Map<string, { full_name: string; phone: string | null }>
): PartnerPickup {
  const customer = customerById.get(row.customer_id);
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: customer?.full_name ?? 'Customer',
    customerPhone: customer?.phone ?? null,
    category: row.category,
    subcategory: row.subcategory ?? '',
    estimatedWeight: Number(row.estimated_weight),
    actualWeight: row.actual_weight === null ? null : Number(row.actual_weight),
    quantity: row.quantity,
    pickupAddress: row.pickup_address,
    landmark: row.landmark,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    status: row.status as PickupStatusValue,
    estimatedAmount: Number(row.estimated_amount),
    finalAmount: row.final_amount === null ? null : Number(row.final_amount),
    paymentStatus: row.payment_status,
    invoiceId: row.invoice_id,
    createdAt: row.created_at,
  };
}

const PICKUP_COLUMNS =
  'id, customer_id, category, subcategory, estimated_weight, actual_weight, quantity, pickup_address, landmark, preferred_date, preferred_time, status, estimated_amount, final_amount, payment_status, invoice_id, created_at';

/** Attaches customer name/phone (from `profiles`) onto a list of raw pickup rows. */
async function attachCustomerInfo(rows: any[]): Promise<PartnerPickup[]> {
  if (rows.length === 0) return [];
  const customerIds = Array.from(new Set(rows.map((r) => r.customer_id)));
  const { data: customers, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', customerIds);

  if (error) {
    console.error('[EcoLoop] Fetching customer info for pickups failed:', error.message);
  }

  const customerById = new Map<string, { full_name: string; phone: string | null }>();
  (customers ?? []).forEach((c: any) => {
    customerById.set(c.id, { full_name: c.full_name, phone: c.phone ?? null });
  });

  return rows.map((r) => mapPickupRow(r, customerById));
}

/** Task 12.2 — "Nearby Dispatcher": every unassigned Pending pickup in the system. */
export async function getAvailablePickups(): Promise<PartnerPickup[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(PICKUP_COLUMNS)
    .eq('status', 'Pending')
    .is('partner_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Fetching available pickups failed:', error.message);
    return [];
  }
  return attachCustomerInfo(data ?? []);
}

/** Task 12.3 — "Assigned Trips" + "Earning Records": every pickup ever assigned to this partner. */
export async function getPartnerPickups(userId: string): Promise<PartnerPickup[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(PICKUP_COLUMNS)
    .eq('partner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching partner pickups failed:', error.message);
    return [];
  }
  return attachCustomerInfo(data ?? []);
}

/**
 * Task 12.4 — Accept Trip. Claims an unassigned Pending pickup for this
 * partner and moves it to 'Assigned'. Relies on the
 * `pickups_partner_accept_unassigned` RLS policy (Module 12 schema) — if
 * another partner already claimed it first, `eq('partner_id', null)` below
 * means this update matches zero rows and returns `false` instead of
 * silently stealing it.
 */
export async function acceptPickup(userId: string, pickupId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .update({ partner_id: userId, status: 'Assigned' })
    .eq('id', pickupId)
    .eq('status', 'Pending')
    .is('partner_id', null)
    .select('id');

  if (error) {
    console.error('[EcoLoop] Accepting pickup failed:', error.message);
    return false;
  }
  if (!data || data.length === 0) {
    console.warn('[EcoLoop] Pickup was already claimed by another partner.');
    return false;
  }

  const { error: incrementError } = await supabase.rpc('increment_partner_today_pickups', {
    p_user_id: userId,
  });
  if (incrementError) {
    // Non-fatal — the pickup is already accepted; the counter just falls behind by one.
    console.error('[EcoLoop] Incrementing today_pickups failed:', incrementError.message);
  }

  return true;
}

/** Task 12.5 — Status stepper: Assigned -> In-Transit -> Arrived. */
export async function advancePickupStatus(
  pickupId: number,
  nextStatus: 'In-Transit' | 'Arrived'
): Promise<boolean> {
  const { error } = await supabase.from('pickup_requests').update({ status: nextStatus }).eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Advancing pickup status failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Task 12.6 — Weight verification + invoice generation. Marks the pickup
 * Completed with the real verified weight/amount, then updates this
 * partner's aggregate stats.
 */
export async function completePickup(
  userId: string,
  pickupId: number,
  input: CompletePickupInput,
  pricePerKg: number
): Promise<{ success: boolean; finalAmount: number; invoiceId: string } | null> {
  const finalAmount = parseFloat((input.actualWeight * pricePerKg).toFixed(2));
  const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { error } = await supabase
    .from('pickup_requests')
    .update({
      status: 'Completed',
      category: input.verifiedCategory,
      actual_weight: input.actualWeight,
      final_amount: finalAmount,
      payment_status: 'Paid',
      invoice_id: invoiceId,
      notes: input.remarks || undefined,
    })
    .eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Completing pickup failed:', error.message);
    return null;
  }

  const { error: statsError } = await supabase.rpc('apply_partner_completion_stats', {
    p_user_id: userId,
    p_earned: finalAmount,
    p_distance_km: 4.2,
  });
  if (statsError) {
    console.error('[EcoLoop] Updating partner stats after completion failed:', statsError.message);
  }

  return { success: true, finalAmount, invoiceId };
}
