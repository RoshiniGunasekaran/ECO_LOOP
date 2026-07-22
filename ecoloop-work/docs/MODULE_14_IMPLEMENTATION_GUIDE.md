# MODULE 14 — BILLING — IMPLEMENTATION GUIDE

## 1. Overview

Module 12 already implemented invoice generation and amount calculation as
part of the weigh-in flow (`completePickup` in `partnerService.ts`) — every
completed pickup has gotten a real `invoice_id` and a real
`final_amount = actual_weight × pricing_rates.price_per_kg` since Module
12 shipped. What Module 12 did **not** do is treat "the invoice exists"
and "the payment has actually been confirmed" as two different real
events — it marked every invoice `payment_status = 'Paid'` the instant it
was generated, and there was no way to download or print an invoice at
all. Module 14 finishes the roadmap's Billing task list:

| Task | Requirement | Status |
|---|---|---|
| 14.1 | Generate invoice | ✅ (Module 12) — unchanged |
| 14.2 | Calculate amount | ✅ (Module 12) — unchanged |
| 14.3 | Payment confirmation | ✅ **New in Module 14** — invoices now start `'Pending'`, with an explicit "Confirm Payment" action |
| 14.4 | Download invoice | ✅ **New in Module 14** — real, itemized, downloadable invoice per pickup |

No other Customer/Admin/Industry module, and no file outside the list in
§3/§4, is touched.

## 2. What Module 14 Adds

- **A real payment-confirmation step.** `completePickup` now sets
  `payment_status = 'Pending'` instead of `'Paid'` when the invoice is
  generated. A new `confirmPayment(pickupId)` function moves it to
  `'Paid'` — modeled on how this would work with a real payment
  gateway/webhook, or in this app's current cash/UPI-collected-on-the-spot
  model, the partner confirming they actually received the money.
- **A real, downloadable invoice.** `src/utils/invoice.ts` builds a
  standalone, print-ready HTML invoice (customer, partner/vehicle,
  category, verified weight, rate/kg, total, invoice ID, date, payment
  status) from real `PartnerPickup` + `RealPartnerProfile` data and
  triggers a browser download — no new npm dependency, consistent with
  this project's "keep it simple" architecture (React + Tailwind +
  Supabase only). Anyone can turn the downloaded `.html` into a PDF with
  their browser's own Print → "Save as PDF."
- An updated **Earning Records** tab: each completed pickup's row now
  shows a Paid/Payment Pending badge, a **Download Invoice** button, and
  (only while pending) a **Confirm Payment** button — plus a new "Payment
  Pending" count card alongside the existing earnings/balance/runs cards.

**No new database tables or RLS policies were needed.** `payment_status`
has been a real, real-RLS'd column on `pickup_requests` since Module 3,
and the existing `pickups_customer_update_own_pending` policy
(`partner_id = auth.uid()`) already lets a partner update it on any
pickup assigned to them — the same policy Module 12/13's status stepper
already relies on.

## 3. Files to Create

| File | Purpose |
|---|---|
| `src/utils/invoice.ts` | Builds the invoice HTML and triggers the download (Task 14.4) |
| `docs/MODULE_14_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_14_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/partnerService.ts` | `completePickup` now sets `payment_status: 'Pending'`; added `confirmPayment(pickupId)` |
| `src/hooks/usePartnerDashboard.ts` | Exposed the new `confirmPayment` action |
| `src/components/DeliveryPartnerModule.tsx` | Earning Records tab rebuilt with payment badges + Confirm Payment + Download Invoice; billing success message updated to reflect Pending, not auto-Paid |

### 4.1 — `completePickup`: Pending, not Paid

**Find (Module 12/13 version):**
```ts
payment_status: 'Paid',
```

**Replace:**
```ts
payment_status: 'Pending',
```

(Inside the same `.update({...})` call in `completePickup` — everything
else about that function, including the stats-update RPC call, is
unchanged.)

### 4.2 — New `confirmPayment` function

```ts
export async function confirmPayment(pickupId: number): Promise<boolean> {
  const { error } = await supabase
    .from('pickup_requests')
    .update({ payment_status: 'Paid' })
    .eq('id', pickupId)
    .eq('payment_status', 'Pending');

  if (error) {
    console.error('[EcoLoop] Confirming payment failed:', error.message);
    return false;
  }
  return true;
}
```

The extra `.eq('payment_status', 'Pending')` makes this idempotent —
tapping "Confirm Payment" twice (e.g. a double-click) is harmless; the
second call simply matches zero rows.

