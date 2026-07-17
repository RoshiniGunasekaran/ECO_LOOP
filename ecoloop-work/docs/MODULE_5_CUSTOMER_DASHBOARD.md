# MODULE 5 — CUSTOMER DASHBOARD

## 1. Module Objective
Replace the Customer Dashboard tab's mock/hard-coded numbers (wallet balance,
reward points, pending pickups, recent activity, notifications, and all 3
charts) with real data read from Supabase, without touching how the screen
looks or how any other Customer Module tab (Create Pickup, Wallet, Rewards,
DIY, Community, Settings, Support) works — those are wired to real data in
their own upcoming modules (6, 7, 9, 10, 11).

## 2. Frontend Pages / Screens
- Customer Module → Dashboard tab (`CustomerModule.tsx`, `activeTab === 'dashboard'`)
- Customer Module → Notification bell + slide-out panel (visible from every tab, both mobile header and desktop sidebar)

## 3. Supabase Tables Used (read-only in this module)
- `profiles` (full_name, profile_pic_url)
- `customer_profiles` (wallet_balance, reward_points, total_earnings)
- `pickup_requests` (count + recent rows + category/weight aggregation for the waste-distribution chart)
- `transactions` (recent rows + Credit-type aggregation for the earnings chart + Reward-type aggregation for the points chart)
- `notifications` (own rows + broadcast rows, and marking them read)

No new tables or columns were needed — Module 3's schema already covered everything this module reads.

## 4. Storage Buckets
None used in this module.

## 5. Authentication Rules
Everything in this module reads data scoped to `auth.uid()` (the logged-in
customer) via the RLS policies already defined in Module 3
(`pickups_customer_own`, `transactions_owner`, `notifications_owner_or_broadcast`).
No new policies were required.

## 6. Functional Requirements (mapped to the roadmap's 5 tasks)
| Task | Requirement | Status |
|---|---|---|
| 5.1 | Dashboard statistics | ✅ `customerService.getDashboardStats` — wallet balance, reward points, pending pickup count |
| 5.2 | Recent activity | ✅ `getRecentPickups` (last 3) + `getRecentTransactions` (last 3) |
| 5.3 | Notifications | ✅ `getNotifications` + `markAllNotificationsRead`, wired into the bell count and slide-out panel |
| 5.4 | Charts | ✅ `getMonthlyEarnings`, `getWasteDistribution`, `getPointsAccumulation` — all 3 dashboard charts now compute from real rows |
| 5.5 | Quick actions | ✅ Unchanged — "Request Doorstep Pickup" button was already just a tab-switch, no data dependency |

## 7. Business Rules
- Pending pickups = every pickup whose status is anything other than `Completed` or `Cancelled`.
- Waste distribution uses `actual_weight` when available (i.e. after a partner has weighed it), falling back to `estimated_weight` otherwise.
- Monthly earnings only counts `Credit`-type transactions (not withdrawals or rewards) across the last 5 calendar months, including months with ₹0 so the chart doesn't silently skip a month.
- Points accumulation is a **cumulative** running total across the last 4 weeks, matching the original chart's "accumulation" framing.
- Marking notifications read is a known, carried-over limitation: broadcast notifications (`user_id IS NULL`) share one row across every customer, so "mark all read" affects what every customer sees for that specific broadcast, not just you. A proper fix needs a separate per-user `notification_reads` table — intentionally out of scope here.

## 8. Database Operations
- **Read**: all 6 service functions in `customerService.ts` (see section 3).
- **Update**: `markAllNotificationsRead` (bulk `is_read = true` update).
- **Create / Delete**: none in this module.

## 9. Frontend Integration
- `src/services/customerService.ts` — new. Every Supabase call for this module lives here.
- `src/hooks/useCustomerDashboard.ts` — new. Loads all 7 pieces of data in parallel on mount, exposes them plus `refresh()` and `markAllNotificationsRead()`.
- `src/components/CustomerModule.tsx` — modified. The Dashboard tab's JSX now reads from the hook's `dash*`-prefixed values instead of the mock `customer` / `pickups` / `transactions` / `notifications` from `DatabaseContext`. Those mock values are untouched and still power every other tab.

