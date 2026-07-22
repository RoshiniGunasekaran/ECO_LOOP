# MODULE 13 — PICKUP OPERATIONS — IMPLEMENTATION GUIDE

## 1. Overview

Module 12 wired up most of the roadmap's "Pickup Operations" task list
already, since in this codebase the Partner Dashboard, Nearby Dispatcher,
and Assigned Trips tabs all live in one file/hook: Available pickups,
Accept pickup, Reject pickup, Start pickup, Arrive, and Complete were all
already real by the end of Module 12. Two tasks were explicitly deferred:
**Collect** (its own status, distinct from Arrived and Completed) and
**Upload proof** (photo evidence of the collected waste). Module 13
finishes both.

While wiring up "Upload proof," a real, pre-existing bug surfaced:
`public.pickup_images` has had Row-Level Security enabled since Module 3,
but `Rls_gap_fix.sql` only ever added a **SELECT** policy for it — there
has never been an **INSERT** policy. That means Module 6's own customer
waste-photo upload (`pickupService.uploadPickupImages`) has been silently
failing at the database layer since it shipped: the file itself lands in
Storage fine, but the row linking it to the pickup in `pickup_images` gets
rejected by RLS. Module 13 fixes this for both the pre-existing customer
path and the new partner path in a single policy, since it's the same root
cause — this is the same kind of gap `Rls_gap_fix.sql` and Module 12's own
schema file already patched twice before.

| Task | Requirement | Status |
|---|---|---|
| 13.1 | Available pickups | ✅ (Module 12) |
| 13.2 | Accept pickup | ✅ (Module 12) |
| 13.3 | Reject pickup | ✅ (Module 12, session-only "ignore") |
| 13.4 | Start pickup | ✅ (Module 12 — Assigned → In-Transit) |
| 13.5 | Arrive | ✅ (Module 12 — In-Transit → Arrived) |
| 13.6 | Collect | ✅ **New in Module 13** — Arrived → Collected |
| 13.7 | Complete | ✅ (Module 12, now runs from Collected instead of Arrived) |
| 13.8 | Upload weight | ✅ (Module 12 — actual-weight capture in the billing modal) |
| 13.9 | Upload proof | ✅ **New in Module 13** — proof photos captured at the Collect step |

No other Customer/Admin/Industry module, and no file outside the list in
§3/§4, is touched.

## 2. What Module 13 Adds

- Two RLS additions in `module13_pickup_operations_schema.sql`:
  1. The missing `pickup_images` **INSERT** policy described above.
  2. A new Storage policy on the `pickup-photos` bucket (created in Module
     2) letting a partner write proof photos under their own
     `${partner_id}/${pickup_id}/proof-...` folder, but **only** for a
     pickup that's actually assigned to them.
- `uploadProofPhotos` + `collectPickup` in `partnerService.ts` — moves a
  pickup from `'Arrived'` to `'Collected'` and (best-effort) uploads any
  attached photos, reusing the exact same `pickup-photos` bucket /
  `pickup_images` table Module 6 already built, just a different path
  prefix.
- `PartnerPickup.images: string[]` — `getAvailablePickups` /
  `getPartnerPickups` now also fetch each pickup's photos (waste photos
  the customer attached in Module 6, plus any proof photos a partner has
  since added), so the Assigned Trips card can show a "N proof photos
  uploaded" badge.
- A new **Collect + Upload Proof** modal in `DeliveryPartnerModule.tsx`,
  inserted into the existing status stepper between "Mark Arrived" and
  "Start Weighing & Billing."

