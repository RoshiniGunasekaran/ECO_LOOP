# MODULE 17 — WASTE MANAGEMENT — IMPLEMENTATION GUIDE

## 1. Overview

Module 16 made the Industry role's Dashboard, Inventory, and Reports tabs
real, but left "Incoming Bulk Cargo" (accept/reject) and "Processing
Status" fully mock, pointing at this module. Module 17 finishes the
roadmap's Waste Management task list by connecting the Industry side to
the real `pickup_requests` pipeline every Partner completes (Module 13):

| Task | Requirement | Status |
|---|---|---|
| 17.1 | Incoming waste | ✅ **New** — every real `Completed` pickup nobody has claimed yet |
| 17.2 | Accept delivery | ✅ **New** — atomically claims the pickup, adds weight to the real silo, bumps real stat counters |
| 17.3 | Reject delivery | ✅ **New** — client-only session filter (same as the Partner "Ignore" pattern), no DB write |
| 17.4 | Processing | ✅ **New** — real per-pickup `industry_processing_status` advanced through Received → Sorting → Processing → Completed |
| 17.5 | Storage | ✅ Already real since Module 16 — accepting a delivery now really increments it |
| 17.6 | History | ✅ **New** — every delivery this industry has ever claimed, at any stage |

## 2. What Module 17 Adds

- **A real "Incoming Bulk Cargo" queue** — any pickup a Partner marked
  `Completed` (Module 13) that has no `assigned_industry_id` yet. Any
  Industry account can see and claim it, first-write-wins, same race
  protection as Module 12's Partner accept flow.
- **A real, atomic "Accept Silo Load" action** — one Postgres function
  (`accept_industry_delivery`) claims the pickup, adds its weight to the
  matching `industry_inventory` row (creating it if the category doesn't
  exist yet), and bumps `industry_profiles.waste_received_kg` /
  `.deliveries_count` — all in one round trip.
- **A real "Reject Batch" action** — exactly the Partner side's "Ignore"
  button pattern: adds the pickup's ID to a session-only
  `ignoredDeliveryIds` array so it disappears from *this* browser session
  only; it remains available for any other Industry account and reappears
  after a refresh. No new column or table for this — same reasoning as
  the Partner module already documents for its own reject button.
- **A real Processing Status tab** — every pickup this industry has
  claimed, with a genuine "Advance Machinery Loop" button that steps a new
  `industry_processing_status` column through its 4 real stages.
