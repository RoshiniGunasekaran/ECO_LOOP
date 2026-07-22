# MODULE 20 — USER MANAGEMENT — IMPLEMENTATION GUIDE

## 1. Overview

Module 19 made the Admin Dashboard tab real; Customer Database, Partner
Verification, and Industry Certification were still fully mock, reading
from `DatabaseContext`'s static arrays with approve/reject/suspend
buttons that only ever mutated local state. This module finishes the
roadmap's User Management task list:

| Task | Requirement | Status |
|---|---|---|
| 20.1 | Customers | ✅ **New in Module 20** — real customer directory (wallet balance, reward points, status) |
| 20.2 | Partners | ✅ **New in Module 20** — real partner directory (vehicle/license/Aadhaar, status) |
| 20.3 | Industries | ✅ **New in Module 20** — real industry directory (company/GST/address, status) |
| 20.4 | Search | ✅ **New in Module 20** — real name/email search across all 3 directories |
| 20.5 | Filter | ✅ **New in Module 20** — real status filter (Active/Pending Approval/Suspended) |
| 20.6 | Approve | ✅ **New in Module 20** — real `profiles.status` write, Pending Approval → Active |
| 20.7 | Reject | ✅ **New in Module 20** — real `profiles.status` write, Pending Approval → Suspended |
| 20.8 | Suspend | ✅ **New in Module 20** — real `profiles.status` write, Active ⇄ Suspended, any role, any time |

**Every other Admin tab is untouched** — Global Dispatch Log, Silo
Pricing, DIY Auditing, Broadcaster System, and Live Partner Monitoring
all still read/write the `DatabaseContext` mock. Those belong to Modules
21–25.

## 2. What Module 20 Adds

- **A real Customer Database** — every real customer's name, email,
  wallet balance, reward points, and status, with a working
  Suspend/Re-Activate button that writes to the database.
- **A real Partner Verification queue** — every real partner's name,
  vehicle type/number, driving license/Aadhaar numbers, and status, with
  working Approve/Reject/Suspend/Re-Activate buttons.
- **A real Industry Certification queue** — every real industry's company
  name, industry type, GST number, address, and status, with the same
  working approve/reject/suspend actions.
- **Real search** — a shared search box (name or email, case-insensitive)
  above each of the 3 directories.
- **Real status filtering** — a shared status dropdown (Active / Pending
  Approval / Suspended, labeled per-role for readability) above each of
  the 3 directories.
- **Sidebar badge counts now real** — the Partner Verification and
  Industry Certification nav badges now read `stats.pendingPartnerApprovals`
  / `stats.pendingIndustryApprovals` (from Module 19's real stats) instead
  of the mock arrays' `.filter(...).length`.

## 3. Files to Create

| File | Purpose |
|---|---|
| `docs/MODULE_20_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_20_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

No new SQL migration file — see §6.

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/adminService.ts` | Added `getCustomers`, `getPartners`, `getIndustries`, `updateUserStatus` + their row types |
| `src/hooks/useAdminDashboard.ts` | Now also loads `customers`/`partners`/`industries` and exposes `updateUserStatus` |
| `src/components/AdminModule.tsx` | Customer Database, Partner Verification, and Industry Certification tabs rewired to real data + search/filter/approve/reject/suspend |

### 4.1 — New functions in `adminService.ts`

```ts
export type AdminUserStatus = 'Active' | 'Suspended' | 'Pending Approval';

export async function getCustomers(): Promise<AdminCustomerRow[]> { /* profiles + customer_profiles join, role='customer' */ }
export async function getPartners(): Promise<AdminPartnerRow[]> { /* profiles + partner_profiles join, role='partner' */ }
export async function getIndustries(): Promise<AdminIndustryRow[]> { /* profiles + industry_profiles join, role='industry' */ }

export async function updateUserStatus(userId: string, status: AdminUserStatus) {
  const { error } = await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', userId);
  // ...
}
```

Each `get*` function does 2 parallel queries (all `profiles` rows for that
role, plus all rows of the matching child table) and joins them in memory
via a `Map` keyed by `user_id` — same pattern already used throughout
`partnerService.ts`/`industryService.ts` for joining a parent profile
with its role-specific extension table.

### 4.2 — `useAdminDashboard.ts`: new state + action

`load()` now also fetches `getCustomers()`, `getPartners()`,
`getIndustries()` in the same `Promise.all` as the Module 19 calls. One
new exposed action, `updateUserStatus(userId, status)`, refreshes the
whole hook's state afterward (so stat cards, badges, and every directory
stay in sync after any approve/reject/suspend).

