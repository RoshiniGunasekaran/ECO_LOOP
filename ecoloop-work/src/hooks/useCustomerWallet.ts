/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerWallet — Module 7 (Wallet)
 * ============================================================
 *  Loads the logged-in customer's real transaction ledger,
 *  payout method (bank/UPI), and withdrawal request history,
 *  and exposes actions to save payout details and submit a
 *  withdrawal request.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as walletService from '../services/walletService';
import type { PayoutMethod, RealTransaction, WithdrawalRequestRecord } from '../services/walletService';

interface UseCustomerWalletResult {
  loading: boolean;
  transactions: RealTransaction[];
  payoutMethod: PayoutMethod;
  withdrawalRequests: WithdrawalRequestRecord[];
  refresh: () => Promise<void>;
  savePayoutMethod: (method: Omit<PayoutMethod, 'updatedAt'>) => Promise<boolean>;
  submitWithdrawalRequest: (amount: number) => Promise<{ success: boolean; error?: string }>;
}

export function useCustomerWallet(): UseCustomerWalletResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<RealTransaction[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    updatedAt: null,
  });
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [txResult, payoutResult, withdrawalsResult] = await Promise.all([
      walletService.getTransactions(userId),
      walletService.getPayoutMethod(userId),
      walletService.getWithdrawalRequests(userId),
    ]);
    setTransactions(txResult);
    setPayoutMethod(payoutResult);
    setWithdrawalRequests(withdrawalsResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const savePayoutMethod = useCallback(
    async (method: Omit<PayoutMethod, 'updatedAt'>) => {
      if (!userId) return false;
      const ok = await walletService.savePayoutMethod(userId, method);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const submitWithdrawalRequest = useCallback(
    async (amount: number) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      const result = await walletService.submitWithdrawalRequest(userId, amount, payoutMethod);
      if (result.success) await load();
      return result;
    },
    [userId, payoutMethod, load]
  );

  return {
    loading,
    transactions,
    payoutMethod,
    withdrawalRequests,
    refresh: load,
    savePayoutMethod,
    submitWithdrawalRequest,
  };
}
