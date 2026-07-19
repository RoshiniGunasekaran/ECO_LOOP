/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  PROFILE SERVICE — Module 11 (Customer Profile)
 * ============================================================
 *  Every real database read/write for the Customer Profile
 *  screen and the "Personal Account Profile" / "Credential
 *  Security" / "My Doorstep Locations" cards on the Settings
 *  tab lives here. CustomerModule.tsx never talks to `supabase`
 *  directly for this data — it calls these functions (via
 *  useCustomerProfile) instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Reading/editing full name, phone, address, city, state,
 *    pincode, and uploading a profile picture are all real
 *    Supabase reads/writes against `public.profiles` now.
 *  - Saved (doorstep collection) addresses — add, set default,
 *    delete — are real reads/writes against
 *    `public.saved_addresses` now, replacing the old mock array.
 *  - Change Password re-verifies the current password with a
 *    real `signInWithPassword` call before handing off to
 *    Module 4's existing `authService.updatePassword` — Module
 *    11 does not duplicate that logic, it just uses it.
 *  - Email verification status and account status ("Active" /
 *    "Suspended" / "Pending Approval") are read from the real
 *    session/profile row.
 *  - Notification preference toggles, the "Download My Recycled
 *    Logs" JSON export, active-session list, and the referral
 *    program are UNTOUCHED by this module and stay exactly as
 *    they were (cosmetic/local-only or belonging to a later
 *    module) — Module 11 only scopes to the Customer Profile
 *    module's own tasks.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface RealProfile {
  id: string;
  displayCode: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  profilePicUrl: string | null;
  status: 'Active' | 'Suspended' | 'Pending Approval';
  createdAt: string;
}

export interface ProfileUpdateInput {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RealSavedAddress {
  id: number;
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface NewSavedAddressInput {
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

function mapProfileRow(row: any): RealProfile {
  return {
    id: row.id,
    displayCode: row.display_code,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    profilePicUrl: row.profile_pic_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapAddressRow(row: any): RealSavedAddress {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    city: row.city ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    isDefault: row.is_default,
  };
}

/** Task 11.1 — Customer profile (read the real `profiles` row). */
export async function getProfile(userId: string): Promise<RealProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_code, full_name, email, phone, address, city, state, pincode, profile_pic_url, status, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[EcoLoop] Profile fetch failed:', error.message);
    return null;
  }
  return mapProfileRow(data);
}

/** Task 11.2 — Profile editing (personal information: name, phone, address). */
export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<{ success: boolean; error?: string }> {
  if (!input.fullName.trim()) {
    return { success: false, error: 'Full name cannot be empty.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      state: input.state.trim() || null,
      pincode: input.pincode.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[EcoLoop] Profile update failed:', error.message);
    return { success: false, error: 'Could not save your changes. Please try again.' };
  }
  return { success: true };
}

/**
 * Task 11.3 — Profile picture upload. Uploads to the real `profile-photos`
 * storage bucket, then saves the resulting public URL onto `profiles.profile_pic_url`.
 * Best-effort — returns null on failure instead of throwing.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${userId}/avatar-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[EcoLoop] Profile picture upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(path);
  const url = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ profile_pic_url: url, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) {
    console.error('[EcoLoop] Saving new profile picture URL failed:', updateError.message);
    return null;
  }

  return url;
}

/**
 * Task 11 (Change Password, under Account Information Management) — verifies
 * the current password with a real re-auth call before changing it, so a
 * logged-in-but-unattended session can't silently take over the password.
 */
export async function changePassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (verifyError) {
    return { success: false, error: 'Your old password is incorrect.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  return { success: true };
}

/** Task 11 (Address Management) — list the signed-in customer's saved addresses. */
export async function getSavedAddresses(userId: string): Promise<RealSavedAddress[]> {
  const { data, error } = await supabase
    .from('saved_addresses')
    .select('id, label, address, city, state, pincode, is_default')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('id', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Saved addresses fetch failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapAddressRow);
}

/** Task 11 (Address Management) — add a new doorstep collection address. */
export async function addSavedAddress(userId: string, input: NewSavedAddressInput): Promise<boolean> {
  const { count } = await supabase
    .from('saved_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { error } = await supabase.from('saved_addresses').insert({
    user_id: userId,
    label: input.label,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    is_default: (count ?? 0) === 0,
  });

  if (error) {
    console.error('[EcoLoop] Adding saved address failed:', error.message);
    return false;
  }
  return true;
}

/** Task 11 (Address Management) — make one saved address the default, unsetting all others. */
export async function setDefaultAddress(userId: string, addressId: number): Promise<boolean> {
  const { error: clearError } = await supabase
    .from('saved_addresses')
    .update({ is_default: false })
    .eq('user_id', userId);

  if (clearError) {
    console.error('[EcoLoop] Clearing previous default address failed:', clearError.message);
    return false;
  }

  const { error: setError } = await supabase
    .from('saved_addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId);

  if (setError) {
    console.error('[EcoLoop] Setting default address failed:', setError.message);
    return false;
  }
  return true;
}

/** Task 11 (Address Management) — delete a saved address. */
export async function deleteSavedAddress(userId: string, addressId: number): Promise<boolean> {
  const { error } = await supabase
    .from('saved_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Deleting saved address failed:', error.message);
    return false;
  }
  return true;
}
