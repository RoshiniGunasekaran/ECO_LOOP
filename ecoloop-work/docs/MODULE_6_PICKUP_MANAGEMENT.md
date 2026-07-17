# MODULE 6 — PICKUP MANAGEMENT

## 1. Module Objective
Replace the Customer Module's "Create Pickup" and "My Pickup Requests" tabs —
plus the Dashboard's active-pickup tracking banner — with real Supabase reads
and writes: creating a pickup, editing/cancelling it, uploading waste photos,
viewing pickup history, viewing a single pickup's timeline, and submitting
partner feedback. Every other Customer Module tab (Wallet, Rewards, DIY,
Community, Settings, Support) is untouched.

## 2. Frontend Pages / Screens
- Customer Module → Create Pickup tab (`CustomerModule.tsx`, `activeTab === 'create-pickup'`)
- Customer Module → My Pickup Requests tab + detail/tracking card (`activeTab === 'pickups'`)
- Customer Module → Dashboard tab's "Live Tracking Active" banner (only, everything else on Dashboard stays Module 5's)

## 3. Supabase Tables Used
- `pickup_requests` — create, read (list + single), update (edit while Pending, cancel)
- `pickup_images` — create (waste photo links), read
- `pickup_feedback` — create/update (upsert on `pickup_id`), read
- `pricing_rates` — read-only, real per-Kg rates for the estimate calculator (replaces the `INITIAL_PRICING_RATES` mock)
- `profiles` — read-only, to resolve an assigned partner's name/phone for display

No new tables or columns were needed — Module 3's schema already covered everything this module reads and writes.

## 4. Storage Buckets
- `pickup-photos` (created in Module 2). Waste photos are uploaded to
  `{customer_id}/{pickup_id}/{timestamp}-{index}-{filename}` and the resulting
  public URL is written into `pickup_images.image_url`.

## 5. Authentication Rules
Every read/write in this module relies on the RLS policies already defined in
Module 3:
- `pickups_customer_own` — a customer can only see their own pickups (or ones assigned to them as partner / all if admin).
- `pickups_customer_insert` — a customer can only insert a pickup with `customer_id = auth.uid()`.
- `pickups_customer_update_own_pending` — a customer can only update their own pickup **while its status is still `Pending`**. This is what makes "Edit pickup" (task 6.2) only work before a partner is assigned, and it's also why "Delete pickup" is implemented as a cancel (see section 7).
- `pricing_public_read` — anyone logged in can read pricing rates.

No new policies were required.

## 6. Functional Requirements (mapped to the roadmap's 8 tasks)
| Task | Requirement | Status |
|---|---|---|
| 6.1 | Create pickup | ✅ `pickupService.createPickup` — inserts the request, then uploads any waste photos |
| 6.2 | Edit pickup | ✅ `pickupService.updatePickup` — only succeeds while `status = 'Pending'` (enforced by RLS) |
| 6.3 | Delete pickup | ✅ Implemented as **cancel** (`pickupService.cancelPickup`) — see business rules below for why |
| 6.4 | View pickup | ✅ Detail/tracking card reads a single real pickup, including images, partner info, and feedback |
| 6.5 | Pickup history | ✅ `pickupService.getPickups` — full list for the logged-in customer, newest first, with search/filter/sort |
| 6.6 | Pickup timeline | ✅ The 4-step activity feed on the detail card now reflects the pickup's real `status` and `partner_id` |
| 6.7 | Live tracking | ✅ Reads real `partner_id` / `partner_location_lat` / `partner_location_lng` — see business rules for current limitation |
| 6.8 | Upload waste images | ✅ Up to 5 photos per pickup, uploaded to the real `pickup-photos` bucket and linked via `pickup_images` |

