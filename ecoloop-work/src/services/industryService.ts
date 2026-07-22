/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  INDUSTRY SERVICE — Module 16 (Industry Dashboard)
 * ============================================================
 *  Every real database read/write for the Industry's "Overview
 *  Metrics", "Warehouse Silos", and "Material Yield Reports"
 *  tabs lives here. IndustryModule.tsx never talks to `supabase`
 *  directly for this data — it calls these functions (via
 *  useIndustryDashboard) instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Company identity (name/email/GST/registration/contact
 *    person/phone) and the all-time `waste_received_kg` /
 *    `deliveries_count` counters are real reads against
 *    `profiles` + `industry_profiles` now.
 *  - Warehouse silo stock levels are real reads/writes against
 *    the new `industry_inventory` table (Module 16 schema) —
 *    replacing the old page-load-only `useState` mock.
 *  - Reports (CO2 mitigation estimate, reclaimed value estimate)
 *    are computed client-side from the real numbers above, using
 *    the same kind of clearly-documented placeholder conversion
 *    factors this project already uses elsewhere (e.g. the fixed
 *    4.2 km/pickup distance estimate in `partnerService.ts`) —
 *    not hardcoded mock totals. *  - "Incoming Bulk Cargo" (accept/reject a delivery) and "Processing
 *    Status" (advancing a claimed delivery through its stages) are real
 *    Supabase reads/writes now too (Module 17) — see the functions below
 *    `computeReportStats`. Rejecting a delivery is still a client-only
 *    session filter, same as the Partner side's "Ignore" button — nothing
 *    to persist there. *  - Editing company information (name/type/GST/registration),
 *    contact details, uploading GST/registration document photos,
 *    and the email-notifications setting are real Supabase
 *    reads/writes now too (Module 18) — see the functions below
 *    `advanceProcessingStatus`.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';
import type { WasteCategory } from '../types';

export type IndustryProcessingStatus = 'Received' | 'Sorting' | 'Processing' | 'Completed';

export interface IndustryDelivery {
  id: number;
  category: string;
  subcategory: string;
  estimatedWeight: number;
  actualWeight: number | null;
  partnerId: string | null;
  partnerName: string;
  partnerPhone: string | null;
  pickupAddress: string;
  status: string;
  industryProcessingStatus: IndustryProcessingStatus | null;
  createdAt: string;
}

export interface RealIndustryProfile {
  id: string;
  displayCode: string | null;
  companyName: string;
  email: string;
  phone: string | null;
  address: string | null;
  industryType: string | null;
  gstNumber: string | null;
  regNumber: string | null;
  contactPerson: string | null;
  wasteReceivedKg: number;
  deliveriesCount: number;
  /** Module 18 — uploaded document photo URLs (null until uploaded). */
  gstDocUrl: string | null;
  registrationDocUrl: string | null;
  emailNotificationsEnabled: boolean;
  status: 'Active' | 'Suspended' | 'Pending Approval';
}

export interface InventoryItem {
  category: string;
  quantityKg: number;
  capacityKg: number;
  location: string | null;
  updatedAt: string;
}

export interface IndustryReportStats {
  wasteReceivedKg: number;
  deliveriesCount: number;
  /** Estimated tons of CO2 emissions avoided — see DEFAULT_CO2_FACTOR below for the conversion used. */
  co2MitigatedTons: number;
  /** Estimated reclaimed raw-material value in ₹ — see DEFAULT_VALUE_PER_KG below. */
  reclaimedValueEstimate: number;
  totalInventoryKg: number;
  totalInventoryCapacityKg: number;
}

/**
 * Default silo categories seeded for every industry account on first
 * Dashboard load — matches the 6 categories the old mock UI hardcoded, so
 * behavior looks identical on day one, but now backed by real per-industry
 * rows instead of a `useState` that reset on every refresh.
 */