- **A real Delivery History list** on the Reports tab — every pickup ever
  assigned to this industry, most recent first.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module17_waste_management_schema.sql` | New `industry_processing_status` column, 4 new RLS policies, 1 atomic accept-delivery function |
| `docs/MODULE_17_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_17_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/industryService.ts` | Added `IndustryDelivery` type + `getAvailableDeliveries`, `getIndustryDeliveries`, `acceptDelivery`, `advanceProcessingStatus` |
| `src/hooks/useIndustryDashboard.ts` | Now also loads `availableDeliveries`/`myDeliveries` and exposes `acceptDelivery`/`advanceProcessingStatus` |
| `src/components/IndustryModule.tsx` | Incoming Bulk Cargo and Processing Status tabs rewired to real data; `DatabaseContext` mock (`pickups`, `industry`, `setIndustry`) fully removed from this component |

### 4.1 — New types + functions in `industryService.ts`

```ts
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
```

- `getAvailableDeliveries()` — `pickup_requests` where `status = 'Completed'` and `assigned_industry_id is null`, joined with `profiles` for carrier name/phone (same `attachPartnerInfo` join pattern as Module 12's `attachCustomerInfo`).
- `getIndustryDeliveries(userId)` — `pickup_requests` where `assigned_industry_id = userId`, newest first (History).
- `acceptDelivery(userId, pickupId)` — calls the new `accept_industry_delivery` Postgres RPC.
- `advanceProcessingStatus(pickupId, currentStatus)` — updates `industry_processing_status` to the next stage in `['Received','Sorting','Processing','Completed']`.

### 4.2 — `useIndustryDashboard.ts`: new state + actions

`load()` now also fetches `getAvailableDeliveries()` and
`getIndustryDeliveries(userId)` alongside the Module 16 profile/inventory
calls, all via `Promise.all`. Two new exposed actions:
`acceptDelivery(pickupId)` and `advanceProcessingStatus(pickupId,
currentStatus)`, both refreshing the whole hook's state afterward.

### 4.3 — `IndustryModule.tsx`: full removal of the `DatabaseContext` mock

The component no longer imports `useDatabase` at all. Every reference to
`industry`, `setIndustry`, `pickups`, `setPickups`, and the local
`processingStatus`/`handleUpdateBatchProgress` state was removed. The
"Incoming Bulk Cargo" tab now maps over `availableDeliveries` (filtered by
a new local `ignoredDeliveryIds` array for the Reject button), calling
`handleAcceptDelivery` → hook's `acceptDelivery(pickupId)`. The
"Processing Status" tab now maps over `myDeliveries.filter(d =>
d.industryProcessingStatus)`, calling `handleAdvanceProcessing` → hook's
`advanceProcessingStatus(pickupId, currentStatus)`.

## 5. New Component

None — Module 17 only extends `IndustryModule.tsx`.

## 6. Database Integration

- **New column** `pickup_requests.industry_processing_status` — nullable
  `text` with a check constraint (`'Received'|'Sorting'|'Processing'|'Completed'`),
  no default. Stays `null` until an industry actually accepts the pickup.
  A separate column rather than widening the existing `status` check
  constraint, since `status`'s allowed values are relied on by Modules
  1–14's existing code and shouldn't be touched.
- **4 new RLS policies** on `pickup_requests`:
  - `pickups_industry_view_unassigned_completed` (SELECT) — unclaimed `Completed` cargo, industry role only.
  - `pickups_industry_view_own` (SELECT) — everything already assigned to this industry (History).
  - `pickups_industry_accept_unassigned` (UPDATE) — claims an unclaimed `Completed` pickup, `WITH CHECK (assigned_industry_id = auth.uid())` so a partner can never claim on someone else's behalf.
  - `pickups_industry_update_own` (UPDATE) — advances `industry_processing_status` on rows already assigned to this industry.
- **1 new `security definer` function**, `accept_industry_delivery(p_pickup_id, p_user_id)` — hard-checks `p_user_id = auth.uid()` (can't accept on someone else's behalf even if you passed a different ID), then atomically: claims the pickup (`WHERE status='Completed' AND assigned_industry_id IS NULL`, so a double-accept race returns 0 rows and raises an exception), bumps `industry_profiles` counters, and upserts into `industry_inventory` (`ON CONFLICT (industry_id, category) DO UPDATE ... quantity_kg + excluded.quantity_kg`) — same reasoning as Module 12's `apply_partner_completion_stats`.

## 7. Business Logic

- **Accept is atomic and race-safe.** If two Industry accounts try to
  accept the same pickup at nearly the same time, only the first UPDATE
  actually matches a row (`assigned_industry_id IS NULL`); the second call
  gets 0 rows back from the `returning` clause, the function raises "This
  cargo was already claimed by another facility," and the service layer
  surfaces that exact message with a "Refreshing…" note, same UX pattern
  as Module 12's partner accept-race handling.
- **Reject is intentionally not persisted** — matches the existing
  Partner "Ignore" button exactly. Documented rather than treated as an
  oversight: a persistent per-industry rejection table would be
  meaningful for a true multi-facility marketplace, but nothing else in
  this project has that concept yet, so Module 17 stays consistent with
  the pattern already shipped.
- **Processing stages only ever move forward one step at a time** —
  `advanceProcessingStatus` always computes "current index + 1," so there
  is no way to skip a stage or move backward from the UI.
- **Weight added to inventory uses `actual_weight` if present, falling
  back to `estimated_weight`** — same fallback Module 14's billing
  calculation and the old mock `handleAcceptDelivery` both already used.

## 8. Edge Cases & Deliberate Scope Boundaries

- **A pickup accepted for a category with no existing silo row** still
  works — the `accept_industry_delivery` function's `INSERT ... ON
  CONFLICT` creates the row on the fly at a default 20,000 Kg capacity if
  it's genuinely new, though in practice this shouldn't happen since
  Module 16 seeds all 6 real categories on first load.
- **No admin override/reassignment UI** was added for
  `assigned_industry_id` — that would belong to a future Admin module
  (Module 21's Pickup Management), not this one.
- **No notification is sent to the Partner or Customer when an industry
  accepts their pickup** — Module 25 (Notification System) is a separate,
  later roadmap item; nothing here should pre-empt it.
- **Unauthorized access:** every read/write in `industryService.ts`'s new
  functions is backed by the RLS policies above — an industry account can
  never see another industry's already-claimed cargo (only unclaimed cargo
  or their own), and `accept_industry_delivery` cannot be called on
  another account's behalf even by passing a different `p_user_id`.

## 9. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module17_waste_management_schema.sql` | New column, 4 new RLS policies, 1 atomic function |
| `docs/MODULE_17_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_17_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/industryService.ts` | New delivery type + 4 new functions |
| `src/hooks/useIndustryDashboard.ts` | Loads deliveries, exposes accept/advance actions |
| `src/components/IndustryModule.tsx` | Incoming/Processing tabs real; `DatabaseContext` mock fully removed |

### SQL Files
`supabase/module17_waste_management_schema.sql` — 1 new column, 4 new RLS
policies, 1 new `security definer` function.

### Storage Changes
None.

### Environment Variable Changes
None.

### Commands

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```

Result at the time this guide was written:
- ✅ 0 new TypeScript errors (the one pre-existing, unrelated
  `CustomerModule.tsx` error is still the only one present)
- ✅ `npm run build` succeeds
- ✅ No broken Modules 1–16
- ✅ Module 17 fully integrated with Module 13 (reads real
  Partner-completed pickups) and Module 16 (writes to the real
  `industry_inventory`/`industry_profiles` it introduced)
- ✅ Accept, processing-stage advancement, and history all persist to
  real Supabase data — no mock Module 17 data remains
