/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  PICKUP SERVICE — Module 6 (Pickup Management)
 * ============================================================
 *  Every real database read/write for the Customer's "Create
 *  Pickup" and "My Pickup Requests" tabs lives here.
 *  CustomerModule.tsx never talks to `supabase` directly for
 *  pickups — it calls these functions (via useCustomerPickups)
 *  instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Create, edit (while Pending), cancel, list, and view-detail
 *    are all real Supabase reads/writes now.
 *  - Waste photos are uploaded to the real `pickup-photos`
 *    storage bucket (created in Module 2) and linked via the
 *    real `pickup_images` table.
 *  - "Live tracking" reads the real `partner_id` /
 *    `partner_location_lat` / `partner_location_lng` columns,
 *    but nothing in the app can actually SET those yet — that's
 *    Module 13 (Delivery Partner → Pickup Operations). Until
 *    then, a pickup will only show as "assigned" if you assign
 *    it manually in Supabase's Table Editor.
 *  - "Delete pickup" is implemented as CANCEL (status update),
 *    not a hard row delete — Module 3's RLS intentionally gives
 *    customers no delete policy on pickup_requests (only admins
 *    delete data), so a real delete would just fail silently.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export type PickupCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export type PickupStatusValue =
  | 'Pending'
  | 'Assigned'
  | 'In-Transit'
  | 'Arrived'
  | 'Collected'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface NewPickupInput {
  category: string;
  subcategory: string;
  condition: PickupCondition;
  estimatedWeight: number;
  quantity: number;
  pickupAddress: string;
  landmark?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  specialInstructions?: string;
  estimatedAmount: number;
}

export interface EditablePickupInput {
  category?: string;
  subcategory?: string;
  condition?: PickupCondition;
  estimatedWeight?: number;
  quantity?: number;
  pickupAddress?: string;
  landmark?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  specialInstructions?: string;
  estimatedAmount?: number;
}

export interface PickupFeedbackInfo {
  customerRating: number | null;
  customerComment: string | null;
}

export interface RealPickup {
  id: number;
  category: string;
  subcategory: string;
  condition: string;
  estimatedWeight: number;
  actualWeight: number | null;
  quantity: number;
  pickupAddress: string;
  landmark: string | null;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  specialInstructions: string | null;
  status: PickupStatusValue;
  partnerId: string | null;
  partnerName: string | null;
  partnerPhone: string | null;
  partnerLocation: { lat: number; lng: number } | null;
  estimatedAmount: number;
  finalAmount: number | null;
  paymentStatus: string;
  invoiceId: string | null;
  createdAt: string;
  images: string[];
  feedback: PickupFeedbackInfo | null;
}

const PICKUP_PHOTOS_BUCKET = 'pickup-photos';

/** Uploads waste photos for a pickup and links them via `pickup_images`. Best-effort per file. */
async function uploadPickupImages(userId: string, pickupId: number, files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${userId}/${pickupId}/${Date.now()}-${i}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PICKUP_PHOTOS_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('[EcoLoop] Pickup image upload failed:', uploadError.message);
      continue; // Don't let one bad photo block the rest of the request.
    }

    const { data: publicUrlData } = supabase.storage.from(PICKUP_PHOTOS_BUCKET).getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

    const { error: linkError } = await supabase
      .from('pickup_images')
      .insert({ pickup_id: pickupId, image_url: imageUrl });

    if (linkError) {
      console.error('[EcoLoop] Linking pickup image failed:', linkError.message);
      continue;
    }

    urls.push(imageUrl);
  }

  return urls;
}

/** Adds more waste photos to an existing pickup (used from the Edit flow). */
export async function addImagesToPickup(userId: string, pickupId: number, files: File[]): Promise<string[]> {
  return uploadPickupImages(userId, pickupId, files);
}

/** Task 6.1 — Create pickup. Inserts the request, then uploads any waste photos. */
export async function createPickup(
  userId: string,
  input: NewPickupInput,
  imageFiles: File[] = []
): Promise<number | null> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .insert({
      customer_id: userId,
      category: input.category,
      subcategory: input.subcategory,
      condition: input.condition,
      estimated_weight: input.estimatedWeight,
      quantity: input.quantity,
      pickup_address: input.pickupAddress,
      landmark: input.landmark || null,
      preferred_date: input.preferredDate,
      preferred_time: input.preferredTime,
      notes: input.notes || null,
      special_instructions: input.specialInstructions || null,
      status: 'Pending',
      estimated_amount: input.estimatedAmount,
      payment_status: 'Unpaid',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[EcoLoop] Create pickup failed:', error?.message);
    return null;
  }

  if (imageFiles.length) {
    await uploadPickupImages(userId, data.id, imageFiles);
  }

  return data.id;
}

/** Task 6.2 — Edit pickup. RLS only allows this while status is still 'Pending'. */
export async function updatePickup(pickupId: number, updates: EditablePickupInput): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.subcategory !== undefined) payload.subcategory = updates.subcategory;
  if (updates.condition !== undefined) payload.condition = updates.condition;
  if (updates.estimatedWeight !== undefined) payload.estimated_weight = updates.estimatedWeight;
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.pickupAddress !== undefined) payload.pickup_address = updates.pickupAddress;
  if (updates.landmark !== undefined) payload.landmark = updates.landmark || null;
  if (updates.preferredDate !== undefined) payload.preferred_date = updates.preferredDate;
  if (updates.preferredTime !== undefined) payload.preferred_time = updates.preferredTime;
  if (updates.notes !== undefined) payload.notes = updates.notes || null;
  if (updates.specialInstructions !== undefined) payload.special_instructions = updates.specialInstructions || null;
  if (updates.estimatedAmount !== undefined) payload.estimated_amount = updates.estimatedAmount;

  const { error } = await supabase.from('pickup_requests').update(payload).eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Update pickup failed:', error.message);
    return false;
  }
  return true;
}