const DEFAULT_INVENTORY: { category: WasteCategory; capacityKg: number; location: string }[] = [
  { category: 'Paper', capacityKg: 20000, location: 'Silo A-1' },
  { category: 'Plastic', capacityKg: 15000, location: 'Silo B-4' },
  { category: 'Glass', capacityKg: 10000, location: 'Dry Shed 2' },
  { category: 'Metal', capacityKg: 12000, location: 'Heavy Yard' },
  { category: 'E-Waste', capacityKg: 5000, location: 'Secure Vault' },
  { category: 'Organic', capacityKg: 8000, location: 'Compost Bin 1' },
];

/** Documented estimate, same spirit as the fixed 4.2km/pickup placeholder in partnerService.ts. */
const DEFAULT_CO2_FACTOR_TONS_PER_KG = 0.0009; // ~0.9kg CO2 avoided per Kg recycled
const DEFAULT_VALUE_PER_KG = 42; // ₹ estimated reclaimed material value per Kg

/** Task 16.1 — Dashboard. Reads the real `profiles` + `industry_profiles` row. */
export async function getIndustryProfile(userId: string): Promise<RealIndustryProfile | null> {
  const [profileResult, industryResult] = await Promise.all([
    supabase.from('profiles').select('id, display_code, full_name, email, phone, address, status').eq('id', userId).single(),
    supabase
      .from('industry_profiles')
      .select('company_name, industry_type, gst_number, registration_number, contact_person, waste_received_kg, deliveries_count, gst_doc_url, registration_doc_url, email_notifications_enabled')
      .eq('user_id', userId)
      .single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    console.error('[EcoLoop] Fetching industry profile failed:', profileResult.error?.message);
    return null;
  }
  if (industryResult.error || !industryResult.data) {
    console.error('[EcoLoop] Fetching industry_profiles row failed:', industryResult.error?.message);
    return null;
  }

  const p = profileResult.data;
  const ip = industryResult.data;

  return {
    id: p.id,
    displayCode: p.display_code,
    companyName: ip.company_name,
    email: p.email,
    phone: p.phone,
    address: p.address,
    industryType: ip.industry_type,
    gstNumber: ip.gst_number,
    regNumber: ip.registration_number,
    contactPerson: ip.contact_person,
    wasteReceivedKg: Number(ip.waste_received_kg),
    deliveriesCount: ip.deliveries_count,
    gstDocUrl: ip.gst_doc_url,
    registrationDocUrl: ip.registration_doc_url,
    emailNotificationsEnabled: ip.email_notifications_enabled,
    status: p.status,
  };
}

function mapInventoryRow(row: any): InventoryItem {
  return {
    category: row.category,
    quantityKg: Number(row.quantity_kg),
    capacityKg: Number(row.capacity_kg),
    location: row.location,
    updatedAt: row.updated_at,
  };
}

/**
 * Task 16.2 — Inventory. Reads this industry's real silo rows, seeding the
 * 6 default categories (idempotently, via `upsert ... ignoreDuplicates`) on
 * an account's very first load so the grid isn't empty on day one.
 */
export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const seedRows = DEFAULT_INVENTORY.map((d) => ({
    industry_id: userId,
    category: d.category,
    quantity_kg: 0,
    capacity_kg: d.capacityKg,
    location: d.location,
  }));

  const { error: seedError } = await supabase
    .from('industry_inventory')
    .upsert(seedRows, { onConflict: 'industry_id,category', ignoreDuplicates: true });

  if (seedError) {
    // Non-fatal — if seeding fails (e.g. rows already exist from a race), just read whatever's there.
    console.error('[EcoLoop] Seeding default inventory rows failed:', seedError.message);
  }

  const { data, error } = await supabase
    .from('industry_inventory')
    .select('category, quantity_kg, capacity_kg, location, updated_at')
    .eq('industry_id', userId)
    .order('category', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Fetching inventory failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapInventoryRow);
}