## 10. Edge Cases Handled
- Brand-new customer with zero pickups/transactions/DIY history → stat cards show ₹0 / 0 XP / 0 pending, recent-activity lists show a friendly empty-state message instead of blank space, and the waste-distribution chart shows an explanatory message instead of an empty pie.
- Notifications panel with nothing in it → friendly "you're all caught up" message instead of blank space.
- Profile row not yet loaded (first paint) → greeting and stat cards fall back to safe defaults (`'...'` / `0`) instead of crashing.

## 11. Manual Testing Steps
1. Log in as your test Customer account (created in Module 3/4 setup).
2. Confirm the greeting shows your real name (not "Alex Rivera" from the old mock data).
3. Confirm Wallet Balance and Carbon Points stat cards show `0` (or whatever you've seeded) — not the old mock ₹12,850 / 2,450 XP.
4. Confirm Pending Pickups count matches however many non-completed/cancelled rows actually exist for you in `pickup_requests`.
5. Create a pickup (once Module 6 is done) or insert one directly in Supabase's Table Editor, refresh the dashboard, and confirm it appears in "Recent Pickup History" and the pending count goes up.
6. In Supabase Table Editor, manually insert a `transactions` row for your user with `type = 'Credit'`, refresh, and confirm it appears in "Latest Ledger" and shifts the Monthly Earnings chart.
7. Insert a `notifications` row with your `user_id`, refresh, confirm the bell badge count increases and the panel shows it; click "Mark all read" and confirm the badge clears.
8. Insert a second `notifications` row with `user_id = NULL` (a broadcast) and confirm it also appears in your panel.

## 12. Acceptance Criteria
- [ ] Dashboard greeting, wallet balance, reward points, and pending-pickup count all reflect real Supabase data for the logged-in customer.
- [ ] Recent Pickup History and Latest Ledger show real rows (or a clean empty state), not the old hard-coded mock entries.
- [ ] All 3 dashboard charts compute from real rows and update after new data is added and the page is refreshed.
- [ ] Notification bell count and panel reflect real, unread notifications; "Mark all read" clears them.
- [ ] Every other Customer Module tab (Create Pickup, Pickups, Wallet, Rewards, DIY, Community, Settings, Support) still works exactly as before — untouched by this module.
- [ ] `npx tsc --noEmit` and `npm run build` both succeed with no new errors.

## 13. Completion Report

**Files created**
- `src/services/customerService.ts`
- `src/hooks/useCustomerDashboard.ts`
- `docs/MODULE_5_CUSTOMER_DASHBOARD.md` (this file)

**Files modified**
- `src/components/CustomerModule.tsx` — Dashboard tab JSX + notification bell/panel rewired to real data (see `MODULE_5_IMPLEMENTATION_GUIDE.md` for the exact find/replace edits).

**Tables used:** `profiles`, `customer_profiles`, `pickup_requests`, `transactions`, `notifications` (all from Module 3 — no schema changes).

**Verification performed:** `npx tsc --noEmit` → clean (one pre-existing, unrelated warning on line ~1524 about `fb.customerRating`, predating this module). `npm run build` → succeeded.

**Features completed:** all 5 Module 5 tasks (5.1–5.5) per the table in section 6.

**Pending / explicitly out of scope for Module 5:**
- The "live tracking" driver banner on the dashboard still uses mock data — real GPS/live-tracking belongs to Module 6 (Pickup Management).
- The Sustainability & Footprint Impact panel (CO₂, water, trees) is still illustrative/hard-coded — not part of the original Module 5 task list; revisit only if the roadmap calls for it later.
- Per-user notification read-state (fixing the shared-broadcast-read limitation) — worth a small follow-up table someday, not urgent.

**Next module:** Module 6 — Pickup Management.
