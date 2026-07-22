# MODULE 19 — ADMIN DASHBOARD — IMPLEMENTATION GUIDE

## 1. Overview

The Admin role's "Administrator Control Cabin" has been scaffolded ahead
of schedule with tabs for every future Admin module (User Management,
Pickup Management, Pricing, DIY auditing, Broadcasting, Live Partner
Monitoring), but every single one of them — including the Dashboard
itself — read from the local `DatabaseContext` mock. This module makes
the roadmap's Admin Dashboard task list real, and only that:

| Task | Requirement | Status |
|---|---|---|
| 19.1 | Dashboard | ✅ **New in Module 19** — real stat cards from `profiles`/`pickup_requests`/`diy_projects` |
| 19.2 | Analytics | ✅ **New in Module 19** — real pickup-volume and revenue figures |
| 19.3 | Charts | ✅ **New in Module 19** — real 7-day pickup volume bar chart + category breakdown pie chart |
| 19.4 | Activity logs | ✅ **New in Module 19** — real "Recent Platform Activity" feed derived from creation timestamps |

**Every other Admin tab is untouched** — Customer Database, Partner
Roster, Industry Certification, Global Dispatch Log, Silo Pricing, DIY
Auditing, Broadcaster System, and Live Partner Monitoring all still
read/write the `DatabaseContext` mock exactly as before. Those belong to
Modules 20–25.

## 2. What Module 19 Adds

- **Real stat cards** — Total Customers, Pending Driver Approvals,
  Unassigned Pickups, and Unverified DIY Crafts, all counted live from
  `profiles`, `pickup_requests`, and `diy_projects` instead of the mock
  arrays' `.length`.
- **A real "Pickup Requests — Last 7 Days" bar chart** and a real "Waste
  Category Breakdown" pie chart, both computed from real `pickup_requests`
  rows, using the same Recharts components and visual style the Customer
  Dashboard already established in Module 5.
- **A real Platform Revenue Log** — sum of `final_amount` across every
  `Paid` pickup, replacing the old hardcoded `"₹18,45,290.00"` placeholder.
- **A real "Recent Platform Activity" feed** — merges the most recent
  signups, pickup requests, and DIY submissions (by `created_at`) into one
  chronological timeline, replacing what would otherwise have been an
  invented audit log.
- **No new SQL migration file.** Every table this module reads
  (`profiles`, `pickup_requests`, `diy_projects`) has had an admin bypass
  clause on its SELECT policy (`... or public.current_user_role() =
  'admin'`) since Module 3/`Rls_gap_fix.sql` — an admin account could
  already read all of this data; Module 19 is simply the first real code
  to use that existing access.

## 3. Files to Create

| File | Purpose |
|---|---|
| `src/services/adminService.ts` | Real reads for platform-wide stats, chart data computation, activity feed |
| `src/hooks/useAdminDashboard.ts` | Loads stats/charts/activity for the component |
| `docs/MODULE_19_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_19_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/components/AdminModule.tsx` | Dashboard tab rewired to real stats/charts/activity via `useAdminDashboard`; every other tab untouched |

### 4.1 — Imports

Added `useAdminDashboard`, the Recharts components already used by
`CustomerModule.tsx` (`ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
Tooltip, CartesianGrid, PieChart, Pie, Cell`), and 3 new `lucide-react`
icons (`Loader2, UserPlus, PackagePlus, Hammer`) for the activity feed.

### 4.2 — Dashboard tab rebuilt

**Find:** the entire `{activeTab === 'dashboard' && ( ... )}` block (stat
cards reading `customers.length` / `partners.filter(...)` / `pickups.filter(...)`
/ `diyProjects.filter(...)`, and the hardcoded `"₹18,45,290.00"` revenue
figure).

**Replace:** the same visual layout, but every number now comes from
`stats` (from `useAdminDashboard`), plus two new Recharts panels
(`pickupsByDay` bar chart, `categoryBreakdown` pie chart) and a new
"Recent Platform Activity" panel (`recentActivity`). A loading guard
(`dashboardLoading || !stats`) shows a spinner in place of the whole
stats/charts/activity section while data loads — the DIY Audit Queue mini
list still reads from the existing `diyProjects` mock array (out of scope
for Module 19; that queue's *approve/reject* action is Module 23's job,
this module only needed its pending count, which now comes from the real
`stats.pendingDIYSubmissions` on the stat card above it).

## 5. New Component