## 7. Business Rules
- **"Delete" is a cancel, not a hard delete.** Module 3's RLS intentionally gives customers no `DELETE` policy on `pickup_requests` (only admins can hard-delete). Rather than change the schema/RLS to allow real deletes — which would let a customer erase pickup history admins may need for disputes/audits — task 6.3 reuses the existing "Cancel Pickup Request" flow (status → `Cancelled`). This matches the original mock UI's own behavior, so nothing changed from the customer's point of view.
- **Editing only works while `Pending`.** Once a partner accepts a request (`Assigned` or later), the pickup is locked from customer edits by RLS — editing weight/category/address after a partner is en route would break the partner's job. This is enforced server-side, not just hidden in the UI.
- **Live tracking is honestly partial.** The UI reads real `partner_id`, `partner_location_lat`, and `partner_location_lng` columns and will show partner name/phone/coordinates the moment those columns are populated — but *nothing in the app can populate them yet*. Real partner assignment and GPS pushes are Module 13 (Delivery Partner → Pickup Operations), not built yet. Until then, testing "live tracking" means manually setting `partner_id` (and optionally the lat/lng columns) on a row in Supabase's Table Editor.
- **Real pricing, not mock pricing.** The Create Pickup estimate calculator now reads live `price_per_kg` values from `pricing_rates` (falls back to the old mock table only for the first render before the real rates load), so the estimate customers see matches what Module 22 (admin pricing management) will eventually control.
- A pickup can have up to 5 photos attached at creation.

## 8. Database Operations
- **Create**: `createPickup` (pickup_requests insert + pickup_images inserts), `addImagesToPickup` (pickup_images insert only), `submitPickupFeedback` (pickup_feedback upsert-insert path).
- **Read**: `getPickups` (list + joined images/feedback/partner), `getPricingRates`.
- **Update**: `updatePickup` (edit while Pending), `cancelPickup` (status → Cancelled), `submitPickupFeedback` (upsert-update path).
- **Delete**: none — see business rules.

## 9. Frontend Integration
- `src/services/pickupService.ts` — new. Every Supabase call for this module lives here.
- `src/hooks/useCustomerPickups.ts` — new. Loads the customer's pickups + real pricing rates in parallel, exposes `createPickup`, `updatePickup`, `cancelPickup`, `submitFeedback`, `addImages`, and `refresh()`.
- `src/components/CustomerModule.tsx` — modified:
  - Create Pickup form now submits through `pkCreatePickup`, supports up to 5 real photo uploads, and shows a real submitting/error state.
  - My Pickup Requests list, search/filter/sort, and the detail/tracking card now read from `pkPickups` / a real `RealPickup` (`selectedPickup`) instead of the mock `pickups` array.
  - Cancel and feedback-submit buttons call the real service functions.
  - CSV export reads from the real pickup list.
  - The dashboard's "Live Tracking Active" banner now checks real pickups for an `Assigned` / `In-Transit` / `Arrived` status instead of the old hard-coded "Driver Daniel Cruz" mock.

## 10. Edge Cases Handled
- No pickups yet → the list shows the existing "No Pickup Requests Match / Book Doorstep Collection" empty state (now backed by a real empty array, not a mock one).
- Create-pickup network/RLS failure → a real error message renders under the form instead of silently pretending success; the submit button disables and shows "Submitting..." while in flight.
- A pickup with 0 attached photos → detail view and gallery simply render nothing extra (no more forced Unsplash placeholder image).
- Unassigned pickup (no partner yet) → detail card and dashboard banner show "Unassigned" / "awaiting driver allocation" copy instead of crashing on a null partner name.
- Feedback already submitted → detail card shows the read-only "My Registered Feedback" card (from `selectedPickup.feedback`) instead of the submission form, and resubmitting overwrites it via upsert rather than creating a duplicate row.

