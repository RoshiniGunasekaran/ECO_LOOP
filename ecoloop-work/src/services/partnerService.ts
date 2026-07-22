/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  PARTNER SERVICE — Module 12 (Partner Dashboard)
 *                   + Module 13 (Pickup Operations)
 *                   + Module 14 (Billing)
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
 *    pickups ("Nearby Dispatcher"), accepting/rejecting a pickup,
 *    the full Assigned-Trip status stepper (Assigned -> In-Transit
 *    -> Arrived -> Collected -> Completed), collection-proof photo
 *    upload, and completing a pickup (weight verification + invoice
 *    generation) are all real Supabase reads/writes now (Modules
 *    12 + 13).
 *  - "Ignore" on the Nearby Dispatcher list is session-only (it
 *    just hides that request from this browser tab) — it never
 *    touches the database, because ignoring isn't a real business
 *    state (any other online partner must still see the request).
 *  - `today_pickups` is a running counter on `partner_profiles`
 *    that increments every time this partner accepts a pickup.
 *    It does not automatically reset at midnight — a scheduled
 *    reset job is out of scope (would belong to a later Admin/ops
 *    module).
 *  - `distance_traveled` is incremented by a fixed placeholder
 *    (4.2 km) per completed pickup, same estimate the old mock
 *    UI used — real GPS-based distance tracking is out of scope
 *    until a maps integration exists (Module 26).
 *  - Proof photo upload is best-effort: if a photo fails to
 *    upload, the Collected status change still goes through (see
 *    `collectPickup`) — a partner shouldn't be blocked from
 *    progressing a real-world pickup by a flaky image upload.
 *  - Editing personal details, vehicle type/number, license/Aadhaar
 *    numbers, and uploading license/Aadhaar document photos on the
 *    Profile tab are real Supabase reads/writes now (Module 15). The
 *    profile picture itself reuses Module 11's existing
 *    `profileService.uploadProfilePicture` — it writes to the same
 *    `profiles.profile_pic_url` column / `profile-photos` bucket a
 *    Partner and a Customer both already share, so Module 15 does
 *    not duplicate it here.
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
  /** Module 15 — uploaded document photo URLs (null until a partner uploads one). */
  drivingLicenseDocUrl: string | null;
  aadhaarDocUrl: string | null;
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
  /** Waste + collection-proof photos together — Module 6's customer waste
   *  photos and Module 13's partner proof photos live in the same
   *  `pickup_images` table/bucket, distinguished only by upload path prefix. */
  images: string[];
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
        'vehicle_type, vehicle_number, driving_license, aadhaar_number, driving_license_doc_url, aadhaar_doc_url, is_online, rating, today_pickups, completed_pickups, earnings, distance_traveled'
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
    drivingLicenseDocUrl: pp.driving_license_doc_url,
    aadhaarDocUrl: pp.aadhaar_doc_url,
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

// ============================================================================
// MODULE 15 — PARTNER PROFILE
// ============================================================================

export interface PartnerPersonalDetailsInput {
  fullName: string;
  phone: string;
}

/** Task 15.1 — Personal details. Updates the shared `profiles` row's name/phone. */
export async function updatePartnerPersonalDetails(
  userId: string,
  input: PartnerPersonalDetailsInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.fullName.trim()) {
    return { success: false, error: 'Full name cannot be empty.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[EcoLoop] Partner personal details update failed:', error.message);
    return { success: false, error: 'Could not save your changes. Please try again.' };
  }
  return { success: true };
}

export interface PartnerVehicleDetailsInput {
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
  aadhaarNumber: string;
}

/** Task 15.2 — Vehicle. Updates `partner_profiles`' vehicle + document-number fields. */
export async function updateVehicleDetails(
  userId: string,
  input: PartnerVehicleDetailsInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('partner_profiles')
    .update({
      vehicle_type: input.vehicleType.trim() || null,
      vehicle_number: input.vehicleNumber.trim() || null,
      driving_license: input.drivingLicense.trim() || null,
      aadhaar_number: input.aadhaarNumber.trim() || null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Partner vehicle details update failed:', error.message);
    return { success: false, error: 'Could not save your vehicle details. Please try again.' };
  }
  return { success: true };
}

const PARTNER_DOCUMENTS_BUCKET = 'partner-documents';

/**
 * Task 15.3 — Documents. Uploads a license or Aadhaar photo to the
 * `partner-documents` bucket (Module 15 schema) and saves its public URL
 * onto the matching `partner_profiles` column. Best-effort — returns null
 * on failure instead of throwing, same pattern as `uploadProfilePicture`
 * (Module 11) and `uploadProofPhotos` (Module 13).
 */
export async function uploadPartnerDocument(
  userId: string,
  docType: 'license' | 'aadhaar',
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${userId}/${docType}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PARTNER_DOCUMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[EcoLoop] Partner document upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(PARTNER_DOCUMENTS_BUCKET).getPublicUrl(path);
  const url = publicUrlData.publicUrl;

  const column = docType === 'license' ? 'driving_license_doc_url' : 'aadhaar_doc_url';
  const { error: updateError } = await supabase
    .from('partner_profiles')
    .update({ [column]: url })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[EcoLoop] Saving new document URL failed:', updateError.message);
    return null;
  }

  return url;
}