/** Task 6.3 — "Delete" pickup. Implemented as a status change to 'Cancelled' (see file header). */
export async function cancelPickup(pickupId: number): Promise<boolean> {
  const { error } = await supabase
    .from('pickup_requests')
    .update({ status: 'Cancelled' })
    .eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Cancel pickup failed:', error.message);
    return false;
  }
  return true;
}

/** Task 6.4 / 6.5 — View pickup + pickup history. Returns every pickup for this customer, newest first. */
export async function getPickups(userId: string): Promise<RealPickup[]> {
  const { data: pickupRows, error } = await supabase
    .from('pickup_requests')
    .select(
      'id, category, subcategory, condition, estimated_weight, actual_weight, quantity, pickup_address, landmark, preferred_date, preferred_time, notes, special_instructions, status, partner_id, partner_location_lat, partner_location_lng, estimated_amount, final_amount, payment_status, invoice_id, created_at'
    )
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching pickups failed:', error.message);
    return [];
  }
  if (!pickupRows || pickupRows.length === 0) return [];

  const pickupIds = pickupRows.map((p) => p.id);
  const partnerIds = Array.from(new Set(pickupRows.map((p) => p.partner_id).filter((id): id is string => !!id)));

  const [imagesResult, feedbackResult, partnersResult] = await Promise.all([
    supabase.from('pickup_images').select('pickup_id, image_url').in('pickup_id', pickupIds),
    supabase.from('pickup_feedback').select('pickup_id, customer_rating, customer_comment').in('pickup_id', pickupIds),
    partnerIds.length
      ? supabase.from('profiles').select('id, full_name, phone').in('id', partnerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const imagesByPickup = new Map<number, string[]>();
  (imagesResult.data ?? []).forEach((img) => {
    const list = imagesByPickup.get(img.pickup_id) ?? [];
    list.push(img.image_url);
    imagesByPickup.set(img.pickup_id, list);
  });

  const feedbackByPickup = new Map<number, PickupFeedbackInfo>();
  (feedbackResult.data ?? []).forEach((fb) => {
    feedbackByPickup.set(fb.pickup_id, {
      customerRating: fb.customer_rating,
      customerComment: fb.customer_comment,
    });
  });

  const partnerById = new Map<string, { full_name: string; phone: string | null }>();
  (partnersResult.data ?? []).forEach((p: any) => {
    partnerById.set(p.id, { full_name: p.full_name, phone: p.phone ?? null });
  });

  return pickupRows.map((p) => {
    const partner = p.partner_id ? partnerById.get(p.partner_id) : undefined;
    return {
      id: p.id,
      category: p.category,
      subcategory: p.subcategory ?? '',
      condition: p.condition ?? 'Good',
      estimatedWeight: Number(p.estimated_weight),
      actualWeight: p.actual_weight === null ? null : Number(p.actual_weight),
      quantity: p.quantity,
      pickupAddress: p.pickup_address,
      landmark: p.landmark,
      preferredDate: p.preferred_date,
      preferredTime: p.preferred_time,
      notes: p.notes,
      specialInstructions: p.special_instructions,
      status: p.status as PickupStatusValue,
      partnerId: p.partner_id,
      partnerName: partner?.full_name ?? null,
      partnerPhone: partner?.phone ?? null,
      partnerLocation:
        p.partner_location_lat !== null && p.partner_location_lng !== null
          ? { lat: Number(p.partner_location_lat), lng: Number(p.partner_location_lng) }
          : null,
      estimatedAmount: Number(p.estimated_amount),
      finalAmount: p.final_amount === null ? null : Number(p.final_amount),
      paymentStatus: p.payment_status,
      invoiceId: p.invoice_id,
      createdAt: p.created_at,
      images: imagesByPickup.get(p.id) ?? [],
      feedback: feedbackByPickup.get(p.id) ?? null,
    };
  });
}

/** Task 6.6 — Submit (or update) a rating + comment for a completed pickup. */
export async function submitPickupFeedback(pickupId: number, rating: number, comment: string): Promise<boolean> {
  const { error } = await supabase
    .from('pickup_feedback')
    .upsert({ pickup_id: pickupId, customer_rating: rating, customer_comment: comment }, { onConflict: 'pickup_id' });

  if (error) {
    console.error('[EcoLoop] Submitting pickup feedback failed:', error.message);
    return false;
  }
  return true;
}

/** Real per-Kg pricing, read from Module 3's `pricing_rates` table (replaces the old mock rate table). */
export async function getPricingRates(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('pricing_rates').select('category, price_per_kg');

  if (error) {
    console.error('[EcoLoop] Fetching pricing rates failed:', error.message);
    return {};
  }

  const rates: Record<string, number> = {};
  (data ?? []).forEach((r) => {
    rates[r.category] = Number(r.price_per_kg);
  });
  return rates;
}