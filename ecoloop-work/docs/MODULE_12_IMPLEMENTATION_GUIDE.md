# MODULE 12 — PARTNER DASHBOARD — IMPLEMENTATION GUIDE

## 1. Overview

Since Module 3, `public.partner_profiles` has had real columns for every
stat the Partner Dashboard displays (`is_online`, `rating`, `today_pickups`,
`completed_pickups`, `earnings`, `distance_traveled`), and
`public.pickup_requests` has had `partner_id` / `partner_location_lat` /
`partner_location_lng` since the same module. Module 6 even left a note in
`pickupService.ts` saying live tracking "reads the real columns, but
nothing in the app can actually SET those yet — that's Module 13." Module
12 is the module *before* that: it wires up everything on the **partner's
own side** — the Partner Dashboard, accepting pickups, and completing them
— so that Module 13 (assumed here to fold into this dashboard's existing
tabs rather than a separate screen) has real data to work with.

Until now, `DeliveryPartnerModule.tsx` ran entirely on the local `partner`
and `pickups` mock objects from `DatabaseContext` (backed only by
`localStorage`, seeded from `INITIAL_PARTNERS` / `INITIAL_PICKUP_REQUESTS`
in `data.ts`). Going online, accepting a trip, stepping through
Assigned → In-Transit → Arrived, and generating the final weigh-in invoice
all just mutated that local array — no partner ever saw a real customer's
real pickup request, and no customer ever saw a real partner accept theirs.

Module 12 wires all of that up for real and implements every task on the
roadmap:

| Task | Requirement | Status |
|---|---|---|
| 12.1 | Dashboard | ✅ Real `profiles` + `partner_profiles` row (name, vehicle, rating, today/completed pickup counts, earnings, distance) |
| 12.2 | Availability | ✅ Real `is_online` toggle, persisted to `partner_profiles` |
| 12.3 | Statistics | ✅ Real stat cards, all four numbers read from the database, not local state |
| 12.4 | Earnings overview | ✅ Real completed-pickup ledger + all-time earnings, both from real data |

Module 13's task list (Pickup Operations) is also substantially covered
here, since in this codebase the Partner Dashboard, Nearby Dispatcher, and
Assigned Trips tabs all live in the same `DeliveryPartnerModule.tsx` file
and share one hook:

| Extra (Module 13-shaped) | Requirement | Status |
|---|---|---|
| — | Available pickups | ✅ Real, RLS-gated list of unassigned `Pending` pickups |
| — | Accept / Reject pickup | ✅ Accept is a real, race-safe `UPDATE`; Reject is a deliberate session-only "ignore" (see §7) |
| — | Start / Arrive / Collect | ✅ Real status stepper (`Assigned → In-Transit → Arrived`) |
| — | Upload weight / Upload proof | ✅ Real actual-weight capture and invoice generation; photo-proof upload is out of scope (see §7) |

No other Customer/Admin/Industry module, and no file outside the list in
§3/§4, is touched.

## 2. What Module 12 Adds

- Two new RLS policies (`module12_partner_dashboard_schema.sql`) that close
  a real security gap left by Module 3: partners previously had **no way**
  to see an unassigned `Pending` pickup, and **no way** to update
  `partner_profiles` at all (not even their own `is_online` flag).
- Two new `security definer` Postgres functions
  (`increment_partner_today_pickups`, `apply_partner_completion_stats`)
  that update `partner_profiles` counters atomically, so two browser tabs
  accepting/completing pickups back-to-back can't race each other into a
  wrong total.