### 4.3 — `AdminModule.tsx`: 3 tabs rewired

- Hook destructure renamed to `customers: realCustomers, partners:
  realPartners, industries: realIndustries` to avoid clashing with the
  pre-existing `DatabaseContext` mock arrays (`customers`, `partners`,
  `industries`), which are deliberately left in place and still power the
  Live Partner Monitoring tab and the Manual Allocation dropdown on the
  Global Dispatch Log tab — both out of this module's scope.
- New shared handler `handleUpdateRealUserStatus(userId, status)` and 2
  new shared filter helpers, `matchesUserSearch(name, email)` and
  `matchesUserStatus(status)`, reused across all 3 tabs against the
  already-declared (previously unused) `userSearch`/`userFilter` state.
- Each tab gained a search box + status filter dropdown in its header,
  and a loading spinner while `dashboardLoading` is true.
- The sidebar's Partner Verification / Industry Certification badges now
  read `stats?.pendingPartnerApprovals` / `stats?.pendingIndustryApprovals`.

## 5. New Component

None — Module 20 only extends the existing 3 tabs in `AdminModule.tsx`.

## 6. Database Integration

**No new SQL migration file was needed.** Every table this module reads
(`profiles`, `customer_profiles`, `partner_profiles`, `industry_profiles`)
already had an admin-bypass SELECT policy since Module 3/`Rls_gap_fix.sql`,
and `profiles` already had a real admin-bypass UPDATE policy
(`profiles_update_own_or_admin`, Module 3) — approve/reject/suspend is
just a `profiles.status` write, which an admin account could already
perform at the database level; Module 20 is the first real code to
exercise that existing capability.

## 7. Business Logic

- **Approve/Reject/Suspend are all the same underlying write** —
  `updateUserStatus(userId, status)` — the difference is purely which
  `status` value and which button the UI shows for the row's current
  state:
  - `Pending Approval` row → **Approve** sets `Active`, **Reject** sets
    `Suspended`.
  - `Active` row → **Suspend** sets `Suspended`.
  - `Suspended` row → **Re-Activate** sets `Active`.
- **Search and filter compose** — a search term and a status filter can
  both be active at once; a row must satisfy both to show.
- **The mock's old `'Approved'` status value is retired for these 3
  tabs** — the real schema's `profiles.status` uses `'Active'` for an
  approved/live account (`'Approved'` was only ever a mock-data string).
  The UI displays `'Active'` as "Approved" for partners/industries to
  keep the existing copy/wording intact, but the underlying value written
  and compared against the database is always the real one.

## 8. Edge Cases & Deliberate Scope Boundaries

- **A freshly-seeded database with zero users of a given role** shows
  "No customer/partner/industry accounts yet." in that tab rather than an
  empty grid or a crash.
- **No bulk actions** were added (e.g. "approve all pending") — the
  roadmap's tasks are singular actions per row; a bulk-action UI isn't
  part of this module's scope.
- **No email/SMS notification is sent** to a user when their status
  changes — Module 25 (Notification System) is a separate, later roadmap
  item.
- **Unauthorized access:** every read/write in the 4 new
  `adminService.ts` functions relies on the pre-existing RLS admin-bypass
  clauses — a non-admin account calling these same functions would only
  ever see/change their own row (or nothing, for the cross-role reads),
  since nothing in this module weakens RLS beyond what already existed.

## 9. Verification

### Files Created
| File | Purpose |
|---|---|
| `docs/MODULE_20_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_20_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/adminService.ts` | 4 new functions + 3 new row types |
| `src/hooks/useAdminDashboard.ts` | Loads customers/partners/industries, exposes `updateUserStatus` |
| `src/components/AdminModule.tsx` | 3 directory tabs real, with search/filter/approve/reject/suspend |

### SQL Files
None — no new tables, columns, or RLS policies were needed.

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
- ✅ No broken Modules 1–19
- ✅ Module 20 fully integrated with Module 19 (shares `stats` for badge
  counts, shares the same hook)
- ✅ Search, filter, approve, reject, and suspend all persist to real
  Supabase data — no mock Module 20 data remains where live data is
  required
- ✅ Every other Admin tab remains deliberately mock, clearly commented as
  Module 21–25 scope
