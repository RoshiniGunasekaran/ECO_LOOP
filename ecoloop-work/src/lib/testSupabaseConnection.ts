/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  TEMPORARY CONNECTION TEST — Module 2 verification only
 * ============================================================
 *  What this does, in plain English:
 *  It asks Supabase one simple, harmless question: "is anyone
 *  currently logged in?" It doesn't need any real database
 *  tables to exist yet — it's just checking that the app can
 *  successfully reach YOUR Supabase project using the URL and
 *  key you put in .env.local.
 *
 *  - If your .env.local values are correct: you'll see a green
 *    success message in the browser console.
 *  - If they're wrong/missing: you'll see a clear red error
 *    message explaining what to check.
 *
 *  This file is safe to delete once you've confirmed the
 *  connection works — it's a one-time diagnostic tool, not
 *  part of the real app.
 * ============================================================
 */

import { supabase } from './supabaseClient';

export async function testSupabaseConnection() {
  console.log('%c[EcoLoop] Testing Supabase connection...', 'color: #64748b');

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error(
      '%c[EcoLoop] ❌ Supabase connection FAILED.',
      'color: #dc2626; font-weight: bold; font-size: 14px'
    );
    console.error('Details:', error.message);
    console.warn(
      'Checklist:\n' +
      '1. Did you create .env.local (not just .env.example)?\n' +
      '2. Did you paste your REAL Project URL and anon key (no extra spaces/quotes issues)?\n' +
      '3. Did you restart "npm run dev" after editing .env.local?'
    );
    return;
  }

  console.log(
    '%c[EcoLoop] ✅ Supabase connected successfully!',
    'color: #059669; font-weight: bold; font-size: 14px'
  );
  console.log(
    'Current session:',
    data.session ? 'A user is logged in' : 'No user logged in yet (this is expected — totally normal at this stage)'
  );
}