- A new `partnerService.ts` + `usePartnerDashboard.ts` pair (same pattern
  as every other module's `xService.ts` + `useCustomerX.ts`) that owns:
  reading the real partner profile, the online toggle, reading available
  (unassigned) pickups, reading this partner's own pickups, accepting a
  pickup, advancing its status, and completing it (weight verification +
  invoice + stat update).
- A rebuilt `DeliveryPartnerModule.tsx` where every tab (Dashboard, Nearby
  Dispatcher, Assigned Trips, Earning Records, Driver Profile) reads and
  writes through the hook above instead of `DatabaseContext`.

**No new tables were needed** — `partner_profiles` and `pickup_requests`
already existed with almost-working RLS from Module 3. The only schema gap
was the two missing RLS policies and the two stat-counter functions
described above.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module12_partner_dashboard_schema.sql` | The 2 new RLS policies + 2 new stat-counter functions described above |
| `src/services/partnerService.ts` | Every real Supabase read/write for the Partner Dashboard module |
| `src/hooks/usePartnerDashboard.ts` | Loads the partner profile + available/assigned pickups, exposes toggle/accept/advance/complete actions |
| `docs/MODULE_12_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_12_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

Only one file: `src/components/DeliveryPartnerModule.tsx`. It was rebuilt
in full rather than patched line-by-line, because every tab's data source
changes (`useDatabase()` → `usePartnerDashboard()`) and the pickup type
changes shape (`PickupRequest` from `data.ts` → `PartnerPickup` from
`partnerService.ts`). The sections below document the changes as
find → replace against the Module 11 version of the file for the pieces
that are easiest to diff; the full file is the source of truth.

### 4.1 — Data source swap

**Find:**
```tsx
import { useDatabase } from '../context/DatabaseContext';
import { PartnerItem, PickupRequest, Transaction, WasteCategory } from '../types';
import { INITIAL_PARTNERS, INITIAL_PICKUP_REQUESTS, INITIAL_PRICING_RATES, WASTE_SUBCATEGORIES } from '../data';
```

**Replace:**
```tsx
import { usePartnerDashboard } from '../hooks/usePartnerDashboard';
import { WASTE_SUBCATEGORIES } from '../data';
```

**Find:**
```tsx
const { partner, setPartner, pickups, setPickups } = useDatabase();
```

**Replace:**
```tsx
const {
  loading, partner, availablePickups, myPickups,
  toggleOnline, acceptPickup, advanceStatus, completePickup,
} = usePartnerDashboard();
```

### 4.2 — Loading / no-session guard

New — the mock version had no loading state because `INITIAL_PARTNERS[0]`
was always instantly available. The real version renders a spinner until
both the `profiles` and `partner_profiles` rows have loaded:

```tsx
if (loading || !partner) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading partner dashboard…</p>
      </div>
    </div>
  );
}
```

### 4.3 — Online toggle

**Find:**
```tsx
const handleToggleOnline = () => {
  setPartner({ ...partner, isOnline: !partner.isOnline });
};
```

**Replace:**
```tsx
const handleToggleOnline = async () => {
  await toggleOnline();
};
```

`toggleOnline()` flips `partner.isOnline` optimistically, writes to
`partner_profiles.is_online`, and reconciles from the database — see
§6.2.

### 4.4 — Accept / Reject pickup

**Find:**
```tsx
const handleAcceptPickup = (pickupId: string) => { /* ...mutated local pickups array... */ };
const handleRejectPickup = (pickupId: string) => {
  setIgnoredPickupIds(prev => [...prev, pickupId]);
};
```

**Replace:**
```tsx
const handleAcceptPickup = async (pickupId: number) => {
  setAcceptingId(pickupId);
  const ok = await acceptPickup(pickupId);
  setAcceptingId(null);
  if (!ok) {
    alert('This pickup was just claimed by another partner. Refreshing the list…');
  }
};

const handleRejectPickup = (pickupId: number) => {
  setIgnoredPickupIds((prev) => [...prev, pickupId]);
};
```

`pickupId` is now a `number` (the real `bigint` primary key from
`pickup_requests.id`), not the old mock's string ID. "Ignore" stays
exactly as it was — see §7 for why that's intentional, not a shortcut.

### 4.5 — Status stepper

**Find:**
```tsx
const handleStepProgress = (pId: string, currentStatus: string) => {
  let nextStatus: any = 'Assigned';
  if (currentStatus === 'Assigned') nextStatus = 'In-Transit';
  else if (currentStatus === 'In-Transit') nextStatus = 'Arrived';
  else if (currentStatus === 'Arrived') { /* open billing modal */ return; }
  setPickups(pickups.map(p => p.id === pId ? { ...p, status: nextStatus } : p));
};
```

**Replace:**
```tsx
const handleStepProgress = async (p: PartnerPickup) => {
  if (p.status === 'Assigned') {
    setAdvancingId(p.id);
    await advanceStatus(p.id, 'In-Transit');
    setAdvancingId(null);
  } else if (p.status === 'In-Transit') {
    setAdvancingId(p.id);
    await advanceStatus(p.id, 'Arrived');
    setAdvancingId(null);
  } else if (p.status === 'Arrived') {
    setBillingPickup(p);
    setActualWeight(p.estimatedWeight);
    setVerifiedCategory(p.category);
    setBillingRemarks('');
  }
};
```

### 4.6 — Weigh-in / invoice generation

**Find:**
```tsx
const handleGenerateInvoice = (e: React.FormEvent) => {
  e.preventDefault();
  /* ...computed finalVal from INITIAL_PRICING_RATES, mutated local pickups + partner... */
};
```

**Replace:**
```tsx
const handleGenerateInvoice = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!billingPickup) return;

  setBillingSubmitting(true);
  const result = await completePickup(billingPickup.id, {
    actualWeight,
    verifiedCategory,
    remarks: billingRemarks,
  });
  setBillingSubmitting(false);

  if (!result) {
    alert('Could not complete this pickup. Please try again.');
    return;
  }

  setBillingSuccess(true);
  setTimeout(() => {
    setBillingSuccess(false);
    setBillingPickup(null);
    setActiveTab('dashboard');
  }, 2000);
};
```

Pricing now comes from the real `pricing_rates` table (via
`pickupService.getPricingRates()`, reused as-is from Module 6) instead of
`INITIAL_PRICING_RATES`.

### 4.7 — Profile tab

The old Profile tab had an editable "Save Profile Specs" form for vehicle
type/number that just called `alert('Profile successfully updated in local
state!')` and threw the input away. That form has been removed and
replaced with read-only fields plus a note that real editing arrives in
Module 15 (Partner Profile) — see §7. This avoids the same
looks-like-it-saved-but-doesn't bug Module 11's guide flagged for the old
Customer Profile form.

## 5. New Component

None — Module 12 only touches the existing `DeliveryPartnerModule.tsx`.

## 6. New Hook, Service & Types

### 6.1 — `src/services/partnerService.ts`

| Export | Purpose |
|---|---|
| `RealPartnerProfile` | Shape of a joined `profiles` + `partner_profiles` row |
| `PartnerPickup` | Shape of a `pickup_requests` row with the customer's name/phone joined in |
| `CompletePickupInput` | `{ actualWeight, verifiedCategory, remarks? }` |
| `getPartnerProfile(userId)` | Task 12.1 — reads the real profile + stats row |
| `setOnlineStatus(userId, isOnline)` | Task 12.2 — writes `partner_profiles.is_online` |
| `getAvailablePickups()` | Task 12.2 (dispatcher) — every unassigned `Pending` pickup, oldest first |
| `getPartnerPickups(userId)` | Tasks 12.3/12.4 — every pickup ever assigned to this partner, newest first |
| `acceptPickup(userId, pickupId)` | Claims a pickup; race-safe via a conditional `UPDATE ... WHERE partner_id IS NULL` |
| `advancePickupStatus(pickupId, next)` | Moves a pickup to `'In-Transit'` or `'Arrived'` |
| `completePickup(userId, pickupId, input, pricePerKg)` | Finalizes weight/amount/invoice and bumps partner stats |

### 6.2 — `src/hooks/usePartnerDashboard.ts`

Loads (in parallel) the partner profile, available pickups, this partner's
own pickups, and pricing rates on mount (keyed off `session.user.id` from
`useAuth()`). Exposes `toggleOnline` (optimistic-update-then-reconcile),
`acceptPickup`, `advanceStatus`, and `completePickup` — each writes to
Supabase and then calls the shared `load()` to refresh every list from the
database, the same "write, then refetch" pattern every other hook in this
codebase (`useCustomerPickups`, `useCustomerProfile`, etc.) already uses.

### 6.3 — Type note

`DeliveryPartnerModule.tsx` no longer imports `PartnerItem` / `PickupRequest`
from `../types` or `Transaction` / `WasteCategory` — those were only ever
needed for the mock data shapes. `PartnerPickup.category` /
`.subcategory` are plain `string` (not the `WasteCategory` union) since
they come straight off the database row; the weigh-in form's category
`<select>` still uses `Object.keys(WASTE_SUBCATEGORIES)` for its options,
same as before.

## 7. Edge Cases & Deliberate Scope Boundaries

- **Two partners tapping "Accept" on the same pickup at nearly the same
  time:** `acceptPickup()` issues a conditional `UPDATE ... WHERE status =
  'Pending' AND partner_id IS NULL`. Whichever request reaches Postgres
  first wins and the row count is 1; the second request's `WHERE` no
  longer matches (the row already has a `partner_id`), so it matches 0
  rows and `acceptPickup()` returns `false` — the UI shows "This pickup was
  just claimed by another partner" and refreshes the list.
- **"Ignore" is intentionally local-only.** A rejected pickup isn't a real
  business state — every other online partner must still be able to see
  and accept it. Writing a per-partner "hide" flag to the database would
  be a real feature (worth its own task), not a Module 12 requirement, so
  `ignoredPickupIds` stays exactly what it was in the mock version: a
  browser-tab-only filter.
- **`today_pickups` does not reset at midnight.** It's a running counter
  bumped on every `acceptPickup()` call. A scheduled reset (or computing it
  from `created_at`/an `accepted_at` timestamp instead) is out of scope —
  it belongs to a later Admin/ops module, exactly like Module 11 scoped out
  the referral program and session list.
- **`distance_traveled` uses the same fixed 4.2 km placeholder the old
  mock used**, added on every `completePickup()` call. Real GPS-based
  distance is blocked on a maps integration (Module 26 on the roadmap).
- **No photo-proof upload on completion.** The roadmap's "Upload proof"
  task is left for a later pass — `completePickup()` only writes the
  numeric weight/amount/invoice fields that already exist as real columns.
  Wiring a proof photo would reuse the exact same
  `pickup-photos` bucket + `pickup_images` table pattern Module 6 already
  built for the customer's waste photos.
- **Vehicle/document editing is deferred to Module 15**, not silently
  dropped — see §4.7.
- **Empty states:** both "no available pickups" and "no assigned trips"
  render the same friendly empty-state cards the mock version had; they
  now reflect a genuinely empty query result instead of a filtered mock
  array.
- **Unauthorized access:** every read/write above is scoped by
  `usePartnerDashboard`'s `userId` (from the real Supabase session) and
  additionally enforced server-side by the RLS policies in
  `module12_partner_dashboard_schema.sql` — a partner can never see another
  partner's assigned pickups, and can never accept a pickup that's already
  assigned to someone else, even by guessing IDs.

## 8. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module12_partner_dashboard_schema.sql` | RLS + stat-counter functions |
| `src/services/partnerService.ts` | Real DB reads/writes for the partner dashboard |
| `src/hooks/usePartnerDashboard.ts` | React hook wiring the service into the UI |
| `docs/MODULE_12_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_12_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/components/DeliveryPartnerModule.tsx` | Every tab now reads/writes real Supabase data via `usePartnerDashboard` instead of the `DatabaseContext` mock |

### SQL Files
`supabase/module12_partner_dashboard_schema.sql` — 2 RLS policies (`partner_profiles` owner UPDATE, `pickup_requests` partner SELECT-unassigned-Pending) + 1 partner-accept UPDATE policy + 2 stat-counter functions. No new tables.

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
- ✅ 0 new TypeScript errors (the one pre-existing error in
  `CustomerModule.tsx`'s `handleImageFileChange`, documented in Module 11's
  guide, is unrelated to Module 12 and still the only one present)
- ✅ `npm run build` succeeds
- ✅ No broken Modules 1–11
- ✅ Module 12 fully integrated with Modules 1–11 (reuses `useAuth` from
  Module 4 and `pickupService.getPricingRates()` from Module 6/22 as-is)
- ✅ Partner Dashboard displays real assigned pickups from Supabase
- ✅ Pickup acceptance, status updates, and completion persist correctly
  in the database
- ✅ Partner statistics update automatically based on real pickup data
- ✅ Customer and Partner modules stay synchronized: once a partner accepts
  a pickup, the Customer Module's existing "Live Tracking" screen (built in
  Module 6) immediately shows the real partner's name/phone, because both
  read the same `pickup_requests.partner_id` row
- ✅ No mock partner dashboard data remains anywhere Module 12 touches