/** Task 16.3 — Statistics / Task 16.4 — Reports. Pure computation from real profile + inventory data. */
export function computeReportStats(profile: RealIndustryProfile, inventory: InventoryItem[]): IndustryReportStats {
  const totalInventoryKg = inventory.reduce((sum, i) => sum + i.quantityKg, 0);
  const totalInventoryCapacityKg = inventory.reduce((sum, i) => sum + i.capacityKg, 0);

  return {
    wasteReceivedKg: profile.wasteReceivedKg,
    deliveriesCount: profile.deliveriesCount,
    co2MitigatedTons: parseFloat((profile.wasteReceivedKg * DEFAULT_CO2_FACTOR_TONS_PER_KG).toFixed(2)),
    reclaimedValueEstimate: parseFloat((profile.wasteReceivedKg * DEFAULT_VALUE_PER_KG).toFixed(2)),
    totalInventoryKg,
    totalInventoryCapacityKg,
  };
}

// ============================================================================
// MODULE 17 — WASTE MANAGEMENT (Industry side)
// ============================================================================

const DELIVERY_COLUMNS =
  'id, category, subcategory, estimated_weight, actual_weight, partner_id, pickup_address, status, industry_processing_status, created_at';

function mapDeliveryRow(row: any, partnerById: Map<string, { full_name: string; phone: string | null }>): IndustryDelivery {
  const partner = row.partner_id ? partnerById.get(row.partner_id) : undefined;
  return {
    id: row.id,
    category: row.category,
    subcategory: row.subcategory ?? '',
    estimatedWeight: Number(row.estimated_weight),
    actualWeight: row.actual_weight === null ? null : Number(row.actual_weight),
    partnerId: row.partner_id,
    partnerName: partner?.full_name ?? 'Eco-Driver',
    partnerPhone: partner?.phone ?? null,
    pickupAddress: row.pickup_address,
    status: row.status,
    industryProcessingStatus: row.industry_processing_status,
    createdAt: row.created_at,
  };
}

async function attachPartnerInfo(rows: any[]): Promise<IndustryDelivery[]> {
  if (rows.length === 0) return [];
  const partnerIds = Array.from(new Set(rows.map((r) => r.partner_id).filter(Boolean)));

  const { data, error } = partnerIds.length
    ? await supabase.from('profiles').select('id, full_name, phone').in('id', partnerIds)
    : { data: [], error: null };

  if (error) {
    console.error('[EcoLoop] Fetching carrier info for deliveries failed:', error.message);
  }

  const partnerById = new Map<string, { full_name: string; phone: string | null }>();
  (data ?? []).forEach((p: any) => partnerById.set(p.id, { full_name: p.full_name, phone: p.phone ?? null }));

  return rows.map((r) => mapDeliveryRow(r, partnerById));
}

/** Task 17.1 — Incoming waste. Every real Partner-completed pickup nobody has claimed yet. */
export async function getAvailableDeliveries(): Promise<IndustryDelivery[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(DELIVERY_COLUMNS)
    .eq('status', 'Completed')
    .is('assigned_industry_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Fetching available deliveries failed:', error.message);
    return [];
  }
  return attachPartnerInfo(data ?? []);
}

/** Task 17.6 — History. Every delivery this industry has ever claimed, at any stage. */
export async function getIndustryDeliveries(userId: string): Promise<IndustryDelivery[]> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(DELIVERY_COLUMNS)
    .eq('assigned_industry_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching industry deliveries failed:', error.message);
    return [];
  }
  return attachPartnerInfo(data ?? []);
}

/**
 * Task 17.2 — Accept delivery. Atomically claims the pickup, adds its
 * weight to the matching silo, and bumps the real stat counters (via the
 * `accept_industry_delivery` Postgres function, Module 17 schema).
 */
export async function acceptDelivery(userId: string, pickupId: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('accept_industry_delivery', {
    p_pickup_id: pickupId,
    p_user_id: userId,
  });

  if (error) {
    console.error('[EcoLoop] Accepting delivery failed:', error.message);
    return { success: false, error: 'This cargo may have already been claimed by another facility. Refreshing…' };
  }
  return { success: true };
}