/** Shared row -> PartnerPickup mapper, given a customer lookup map + image map. */
function mapPickupRow(
  row: any,
  customerById: Map<string, { full_name: string; phone: string | null }>,
  imagesByPickup: Map<number, string[]>
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
    images: imagesByPickup.get(row.id) ?? [],
  };
}

const PICKUP_COLUMNS =
  'id, customer_id, category, subcategory, estimated_weight, actual_weight, quantity, pickup_address, landmark, preferred_date, preferred_time, status, estimated_amount, final_amount, payment_status, invoice_id, created_at';

/** Attaches customer name/phone (from `profiles`) and photos (from `pickup_images`) onto a list of raw pickup rows. */
async function attachCustomerInfo(rows: any[]): Promise<PartnerPickup[]> {
  if (rows.length === 0) return [];
  const pickupIds = rows.map((r) => r.id);
  const customerIds = Array.from(new Set(rows.map((r) => r.customer_id)));

  const [customersResult, imagesResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').in('id', customerIds),
    supabase.from('pickup_images').select('pickup_id, image_url').in('pickup_id', pickupIds),
  ]);

  if (customersResult.error) {
    console.error('[EcoLoop] Fetching customer info for pickups failed:', customersResult.error.message);
  }
  if (imagesResult.error) {
    console.error('[EcoLoop] Fetching pickup images failed:', imagesResult.error.message);
  }

  const customerById = new Map<string, { full_name: string; phone: string | null }>();
  (customersResult.data ?? []).forEach((c: any) => {
    customerById.set(c.id, { full_name: c.full_name, phone: c.phone ?? null });
  });

  const imagesByPickup = new Map<number, string[]>();
  (imagesResult.data ?? []).forEach((img: any) => {
    const list = imagesByPickup.get(img.pickup_id) ?? [];
    list.push(img.image_url);
    imagesByPickup.set(img.pickup_id, list);
  });

  return rows.map((r) => mapPickupRow(r, customerById, imagesByPickup));
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

const PICKUP_PHOTOS_BUCKET = 'pickup-photos';

/**
 * Task 13.9 — Upload proof. Uploads collection-proof photos to the same
 * `pickup-photos` bucket / `pickup_images` table Module 6 already uses for
 * customer waste photos, but under a `${partnerId}/${pickupId}/proof-...`
 * path (see `module13_pickup_operations_schema.sql`) so the new
 * partner-write storage policy can be scoped by uploader identity, same
 * pattern as every other photo bucket in this app. Best-effort per file.
 */
async function uploadProofPhotos(partnerId: string, pickupId: number, files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${partnerId}/${pickupId}/proof-${Date.now()}-${i}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PICKUP_PHOTOS_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('[EcoLoop] Proof photo upload failed:', uploadError.message);
      continue; // Don't let one bad photo block the rest of the collection.
    }

    const { data: publicUrlData } = supabase.storage.from(PICKUP_PHOTOS_BUCKET).getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

    const { error: linkError } = await supabase.from('pickup_images').insert({ pickup_id: pickupId, image_url: imageUrl });

    if (linkError) {
      console.error('[EcoLoop] Linking proof photo failed:', linkError.message);
      continue;
    }

    urls.push(imageUrl);
  }

  return urls;
}

/**
 * Task 13.6 / 13.9 — Collect. Moves a pickup from 'Arrived' to 'Collected'
 * and (optionally) attaches proof-of-collection photos. Photos are
 * best-effort — if one fails to upload, the collection status change still
 * goes through, since a partner shouldn't be blocked from moving the
 * physical pickup forward by a flaky photo upload.
 */
export async function collectPickup(
  partnerId: string,
  pickupId: number,
  proofFiles: File[] = []
): Promise<boolean> {
  const { error } = await supabase.from('pickup_requests').update({ status: 'Collected' }).eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Marking pickup as collected failed:', error.message);
    return false;
  }

  if (proofFiles.length) {
    await uploadProofPhotos(partnerId, pickupId, proofFiles);
  }

  return true;
}

/**
 * Task 12.6 / 14.1 / 14.2 — Weight verification + invoice generation.
 * Marks the pickup Completed with the real verified weight/amount and a
 * real invoice ID, then updates this partner's aggregate stats.
 *
 * `payment_status` is set to `'Pending'`, not `'Paid'` — Module 14 treats
 * "the invoice exists" and "the payment has actually been confirmed" as
 * two separate, real steps (see `confirmPayment` below), instead of the
 * old Module 12 behavior of marking every invoice Paid the instant it was
 * generated.
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
      payment_status: 'Pending',
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

/**
 * Task 14.3 — Payment confirmation. Moves a Completed pickup's invoice
 * from `'Pending'` to `'Paid'`. Kept as its own explicit action (rather
 * than folding it into `completePickup`) because in a real deployment
 * this is the step a payment gateway webhook — or, in this app's current
 * cash/UPI-collected-on-the-spot model, the partner themselves — would
 * trigger once money has actually changed hands, not the moment the
 * invoice number is generated.
 */
export async function confirmPayment(pickupId: number): Promise<boolean> {
  const { error } = await supabase
    .from('pickup_requests')
    .update({ payment_status: 'Paid' })
    .eq('id', pickupId)
    .eq('payment_status', 'Pending');

  if (error) {
    console.error('[EcoLoop] Confirming payment failed:', error.message);
    return false;
  }
  return true;
}
