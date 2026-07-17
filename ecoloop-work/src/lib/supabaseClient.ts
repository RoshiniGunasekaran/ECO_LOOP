/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  SUPABASE CLIENT — the single connection point to our
 *  real, live database (and later: auth + file storage).
 * ============================================================
 *
 *  WHAT THIS FILE DOES (plain English):
 *  Every other file in the app that needs to talk to the
 *  database (e.g. "save this pickup request", "get all
 *  customers") will import `supabase` from this one file.
 *  Think of it as the single phone line connecting our
 *  entire app to the Supabase servers.
 *
 *  WHERE THE VALUES COME FROM:
 *  The two values below (URL + anon key) are NOT secret
 *  passwords — they identify *which* Supabase project to
 *  talk to. Real protection comes later from "Row Level
 *  Security" rules we set up inside Supabase itself
 *  (Module 2 / Module 3).
 *
 *  They live in a `.env.local` file (see `.env.example` in
 *  the project root for the exact variable names to copy).
 *  Vite automatically makes any variable that starts with
 *  `VITE_` available in the code via `import.meta.env`.
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This warning only shows up in your browser's developer console.
  // It does not crash the app — it just means the Supabase pieces
  // won't work yet until you add your real project keys.
  console.warn(
    '[EcoLoop] Supabase environment variables are missing.\n' +
    'Copy .env.example to .env.local and fill in VITE_SUPABASE_URL ' +
    'and VITE_SUPABASE_ANON_KEY with your real Supabase project values.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
