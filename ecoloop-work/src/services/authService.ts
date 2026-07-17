/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  AUTH SERVICE — Module 4
 * ============================================================
 *  Every real authentication action (signup, login, logout,
 *  password reset, session/profile lookup) goes through this
 *  one file. Nothing else in the app should call
 *  `supabase.auth.*` directly — that keeps error handling and
 *  the shape of results consistent everywhere.
 *
 *  How signup carries role-specific data:
 *  We pass everything (role, full name, phone, vehicle info,
 *  company info, etc.) as Supabase Auth "user metadata" on
 *  signUp. A Postgres trigger (see
 *  supabase/module4_auth_trigger.sql) reads that metadata the
 *  moment the auth.users row is created and automatically
 *  builds the matching `profiles` (+ `customer_profiles` /
 *  `partner_profiles` / `industry_profiles`) rows. The frontend
 *  never inserts into `profiles` directly — the trigger is the
 *  single source of truth, so a user can never end up "half
 *  signed up".
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';
import { AuthResult, Profile, SignUpPayload, UserRole } from '../types';

/** Turns any Supabase/JS error into a short, user-friendly message. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (m.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email address before logging in. Check your inbox for the verification link.';
  }
  if (m.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (m.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}

/** Task 4.1 — Email Signup */
export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  const { email, password, ...rest } = payload;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Everything the DB trigger needs to build profiles / role-specific rows.
      data: {
        role: rest.role,
        full_name: rest.fullName,
        phone: rest.phone ?? null,
        address: rest.address ?? null,
        city: rest.city ?? null,
        state: rest.state ?? null,
        pincode: rest.pincode ?? null,
        vehicle_type: rest.vehicleType ?? null,
        vehicle_number: rest.vehicleNumber ?? null,
        driving_license: rest.drivingLicense ?? null,
        aadhaar_number: rest.aadhaarNumber ?? null,
        company_name: rest.companyName ?? null,
        industry_type: rest.industryType ?? null,
        gst_number: rest.gstNumber ?? null,
        registration_number: rest.regNumber ?? null,
        contact_person: rest.contactPerson ?? null,
      },
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });

  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }

  // Supabase returns a user with an empty `identities` array when the email
  // is already registered but unconfirmed — treat that as a duplicate, not a success.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { success: false, error: 'An account with this email already exists. Try logging in instead.' };
  }

  // If email confirmations are enabled in the Supabase dashboard, there will be
  // no session yet — the caller should show the "verify your email" screen.
  const needsEmailVerification = !data.session;

  return { success: true, needsEmailVerification };
}

/** Task 4.2 — Email Login */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }

  return { success: true };
}

/** Task 4.3 — Logout */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }
  return { success: true };
}

/** Task 4.4 — Forgot Password (sends the reset email) */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!email) {
    return { success: false, error: 'Please enter your account email.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}`,  });
  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }
  return { success: true };
}

/** Task 4.5 — Reset Password (sets the new password once the recovery link is opened) */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }
  return { success: true };
}

/** Task 4.6 — Email Verification (resend the confirmation link) */
export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  });

  if (error) {
    return { success: false, error: friendlyError(error.message) };
  }
  return { success: true };
}

/** Task 4.7 helper — fetch the `profiles` row for a logged-in user (drives role + session state). */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_code, role, status, full_name, email, phone, address, city, state, pincode, profile_pic_url, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[EcoLoop] Failed to fetch profile:', error.message);
    return null;
  }

  const profile: Profile = {
    id: data.id,
    displayCode: data.display_code,
    role: data.role as UserRole as Exclude<UserRole, 'public'>,
    status: data.status,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    profilePicUrl: data.profile_pic_url,
    createdAt: data.created_at,
  };
  return profile;
}