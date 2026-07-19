# MODULE 7 — WALLET

## 1. Module Objective
Replace the Customer Module's **Wallet** tab with real Supabase reads and
writes: showing the real wallet balance, real transaction ledger, a real
linked bank account + UPI details form, and a real withdrawal request flow
(with request history). No other Customer Module tab is touched.

## 2. Frontend Pages / Screens
- Customer Module → Wallet tab (`CustomerModule.tsx`, `activeTab === 'wallet'`) — balance card, bank/UPI form, transactions ledger, withdrawal modal, withdrawal request history.

## 3. Supabase Tables Used
- `customer_profiles.wallet_balance` — read-only here (already made real back in Module 5's `getDashboardStats`; this module just reuses that number via `dashStats?.walletBalance` instead of refetching it).
- `transactions` — read-only, full ledger (Module 3's RLS gives customers **select-only** access here on purpose — see business rules).
- `payout_methods` — **new table** (this module), owner read/write. One row per customer holding their bank account + UPI details.
- `withdrawal_requests` — **new table** (this module), owner insert + select. A customer-submitted queue of "please pay me out" requests.

## 4. Storage Buckets
None needed for this module.

## 5. Authentication Rules
- `transactions_owner` (already existed, Module 3) — a customer can only `SELECT` their own transactions; no `INSERT` policy exists for customers on this table on purpose (see business rules).
- `payout_methods_owner` (**new**, this module) — a customer can read/write only their own row (`user_id = auth.uid()`); admins can also read.
- `withdrawal_requests_owner_select` (**new**) — a customer can only see their own requests; admins see all.
- `withdrawal_requests_owner_insert` (**new**) — a customer can only insert a request for themselves, only with `status = 'Pending'`, and only for an amount **less than or equal to their real wallet balance at the moment of the request** — enforced server-side via a subquery against `customer_profiles.wallet_balance`, not just in the UI.
- No `UPDATE`/`DELETE` policy exists yet for customers on `withdrawal_requests` — only a future admin approval module should be able to move a request out of `Pending`.

## 6. Functional Requirements (mapped to the roadmap's 6 tasks)
| Task | Requirement | Status |
|---|---|---|
| 7.1 | Wallet balance | ✅ Already real since Module 5 (`customer_profiles.wallet_balance`) — Wallet tab now reads the same real number instead of the mock `customer.walletBalance` |
| 7.2 | Transactions | ✅ `walletService.getTransactions` — full real ledger (up to 100 rows), newest first |
| 7.3 | Withdrawal | ✅ `walletService.submitWithdrawalRequest` — inserts a real, persisted request; see business rules for why it doesn't instantly move money |
| 7.4 | Payment history | ✅ `walletService.getWithdrawalRequests` — a dedicated request-status history (Pending/Approved/Rejected/Paid), separate from the transactions ledger |
| 7.5 | Bank account | ✅ `walletService.getPayoutMethod` / `savePayoutMethod` — real read/write to the new `payout_methods` table |
| 7.6 | UPI details | ✅ Same table/form as 7.5 — a UPI ID field was added to the (previously bank-only) mock form |

## 7. Business Rules
- **Withdrawal requests don't move money.** Module 3's `transactions` table gives customers `SELECT`-only access — there is intentionally no way for a customer to insert their own `Credit`/`Withdrawal` row, because that would let anyone fabricate a payout in their own favor. So task 7.3 is built as a genuinely new request queue (`withdrawal_requests`) instead: a customer can submit a request, but nothing in the app can mark it `Paid`, decrement the real wallet balance, or write the matching real `transactions` row — that requires an admin approval flow, which is a later module. This is the same "build the real, honest piece; call out the missing backend loop" pattern used for live tracking in Module 6.
- **A withdrawal request can never exceed the real balance**, and this is enforced by the database itself (see the RLS policy in `module7_wallet_schema.sql`), not only client-side — so even a modified frontend can't forge an oversized request.
- **One payout method per customer**, not a list of saved methods — this matches the original mock UI (a single "Update Account Details" form), so nothing about the design changed, only where the data lives. If you later want multiple saved methods, `payout_methods` would need `user_id` to stop being the primary key.
- **A snapshot of the payout method is stored with each withdrawal request** (`withdrawal_snapshot` in `withdrawal_requests`), so if a customer edits their bank details after requesting a payout, the original request still shows exactly where the money was supposed to go.

## 8. Database Operations
- **Create**: `savePayoutMethod` (upsert on `payout_methods`), `submitWithdrawalRequest` (insert on `withdrawal_requests`).
- **Read**: `getTransactions`, `getPayoutMethod`, `getWithdrawalRequests`.
- **Update**: `savePayoutMethod` (same upsert path handles both create and update).
- **Delete**: none.

## 9. Frontend Integration
- `src/services/walletService.ts` — new. Every Supabase call for this module lives here.
- `src/hooks/useCustomerWallet.ts` — new. Loads transactions + payout method + withdrawal request history in parallel, exposes `savePayoutMethod` and `submitWithdrawalRequest`.
- `src/components/CustomerModule.tsx` — modified:
  - Wallet balance card now reads `dashStats?.walletBalance` (Module 5's real number) instead of the mock `customer.walletBalance`.
  - The bank details form gained a UPI ID field, now loads the real saved payout method on mount, and actually persists on submit (previously it just showed an `alert()` and threw the input away).
  - The transactions ledger now renders `wlTransactions` (real) instead of the mock `transactions` array, with an empty-state message.
  - The withdrawal modal now submits a real request via `wlSubmitWithdrawalRequest`, shows real validation/server errors, and no longer instantly fakes a balance deduction.
  - A new **Withdrawal Request History** card was added below the ledger, showing each request's real status.

## 10. Edge Cases Handled
- No payout method saved yet → form renders empty instead of a fake "Chase Savings Hub" placeholder; withdrawal is blocked with a clear message until either a bank or a UPI ID is saved.
- No transactions yet → ledger shows an explanatory empty state instead of nothing.
- No withdrawal requests yet → history card shows an empty state.
- Withdrawal amount exceeds real balance → blocked both in the UI (compares against `dashStats?.walletBalance`) and by the database (RLS check), so it can't be bypassed.
- Withdrawal amount is 0/negative/NaN → blocked client-side before any network call.
- Saving payout details fails (network/RLS) → button shows an alert instead of silently pretending success.

## 11. Manual Testing Steps
1. Log in as your test Customer account, go to **Wallet**.
2. Confirm the balance shown matches `customer_profiles.wallet_balance` for your user in Supabase (this should already be true from Module 5 — Module 7 doesn't change how the balance is computed, only where else it's displayed).
3. Fill in the bank + UPI form and click **Update Account Details** → confirm it shows "Saving..." then "Saved ✓".
4. In Supabase Table Editor, confirm a row now exists in `payout_methods` with your real values.
5. Refresh the page → confirm the form reloads with the same saved values (not blank, not the old mock placeholders).
6. If your `wallet_balance` is 0, manually set it to something like `250.00` in `customer_profiles` for testing, then refresh.
7. Click **Withdraw to Bank account**, enter an amount **larger** than your balance → confirm it's rejected with an error and no row is created.
8. Enter a valid amount and submit → confirm the "Withdrawal Request Submitted!" success screen appears.
9. In Supabase, confirm a new row exists in `withdrawal_requests` with `status = 'Pending'` and a `payout_snapshot` matching what you had saved in `payout_methods`.
10. Refresh **Wallet** → confirm the new request appears under **Withdrawal Request History** with a "Pending" badge, and confirm your `wallet_balance` has **not** changed (this is expected — see business rules).
11. In Supabase, manually insert a row into `transactions` for your user (`type = 'Credit'`, any amount/description) → refresh **Wallet** → confirm it appears in the Payout Logs Ledger.
12. Click through every other Customer tab (Dashboard, Create Pickup, Pickups, Rewards, DIY, Community, Settings, Support) → confirm they still look and work exactly as before — untouched by Module 7.

## 12. Acceptance Criteria
- [ ] Wallet balance shown matches the real `customer_profiles.wallet_balance`.
- [ ] Saving bank/UPI details writes a real row to `payout_methods` and reloads correctly on refresh.
- [ ] Submitting a withdrawal request writes a real row to `withdrawal_requests` with `status = 'Pending'`, and is rejected (both client-side and by RLS) if it exceeds the real balance.
- [ ] The transactions ledger reads the real `transactions` table — no mock transactions remain reachable from the Wallet tab.
- [ ] Withdrawal Request History reflects real request rows and their real status.
- [ ] Every other Customer Module tab still works exactly as before — untouched by this module.
- [ ] `npx tsc --noEmit` and `npm run build` both succeed with no new errors.

## 13. Completion Report

**Files created**
- `supabase/module7_wallet_schema.sql` — adds `payout_methods` and `withdrawal_requests` (with RLS)
- `src/services/walletService.ts`
- `src/hooks/useCustomerWallet.ts`
- `docs/MODULE_7_WALLET.md` (this file)

**Files modified**
- `src/components/CustomerModule.tsx` — Wallet tab (balance, bank/UPI form, transactions ledger, withdrawal modal) plus a new withdrawal-history section rewired to real data (see `MODULE_7_IMPLEMENTATION_GUIDE.md` for the exact find/replace edits).

**Tables used:** `customer_profiles` (read-only, already real from Module 5), `transactions` (read-only, from Module 3), `payout_methods` (**new**), `withdrawal_requests` (**new**). **No storage buckets needed.**

**Verification performed:** `npx tsc --noEmit` → clean. `npm run build` → succeeded (1 pre-existing chunk-size warning, unrelated to this module).

**Features completed:** all 6 Module 7 tasks (7.1–7.6) per the table in section 6.

**Pending / explicitly out of scope for Module 7:**
- Actually moving money / approving withdrawal requests — needs an admin approval flow (a later module, likely alongside Module 19/20's Admin Dashboard + User Management) that would update `withdrawal_requests.status` and insert the matching real `transactions` row.
- Multiple saved payout methods per customer — current schema is one row per user by design (see business rules).
- Reward redemption (`handleRedeemReward`) still writes into the old mock `transactions` array, not the real table — that's Module 8 (Rewards)'s job, not this module's.

**Next module:** Module 8 — Rewards.