### 4.3 — Earning Records tab

Each ledger row gained a payment-status badge and an action row:

```tsx
<div className="flex gap-2 justify-end border-t border-slate-100 pt-2">
  <button onClick={() => handleDownloadInvoice(p)} /* ... */>
    <FileText className="w-3 h-3" /> Download Invoice
  </button>
  {p.paymentStatus === 'Pending' && (
    <button onClick={() => handleConfirmPayment(p.id)} /* ... */>
      <CheckCircle2 className="w-3 h-3" /> Confirm Payment
    </button>
  )}
</div>
```

`handleDownloadInvoice(p)` calls `downloadInvoice(p, partner)` from the
new util directly — no service round-trip needed, since every field the
invoice needs is already in `PartnerPickup` + the loaded `partner` profile.

## 5. New Component

None — Module 14 only adds `src/utils/invoice.ts` (a plain function
module, not a UI component) and extends the existing Earning Records tab.

## 6. Service, Hook & Util Changes

### 6.1 — `src/services/partnerService.ts`
| Export | Purpose |
|---|---|
| `completePickup` *(changed)* | Now leaves `payment_status = 'Pending'` |
| `confirmPayment(pickupId)` | Task 14.3 — idempotent Pending → Paid transition |

### 6.2 — `src/hooks/usePartnerDashboard.ts`
Added `confirmPayment(pickupId)`, following the same write-then-`load()`
pattern as every other action.

### 6.3 — `src/utils/invoice.ts`
| Export | Purpose |
|---|---|
| `buildInvoiceHtml(pickup, partner)` | Pure function — returns the full invoice HTML string |
| `downloadInvoice(pickup, partner)` | Wraps the HTML in a `Blob`, creates an `<a download>`, clicks it, cleans up the object URL |

## 7. Edge Cases & Deliberate Scope Boundaries

- **Earnings/stats still accrue at Complete time, not at payment
  confirmation.** `apply_partner_completion_stats` (Module 12) is still
  called from `completePickup`, unchanged — `partner_profiles.earnings`
  reflects "amount invoiced," not "amount actually settled." Gating the
  stats update behind payment confirmation instead would be a reasonable
  alternative design, but would also change numbers Module 12's own
  manual test checklist already documented and verified; Module 14 keeps
  that contract intact and only adds the payment-status field as a
  separate, honest signal on top.
- **No new npm dependency for PDF generation.** The roadmap's "Download
  invoice" doesn't specify a format; a browser-printable HTML file (with
  a clean, invoice-shaped layout) achieves the same end result — a
  document the person can save/share/print as a PDF — without adding a
  PDF-rendering library and its bundle-size cost to a project that has
  explicitly avoided extra infrastructure throughout (see the project's
  own "No Docker / No Redis / No Kafka" architecture note).
- **`confirmPayment` is idempotent by design** (see §4.2) — safe against
  double-clicks or a retried request after a flaky network response.
- **No customer-facing payment-status change.** This module only adds a
  partner-side "Confirm Payment" action; whether/how a customer sees their
  own pickup's payment status change was already covered structurally by
  Module 6 (both read the same `payment_status` column) and isn't touched
  here.
- **Unauthorized access:** `confirmPayment`'s `UPDATE` is still governed
  by the same `partner_id = auth.uid()` RLS policy every other status
  change in Modules 12/13 relies on — a partner can never confirm payment
  on a pickup that isn't assigned to them.

## 8. Verification

### Files Created
| File | Purpose |
|---|---|
| `src/utils/invoice.ts` | Invoice HTML builder + download trigger |
| `docs/MODULE_14_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_14_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/partnerService.ts` | `completePickup` → Pending; added `confirmPayment` |
| `src/hooks/usePartnerDashboard.ts` | Exposed `confirmPayment` |
| `src/components/DeliveryPartnerModule.tsx` | Earning Records rebuilt with payment badge/actions; billing success copy updated |

### SQL Files
None — no schema or RLS changes were needed.

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
- ✅ No broken Modules 1–13
- ✅ Module 14 fully integrated with Module 12 (reuses `usePartnerDashboard`
  and `PartnerPickup`/`RealPartnerProfile` types as-is)
- ✅ Every completed pickup shows a real Paid/Payment Pending state, backed
  by the real `payment_status` column
- ✅ Downloaded invoices contain real data pulled from the actual
  completed pickup and partner profile — no mock content anywhere
