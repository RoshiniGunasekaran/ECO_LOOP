# MODULE 16 — INDUSTRY DASHBOARD — IMPLEMENTATION GUIDE

## 1. Overview

The Industry role has been fully mock since it was first scaffolded — every
tab read from `DatabaseContext`'s static `INITIAL_INDUSTRIES` array, which
is disconnected from the signed-in Supabase account entirely (the exact
same situation the Partner role was in before Module 12). This module
makes the roadmap's Module 16 task list real:

| Task | Requirement | Status |
|---|---|---|
| 16.1 | Dashboard | ✅ **New in Module 16** — real company identity + all-time stats from `profiles`/`industry_profiles` |
| 16.2 | Inventory | ✅ **New in Module 16** — real per-category silo stock, backed by a new `industry_inventory` table |
| 16.3 | Statistics | ✅ **New in Module 16** — silo utilization totals computed from real inventory |
| 16.4 | Reports | ✅ **New in Module 16** — CO2/value estimates computed from real stats, real CSV export |

**Incoming Bulk Cargo (accept/reject) and Processing Status remain mock —
that's Module 17 (Waste Management).** **Company Credentials remains
mock — that's Module 18 (Industry Profile).** Both tabs still read/write
`DatabaseContext` exactly as before; Module 16 does not touch them.

## 2. What Module 16 Adds

- **Real company identity + stats** on the sidebar and Overview Metrics
  tab — company name, all-time waste reclaimed (Kg), and registered cargo
  shipment count, read from the same `profiles` + `industry_profiles` rows
  Module 3 already created (previously unused by any real code).
- **A real Warehouse Silos tab** — 6 default categories (Paper, Plastic,
  Glass, Metal, E-Waste, Organic) seeded once per industry account into a
  brand-new `industry_inventory` table, replacing the `useState` mock that
  reset to hardcoded numbers on every page load.
- **Real Silo Storage Quantity Levels** on the Overview Metrics tab —
  same data source as the Warehouse Silos tab, not a separate copy.
