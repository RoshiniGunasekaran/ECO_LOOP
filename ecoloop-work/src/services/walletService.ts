/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  WALLET SERVICE — Module 7 (Wallet)
 * ============================================================
 *  Every real database read/write for the Customer's "Wallet"
 *  tab lives here. CustomerModule.tsx never talks to `supabase`
 *  directly for wallet data — it calls these functions (via
 *  useCustomerWallet) instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Wallet balance was already made real in Module 5
 *    (`customerService.getDashboardStats` reads
 *    `customer_profiles.wallet_balance`) — this module's hook
 *    just reuses that same number, it doesn't refetch it.
 *  - Transaction history reads the real `transactions` table.
 *  - Bank account + UPI details are real reads/writes to the
 *    new `payout_methods` table (see module7_wallet_schema.sql).
 *  - "Withdrawal" creates a real row in the new
 *    `withdrawal_requests` table. Nothing in the app can
 *    actually move money yet — an admin approval flow (a later
 *    module) is what would mark a request 'Paid' and insert the
 *    matching real `transactions` row + decrement the wallet
 *    balance. Until then, submitting a withdrawal here queues a
 *    real, persisted request but does not instantly change your
 *    balance (unlike the old mock, which faked an instant transfer).
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface RealTransaction {
  id: number;
  type: 'Credit' | 'Withdrawal' | 'Refund' | 'Reward';
  amount: number;
  points: number | null;
  description: string | null;
  status: string;
  date: string;
}

export interface PayoutMethod {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  updatedAt: string | null;
}

export interface WithdrawalRequestRecord {
  id: number;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  requestedAt: string;
  processedAt: string | null;
}

const EMPTY_PAYOUT_METHOD: PayoutMethod = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  updatedAt: null,
};

/** Task 7.2 / 7.4 — Full transaction (payout logs) ledger, newest first. */
export async function getTransactions(userId: string, limit = 100): Promise<RealTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, points, description, status, txn_date')
    .eq('user_id', userId)
    .order('txn_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[EcoLoop] Fetching transactions failed:', error.message);
    return [];
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    points: t.points,
    description: t.description,
    status: t.status,
    date: t.txn_date,
  }));
}

/** Task 7.5 / 7.6 — Read the customer's linked bank account + UPI details. */
export async function getPayoutMethod(userId: string): Promise<PayoutMethod> {
  const { data, error } = await supabase
    .from('payout_methods')
    .select('account_holder_name, bank_name, account_number, ifsc_code, upi_id, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[EcoLoop] Fetching payout method failed:', error.message);
    return EMPTY_PAYOUT_METHOD;
  }
  if (!data) return EMPTY_PAYOUT_METHOD;

  return {
    accountHolderName: data.account_holder_name ?? '',
    bankName: data.bank_name ?? '',
    accountNumber: data.account_number ?? '',
    ifscCode: data.ifsc_code ?? '',
    upiId: data.upi_id ?? '',
    updatedAt: data.updated_at,
  };
}

/** Task 7.5 / 7.6 — Create or update the customer's bank/UPI details (one row per user). */
export async function savePayoutMethod(userId: string, method: Omit<PayoutMethod, 'updatedAt'>): Promise<boolean> {
  const { error } = await supabase.from('payout_methods').upsert(
    {
      user_id: userId,
      account_holder_name: method.accountHolderName || null,
      bank_name: method.bankName || null,
      account_number: method.accountNumber || null,
      ifsc_code: method.ifscCode || null,
      upi_id: method.upiId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[EcoLoop] Saving payout method failed:', error.message);
    return false;
  }
  return true;
}

/** Task 7.4 — Withdrawal request history (separate from the transactions ledger). */
export async function getWithdrawalRequests(userId: string): Promise<WithdrawalRequestRecord[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, status, requested_at, processed_at')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching withdrawal requests failed:', error.message);
    return [];
  }

  return (data ?? []).map((w) => ({
    id: w.id,
    amount: Number(w.amount),
    status: w.status,
    requestedAt: w.requested_at,
    processedAt: w.processed_at,
  }));
}

/**
 * Task 7.3 — Submit a withdrawal request. This does NOT instantly move money
 * or change the wallet balance (see file header) — it queues a real,
 * persisted request. The database itself also re-checks that `amount` does
 * not exceed the real wallet balance (see the RLS policy in
 * module7_wallet_schema.sql), so this is safe even if the UI's own check is
 * ever bypassed.
 */
export async function submitWithdrawalRequest(
  userId: string,
  amount: number,
  payoutSnapshot: Omit<PayoutMethod, 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: userId,
    amount,
    payout_snapshot: payoutSnapshot,
    status: 'Pending',
  });

  if (error) {
    console.error('[EcoLoop] Submitting withdrawal request failed:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}