**No new tables were needed** — `pickup_images` and the `pickup-photos`
bucket already existed; the gap was purely missing RLS/Storage policies.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module13_pickup_operations_schema.sql` | The `pickup_images` INSERT policy + the partner proof-photo Storage policy |
| `docs/MODULE_13_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_13_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/partnerService.ts` | Added `images` to `PartnerPickup`, image-fetching in `attachCustomerInfo`, and the new `uploadProofPhotos` / `collectPickup` functions |
| `src/hooks/usePartnerDashboard.ts` | Exposed the new `collectPickup(pickupId, proofFiles)` action |
| `src/components/DeliveryPartnerModule.tsx` | Status stepper now stops at `'Arrived'` to open the new Collect modal instead of jumping straight to billing; billing now opens from `'Collected'`; Assigned Trips cards show a proof-photo count badge |

### 4.1 — Status stepper: Arrived now opens Collect, not billing

**Find (Module 12 version):**
```tsx
} else if (p.status === 'Arrived') {
  // Open billing / weighing modal directly
  setBillingPickup(p);
  setActualWeight(p.estimatedWeight);
  setVerifiedCategory(p.category);
  setBillingRemarks('');
}
```

**Replace:**
```tsx
} else if (p.status === 'Arrived') {
  // Open the Collect + Upload Proof modal (Module 13)
  setCollectPickupTarget(p);
  setProofFiles([]);
} else if (p.status === 'Collected') {
  // Open billing / weighing modal
  setBillingPickup(p);
  setActualWeight(p.estimatedWeight);
  setVerifiedCategory(p.category);
  setBillingRemarks('');
}
```

### 4.2 — Button label for the new `'Collected'` status

**Find:**
```tsx
{p.status === 'Arrived' && <><Check className="w-3.5 h-3.5" /> Start Weighing & Billing</>}
```

**Replace:**
```tsx
{p.status === 'Arrived' && <><Upload className="w-3.5 h-3.5" /> Mark Collected & Upload Proof</>}
{p.status === 'Collected' && <><Check className="w-3.5 h-3.5" /> Start Weighing & Billing</>}
```

### 4.3 — New modal + handlers

Added `collectPickupTarget`, `proofFiles`, `collectSubmitting` state;
`handleProofFileChange`, `handleRemoveProofFile`, and
`handleConfirmCollected` handlers; and a new modal (mirrors the existing
billing modal's structure) with a 3-photo picker that previews each file
via `URL.createObjectURL` before upload. See the full component file for
the exact JSX — it's inserted directly above the existing billing modal.

## 5. New Component

None — Module 13 only adds a modal inside the existing
`DeliveryPartnerModule.tsx`.

## 6. Service & Hook Changes

### 6.1 — `src/services/partnerService.ts`

| Export | Purpose |
|---|---|
| `PartnerPickup.images` | *(new field)* every photo (waste + proof) attached to this pickup |
| `collectPickup(partnerId, pickupId, proofFiles?)` | Task 13.6/13.9 — sets `status = 'Collected'`, then best-effort uploads proof photos |
| `uploadProofPhotos` *(internal)* | Uploads to `pickup-photos/${partnerId}/${pickupId}/proof-...` and links each into `pickup_images` |

### 6.2 — `src/hooks/usePartnerDashboard.ts`

Added `collectPickup(pickupId, proofFiles)`, following the same
write-then-`load()` pattern every other action in the hook already uses.

## 7. Edge Cases & Deliberate Scope Boundaries

- **Photo upload failure doesn't block the Collect action.** `collectPickup`
  updates `status` first; photo upload is attempted afterward and any
  individual file failure is logged and skipped, same "best-effort per
  file" pattern Module 6 already used for customer waste photos. A partner
  standing at a customer's door shouldn't be stuck on "Collected" because
  one photo failed to upload.
- **Proof photos are optional.** The modal's "Confirm Collected" button
  works with zero photos attached — the roadmap lists "Upload proof" as
  its own task, but doesn't require it as a hard gate before Collected/
  Completed. This matches how the existing customer-side "Upload waste
  images" (Module 6, task 6.8) was also optional, capped at more photos (5)
  since it's the initial request rather than a completion step.
- **Max 3 proof photos per pickup**, deliberately fewer than the
  customer's 5-photo cap on the original request — proof photos are a
  quick confirmation shot, not a detailed listing.
- **A partner can only upload into their own pickup's folder.** The new
  Storage policy checks both the folder owner (`auth.uid()`) *and* that the
  pickup named in the path is actually assigned to that partner — a
  partner can't plant "proof" on a pickup that isn't theirs, even if they
  correctly guess another pickup's numeric ID.
- **The pre-existing `pickup_images` INSERT gap fix is a bug fix, not a
  feature change.** No behavior the Module 6 guide claimed as "real" is
  altered — this module just makes that claim actually true. Existing
  customer waste-photo uploads that appeared to "work" (the Storage object
  landed) but never actually linked into `pickup_images` will now link
  correctly on the next upload.

## 8. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module13_pickup_operations_schema.sql` | The 2 new RLS/Storage policies |
| `docs/MODULE_13_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_13_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/partnerService.ts` | `images` field + `collectPickup` / `uploadProofPhotos` |
| `src/hooks/usePartnerDashboard.ts` | Exposed `collectPickup` |
| `src/components/DeliveryPartnerModule.tsx` | New Collect modal, updated stepper/button labels, proof-photo badge |

### SQL Files
`supabase/module13_pickup_operations_schema.sql` — 1 table RLS policy (`pickup_images` INSERT) + 1 Storage policy (`pickup-photos` partner proof INSERT). No new tables, no new buckets.

### Storage Changes
No new bucket — reuses the existing `pickup-photos` bucket (Module 2) with an additional write policy scoped to partner proof uploads.

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
  `CustomerModule.tsx`'s `handleImageFileChange` is unrelated and still the
  only one present)
- ✅ `npm run build` succeeds
- ✅ No broken Modules 1–12
- ✅ Module 13 fully integrated with Module 12 (reuses `usePartnerDashboard`,
  `partnerService.ts`, and the same billing modal)
- ✅ Assigned Trips now shows a genuine 4-stage stepper (Start → Arrive →
  Collect & Upload Proof → Weigh & Bill) backed entirely by real
  `pickup_requests.status` values and real `pickup_images` rows
- ✅ No mock data remains anywhere Module 13 touches