## 11. Manual Testing Steps
1. Log in as your test Customer account.
2. Go to **Create Pickup**, fill the form, attach 1–3 photos, and submit. Confirm the success screen appears and you're redirected to **My Pickup Requests**.
3. In Supabase Table Editor, confirm a new row exists in `pickup_requests` with your real values, and matching rows exist in `pickup_images` with real Storage URLs (open one URL in a new tab — it should load the photo).
4. Open the pickup from the list (**Manage & Track**) → confirm every field matches what you submitted, and your photo(s) are attached.
5. While the pickup is still `Pending`, edit it (weight, category, or address) and confirm the change is reflected after refresh.
6. In Supabase, manually set that pickup's `status` to `Assigned` and `partner_id` to any existing partner's `profiles.id` → refresh the Dashboard → confirm the "Live Tracking Active" banner now appears with that partner's real name.
7. Cancel a `Pending` pickup from the detail card → confirm its status becomes `Cancelled` in Supabase and the Cancel button disappears (edit/cancel are only offered for `Pending`/`Assigned`).
8. In Supabase, manually set a pickup's `status` to `Completed` → refresh → confirm the invoice preview and the "Partner Rating & Feedback" form both appear; submit a rating + comment → confirm a row appears in `pickup_feedback` and the form is replaced by your read-only feedback card.
9. Use the search box, status filter, category filter, and sort order on **My Pickup Requests** → confirm they all filter/sort the real list correctly.
10. Click **Export Log (CSV)** → confirm the downloaded file lists your real pickups, not mock data.

## 12. Acceptance Criteria
- [ ] Creating a pickup writes a real row to `pickup_requests` and any attached photos to `pickup_images` / the `pickup-photos` bucket.
- [ ] Editing a `Pending` pickup persists to Supabase; editing is blocked once a pickup is past `Pending`.
- [ ] Cancelling a pickup updates its real status to `Cancelled`.
- [ ] My Pickup Requests, search/filter/sort, and the detail/tracking card all read real data — no mock pickups remain reachable from these tabs.
- [ ] The dashboard's live-tracking banner reflects a real `Assigned`/`In-Transit`/`Arrived` pickup, or doesn't appear at all if none exists.
- [ ] Submitting pickup feedback writes to `pickup_feedback` and is displayed back correctly.
- [ ] Every other Customer Module tab still works exactly as before — untouched by this module.
- [ ] `npx tsc --noEmit` and `npm run build` both succeed with no new errors.

## 13. Completion Report

**Files created**
- `src/services/pickupService.ts`
- `src/hooks/useCustomerPickups.ts`
- `docs/MODULE_6_PICKUP_MANAGEMENT.md` (this file)

**Files modified**
- `src/components/CustomerModule.tsx` — Create Pickup form, My Pickup Requests tab (list + detail/tracking card), dashboard live-tracking banner, and CSV export rewired to real data (see `MODULE_6_IMPLEMENTATION_GUIDE.md` for the exact find/replace edits).

**Tables used:** `pickup_requests`, `pickup_images`, `pickup_feedback`, `pricing_rates`, `profiles` (all from Module 3 — no schema changes). **Bucket used:** `pickup-photos` (from Module 2).

**Verification performed:** `npx tsc --noEmit` → clean. `npm run build` → succeeded (1 pre-existing chunk-size warning, unrelated to this module).

**Features completed:** all 8 Module 6 tasks (6.1–6.8) per the table in section 6.

**Pending / explicitly out of scope for Module 6:**
- Real partner assignment and live GPS pushes — belongs to Module 13 (Delivery Partner → Pickup Operations). Until then, "live tracking" only activates when a pickup's `partner_id` is set manually in Supabase.
- Hard-deleting a pickup request — intentionally not implemented (see business rules); customers can only cancel.
- Removing an individual already-uploaded photo from a pickup (adding more photos to an existing pickup is supported via `addImagesToPickup`, removal is not).
- The complaint/dispute modal (already wired to `complaintPickupId`) still files into the mock `supportTickets` array — that's Module 24/support-ticket wiring, not this module.

**Next module:** Module 7 — Wallet.