None — Module 19 only extends the existing Dashboard tab in
`AdminModule.tsx`.

## 6. New Service (`src/services/adminService.ts`)

| Export | Purpose |
|---|---|
| `AdminOverviewStats` | Real platform-wide counts + revenue shape |
| `PickupsByDay` / `CategoryBreakdown` | Chart data shapes |
| `ActivityEvent` | Activity feed entry shape |
| `getOverviewStats()` | Task 19.1 — reads `profiles`/`pickup_requests`/`diy_projects`, returns computed stats + the raw pickup rows (reused for both charts, avoiding a second fetch) |
| `computePickupsByDay(pickupRows, days=7)` | Task 19.3 — pure computation, buckets pickups by day for the last N days |
| `computeCategoryBreakdown(pickupRows)` | Task 19.3 — pure computation, counts pickups per category |
| `getRecentActivity()` | Task 19.4 — merges recent signups/pickups/DIY submissions into one sorted feed |

## 7. New Hook (`src/hooks/useAdminDashboard.ts`)

Loads `stats` + `recentActivity` on mount via `Promise.all`, derives
`pickupsByDay`/`categoryBreakdown` from the same fetched pickup rows (no
duplicate query), and exposes `refresh`.

## 8. Database Integration

- **No new tables, columns, or RLS policies.** This is the first Admin
  module and the first time any real code exercises the admin-bypass
  clauses already present on `profiles`, `pickup_requests`, and
  `diy_projects`' SELECT policies since Module 3/`Rls_gap_fix.sql`.
- **Revenue is computed client-side** from `pickup_requests.final_amount`
  where `payment_status = 'Paid'` — the same field Module 14's billing
  flow already writes to, so this number moves in lockstep with real
  Partner payment confirmations.

## 9. Business Logic

- **"Recent Platform Activity" is deliberately not a full audit log.**
  This schema has no dedicated audit-log table tracking every status
  transition (e.g. a pickup moving `Assigned → In-Transit → Collected`
  isn't separately timestamped anywhere) — building one would be a
  reasonable future addition, but inventing fake granularity here would
  misrepresent what's actually tracked. Instead, the feed is built purely
  from real `created_at` timestamps already on `profiles`, `pickup_requests`,
  and `diy_projects` — new signups, new pickup requests, and new DIY
  submissions — which is honest, real, and useful without overclaiming.
- **The 7-day pickup chart always renders exactly 7 days**, even ones
  with zero pickups (pre-seeded buckets at 0), so the chart's shape is
  stable and doesn't jump around based on which days happen to have data.
- **Category breakdown sorts descending by count** so the largest
  categories are immediately visible in both the pie chart and its legend.

## 10. Edge Cases & Deliberate Scope Boundaries

- **A freshly-seeded database with zero pickups** shows all 4 stat cards
  at `0`, an empty-state message in place of the pie chart, a flat 7-day
  bar chart at all zeros, and "No platform activity recorded yet." in the
  activity feed — the honest real state, not a fallback to mock numbers.
- **No new admin-only actions were added** — Module 19 is read-only by
  design; approving partners, reassigning pickups, editing pricing,
  auditing DIY submissions, and broadcasting messages are all still
  Modules 20–24's scope and remain on the mock `DatabaseContext` for now.
- **Unauthorized access:** every read in `adminService.ts` relies on the
  existing RLS admin-bypass clauses — a non-admin account calling these
  same functions would simply get back only the rows their own RLS
  policies already allow them to see (e.g. a customer would only see
  their own `profiles` row), never another user's data, since nothing in
  this module weakens or bypasses RLS beyond what already existed.

## 11. Verification

### Files Created
| File | Purpose |
|---|---|
| `src/services/adminService.ts` | Real stats/charts/activity reads |
| `src/hooks/useAdminDashboard.ts` | Loads stats/charts/activity |
| `docs/MODULE_19_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_19_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/components/AdminModule.tsx` | Dashboard tab real; every other tab untouched |

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
- ✅ No broken Modules 1–18
- ✅ Module 19 fully integrated: reads the same `profiles`/
  `pickup_requests`/`diy_projects` tables every other role's real code
  already writes to
- ✅ Dashboard stat cards, charts, revenue log, and activity feed all use
  real Supabase data — no mock Module 19 data remains where live data is
  required
- ✅ Every other Admin tab remains deliberately mock, clearly commented as
  Module 20–25 scope