const PROCESSING_STAGE_ORDER: IndustryProcessingStatus[] = ['Received', 'Sorting', 'Processing', 'Completed'];

/** Task 17.4 — Processing. Advances a claimed delivery to its next real stage. */
export async function advanceProcessingStatus(
  pickupId: number,
  currentStatus: IndustryProcessingStatus
): Promise<{ success: boolean; error?: string }> {
  const currentIndex = PROCESSING_STAGE_ORDER.indexOf(currentStatus);
  const next = PROCESSING_STAGE_ORDER[Math.min(currentIndex + 1, PROCESSING_STAGE_ORDER.length - 1)];

  const { error } = await supabase
    .from('pickup_requests')
    .update({ industry_processing_status: next })
    .eq('id', pickupId);

  if (error) {
    console.error('[EcoLoop] Advancing processing status failed:', error.message);
    return { success: false, error: 'Could not update the processing stage. Please try again.' };
  }
  return { success: true };
}

// ============================================================================
// MODULE 18 — INDUSTRY PROFILE
// ============================================================================

export interface IndustryCompanyInfoInput {
  companyName: string;
  industryType: string;
  gstNumber: string;
  regNumber: string;
}

/** Task 18.1 — Company information. Updates the real `industry_profiles` row. */
export async function updateCompanyInformation(
  userId: string,
  input: IndustryCompanyInfoInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.companyName.trim()) {
    return { success: false, error: 'Company name cannot be empty.' };
  }

  const { error } = await supabase
    .from('industry_profiles')
    .update({
      company_name: input.companyName.trim(),
      industry_type: input.industryType.trim() || null,
      gst_number: input.gstNumber.trim() || null,
      registration_number: input.regNumber.trim() || null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Company information update failed:', error.message);
    return { success: false, error: 'Could not save your changes. Please try again.' };
  }
  return { success: true };
}

export interface IndustryContactInput {
  contactPerson: string;
  phone: string;
}

/** Task 18.3 — Contact. Updates `industry_profiles.contact_person` + the shared `profiles.phone`. */
export async function updateContactDetails(
  userId: string,
  input: IndustryContactInput
): Promise<{ success: boolean; error?: string }> {
  const [industryResult, profileResult] = await Promise.all([
    supabase
      .from('industry_profiles')
      .update({ contact_person: input.contactPerson.trim() || null })
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .update({ phone: input.phone.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', userId),
  ]);

  if (industryResult.error || profileResult.error) {
    console.error(
      '[EcoLoop] Contact details update failed:',
      industryResult.error?.message,
      profileResult.error?.message
    );
    return { success: false, error: 'Could not save your changes. Please try again.' };
  }
  return { success: true };
}

const INDUSTRY_DOCUMENTS_BUCKET = 'industry-documents';

/**
 * Task 18.2 — Documents. Uploads a GST or registration certificate photo
 * to the `industry-documents` bucket and saves its public URL onto the
 * matching `industry_profiles` column. Best-effort — returns null on
 * failure, same pattern as `uploadPartnerDocument` (Module 15).
 */
export async function uploadIndustryDocument(
  userId: string,
  docType: 'gst' | 'registration',
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${userId}/${docType}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(INDUSTRY_DOCUMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[EcoLoop] Industry document upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(INDUSTRY_DOCUMENTS_BUCKET).getPublicUrl(path);
  const url = publicUrlData.publicUrl;

  const column = docType === 'gst' ? 'gst_doc_url' : 'registration_doc_url';
  const { error: updateError } = await supabase
    .from('industry_profiles')
    .update({ [column]: url })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[EcoLoop] Saving new document URL failed:', updateError.message);
    return null;
  }

  return url;
}

/** Task 18.4 — Settings. The one real, persisted preference this module adds. */
export async function updateEmailNotificationSetting(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('industry_profiles')
    .update({ email_notifications_enabled: enabled })
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Updating notification setting failed:', error.message);
    return { success: false, error: 'Could not save your setting. Please try again.' };
  }
  return { success: true };
}