- **Real Material Yield Reports** — CO2 mitigation and reclaimed-value
  estimates computed from the real `waste_received_kg` counter using
  clearly-documented conversion factors (not the old hardcoded "11.4 Tons
  Co2" placeholder text), plus a real CSV download built from live data
  (previously just an `alert()`).
- **A new Silo Utilization Statistics card** on the Reports tab — total
  stored Kg vs. total silo capacity Kg, across all categories.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module16_industry_dashboard_schema.sql` | New `industry_inventory` table + RLS policies |
| `src/services/industryService.ts` | Real reads for company profile/stats, real inventory read+seed, report-stats computation |
| `src/hooks/useIndustryDashboard.ts` | Loads profile + inventory + derives report stats for the component |
| `src/utils/industryReport.ts` | Builds and downloads a real CSV report |
| `docs/MODULE_16_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_16_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/components/IndustryModule.tsx` | Sidebar identity, Overview Metrics tab, Warehouse Silos tab, and Material Yield Reports tab now read real data via `useIndustryDashboard`; Incoming Bulk Cargo / Processing / Company Credentials tabs are untouched |

### 4.1 — Imports and real-data hook wiring

**Find:**
```tsx
import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { IndustryItem, PickupRequest } from '../types';
import { INITIAL_INDUSTRIES, INITIAL_PICKUP_REQUESTS } from '../data';
import { 
  Factory, LayoutDashboard, Inbox, Database, RefreshCw, BarChart3, 
  User, CheckCircle2, AlertCircle, X, Download, ShieldCheck, Mail, Phone, 
  MapPin, Settings, HelpCircle, ChevronRight, ArrowRight
} from 'lucide-react';

interface IndustryModuleProps {
  onLogout: () => void;
}

export default function IndustryModule({ onLogout }: IndustryModuleProps) {
  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Active Shared States connected to Database Context
  const { industry, setIndustry, pickups, setPickups } = useDatabase();
```

**Replace:**
```tsx
import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useIndustryDashboard } from '../hooks/useIndustryDashboard';
import { downloadInventoryReport } from '../utils/industryReport';
import { IndustryItem, PickupRequest } from '../types';
import { INITIAL_INDUSTRIES, INITIAL_PICKUP_REQUESTS } from '../data';
import { 
  Factory, LayoutDashboard, Inbox, Database, RefreshCw, BarChart3, 
  User, CheckCircle2, AlertCircle, X, Download, ShieldCheck, Mail, Phone, 
  MapPin, Settings, HelpCircle, ChevronRight, ArrowRight, Loader2
} from 'lucide-react';

interface IndustryModuleProps {
  onLogout: () => void;
}

export default function IndustryModule({ onLogout }: IndustryModuleProps) {
  // Sidebar tabs
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Real Supabase-backed company profile + inventory (Module 16) — powers
  // the Overview Metrics, Warehouse Silos, and Material Yield Reports tabs.
  const { loading: dashboardLoading, profile, inventory, reportStats, refresh } = useIndustryDashboard();

  // Active Shared States connected to Database Context — still mock. Only
  // used below by the Incoming Bulk Cargo (Module 17) and Company
  // Credentials (Module 18) tabs, which are not part of Module 16's scope.
  const { industry, setIndustry, pickups, setPickups } = useDatabase();
```

### 4.2 — Remove the mock `stocks` state, add a loading guard

**Find:**
```tsx
  // Storage / Stock inventory levels in Kg
  const [stocks, setStocks] = useState<Record<string, { qty: number; max: number; loc: string }>>({
    'Paper': { qty: 8450, max: 20000, loc: 'Silo A-1' },
    'Plastic': { qty: 4120, max: 15000, loc: 'Silo B-4' },
    'Glass': { qty: 1200, max: 10000, loc: 'Dry Shed 2' },
    'Metal': { qty: 2900, max: 12000, loc: 'Heavy Yard' },
    'E-Waste': { qty: 450, max: 5000, loc: 'Secure Vault' },
    'Organic': { qty: 0, max: 8000, loc: 'Compost Bin 1' }
  });
```

**Replace:** (deleted — the Overview/Warehouse Silos tabs now read `inventory` from the hook instead)

Immediately after `processingStatus`'s declaration, a loading guard was
added (same pattern as `DeliveryPartnerModule.tsx`'s `if (loading ||
!partner)`):
```tsx
  if (dashboardLoading || !profile || !reportStats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading industrial facility workspace…</p>
        </div>
      </div>
    );
  }
```

### 4.3 — `handleAcceptDelivery`: stop referencing the removed mock stock state

**Find:**
```tsx
    // Add to actual inventory stock
    const cat = targetDel.category;
    const addedWeight = targetDel.actualWeight || targetDel.estimatedWeight;
    
    if (stocks[cat]) {
      setStocks({
        ...stocks,
        [cat]: {
          ...stocks[cat],
          qty: Math.min(stocks[cat].qty + addedWeight, stocks[cat].max)
        }
      });
    }

    setIndustry({
```

**Replace:**
```tsx
    // NOTE: incrementing real silo stock (`industry_inventory`) and the real
    // `industry_profiles.waste_received_kg` / `.deliveries_count` counters
    // on accept is Module 17 (Waste Management) work, not Module 16 — this
    // handler still only updates the mock `DatabaseContext` counters below,
    // same as before Module 16.
    const addedWeight = targetDel.actualWeight || targetDel.estimatedWeight;

    setIndustry({
```

### 4.4 — Sidebar identity + Overview Metrics tab: `industry.*` → `profile.*`

Every read of `industry.companyName`, `industry.wasteReceivedKg`,
`industry.deliveriesCount`, and `industry.address` inside the sidebar
identity card and the Overview Metrics (`dashboard`) tab's header/stat
cards was replaced with the equivalent `profile.*` field from
`useIndustryDashboard`. The "Silo Storage Quantity Levels" panel's
`Object.entries(stocks)` loop was replaced with `inventory.map(...)`.

### 4.5 — Warehouse Silos tab: real inventory grid

The `inventory` tab's `Object.entries(stocks)` grid was replaced with an
`inventory.map(...)` grid reading `item.category` / `item.quantityKg` /
`item.capacityKg` / `item.location`, plus an empty-state message.

### 4.6 — Material Yield Reports tab: real stats + real CSV

The hardcoded `"11.4 Tons Co2"` / `"₹4,85,210.00 Est."` strings were
replaced with `reportStats.co2MitigatedTons` / `reportStats.reclaimedValueEstimate`,
with a disclosure line noting these are estimates. The Download button's
`onClick` was changed from `alert(...)` to
`downloadInventoryReport(profile, inventory, reportStats)`. A new "Silo
Utilization Statistics" card was added showing `reportStats.totalInventoryKg`
vs. `reportStats.totalInventoryCapacityKg` (Task 16.3).

## 5. New Component

None — Module 16 only extends the existing `IndustryModule.tsx`; no new
UI file was needed.

## 6. New Service (`src/services/industryService.ts`)

| Export | Purpose |
|---|---|
| `RealIndustryProfile` | Real company identity + stats shape |
| `InventoryItem` | Real per-category silo row shape |
| `IndustryReportStats` | Computed report/statistics shape |
| `getIndustryProfile(userId)` | Task 16.1 — reads `profiles` + `industry_profiles` |
| `getInventory(userId)` | Task 16.2 — seeds 6 default categories (idempotent upsert) then reads real rows |
| `computeReportStats(profile, inventory)` | Tasks 16.3/16.4 — pure computation, no I/O |

## 7. New Hook (`src/hooks/useIndustryDashboard.ts`)

Loads `profile` + `inventory` on mount (keyed off the authenticated
session's `user.id`, same `useAuth()` pattern as every other dashboard
hook in this app), derives `reportStats` from both, and exposes `refresh`.

## 8. Database Integration

- **New table `industry_inventory`** — one row per `(industry_id,
  category)`, `unique` constraint prevents duplicate category rows per
  industry. Columns: `quantity_kg`, `capacity_kg`, `location`,
  `updated_at`.
- **No changes to `industry_profiles`** — `waste_received_kg` and
  `deliveries_count` already existed (Module 3) and already had a working
  SELECT policy (`Rls_gap_fix.sql`); Module 16 is the first real code to
  read them.
- **RLS:** `industry_inventory_owner_select` / `_owner_insert` /
  `_owner_update`, all scoped by `industry_id = auth.uid()` (with an
  admin override on select/update), mirroring the exact pattern
  `partner_profiles`/`customer_profiles` already use. No DELETE policy —
  silo rows are zeroed out, never removed.

## 9. Business Logic

- **Default inventory seeding is idempotent.** `getInventory` calls
  `upsert(..., { onConflict: 'industry_id,category', ignoreDuplicates:
  true })` on every load — the first call for a new industry account
  inserts all 6 rows at 0 Kg; every call after that is a no-op (existing
  rows are never overwritten), so a partner's real, evolving stock levels
  (once Module 17 starts writing to them) are never reset by a page
  refresh.
- **Report estimates are clearly documented placeholders**, not
  fabricated numbers: `DEFAULT_CO2_FACTOR_TONS_PER_KG` (0.0009 tons/Kg)
  and `DEFAULT_VALUE_PER_KG` (₹42/Kg) are named constants at the top of
  `industryService.ts`, computed against the real `waste_received_kg`
  counter — same spirit as the fixed 4.2 km/pickup distance placeholder
  already documented in `partnerService.ts` since Module 12. The Reports
  tab UI includes a line disclosing these are estimates, not a certified
  audit figure.
- **CSV export never touches the network** — `downloadInventoryReport`
  builds the file client-side from data already in memory and triggers a
  browser download via an in-memory Blob URL, same "keep it simple"
  approach as `src/utils/invoice.ts` (Module 14).

## 10. Edge Cases & Deliberate Scope Boundaries

- **A brand-new industry account with zero deliveries** shows `0 Kg`
  waste reclaimed, `0` shipments, all 6 silos at `0 / capacity Kg`, and
  `0` estimated CO2/value — this is the honest, real state, not a
  fallback to the old mock numbers.
- **No admin-facing inventory view** was added — that would belong to a
  future Admin module (industry monitoring/reports), not Module 16.
- **No manual stock-adjustment UI.** The roadmap's Module 16 task is
  "Inventory" (viewing real levels), not manually editing them — writes
  to `industry_inventory` are intentionally left for Module 17 (when a
  delivery is really accepted).
- **Unauthorized access:** every read/seed in `industryService.ts` is
  scoped by `.eq('user_id', userId)` / `.eq('industry_id', userId)` and
  backed by the new owner-only RLS policies — an industry account can
  never see or modify another industry's inventory or stats.

## 11. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module16_industry_dashboard_schema.sql` | New `industry_inventory` table + RLS |
| `src/services/industryService.ts` | Real profile/inventory reads + report computation |
| `src/hooks/useIndustryDashboard.ts` | Loads profile/inventory/report stats |
| `src/utils/industryReport.ts` | Real CSV report builder/downloader |
| `docs/MODULE_16_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_16_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/components/IndustryModule.tsx` | Overview/Silos/Reports tabs + sidebar identity now real; other tabs untouched |

### SQL Files
`supabase/module16_industry_dashboard_schema.sql` — 1 new table, 3 new
RLS policies.

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
- ✅ No broken Modules 1–15
- ✅ Module 16 fully integrated: reads the same `profiles` table every
  other role already uses, and the same RLS-policy conventions as
  `partner_profiles`/`customer_profiles`
- ✅ Dashboard, Inventory, Statistics, and Reports all use real Supabase
  data — no mock Module 16 data remains where live data is required
- ✅ Incoming Bulk Cargo / Processing Status / Company Credentials remain
  deliberately mock, clearly commented as Module 17/18 scope
