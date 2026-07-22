# MODULE 18 — INDUSTRY PROFILE — IMPLEMENTATION GUIDE

## 1. Overview

Module 16/17 made every other Industry tab real, leaving "Company
Credentials" as the last fully-mock tab — GST/registration numbers were
`readOnly`, and contact person/phone only ever wrote to the local
`DatabaseContext` mock. This module finishes the roadmap's Industry
Profile task list, the same way Module 15 finished it for the Partner
role:

| Task | Requirement | Status |
|---|---|---|
| 18.1 | Company information | ✅ **New in Module 18** — editable company name, industry type, GST number, registration number |
| 18.2 | Documents | ✅ **New in Module 18** — real GST certificate + registration certificate photo upload |
| 18.3 | Contact | ✅ **New in Module 18** — editable facility manager name + phone |
| 18.4 | Settings | ✅ **New in Module 18** — one real, persisted setting (email notifications) |

## 2. What Module 18 Adds

- **A real, editable Company Information form** — company name, industry
  type (dropdown), GST number, and registration number, all saved to the
  real `industry_profiles` row (previously two of these four fields were
  hardcoded `readOnly`, and none of them persisted anywhere).
- **A real Documents section** — GST certificate and registration
  certificate photo upload, each stored in a new `industry-documents`
  bucket with its public URL saved onto a new `industry_profiles` column,
  same pattern as Module 15's Partner document photos.
- **A real, editable Contact form** — facility manager name (saved to
  `industry_profiles.contact_person`) and phone (saved to the shared
  `profiles.phone`), replacing the old mock-only inputs.
- **A real Settings section** — one persisted toggle
  (`email_notifications_enabled`) with a live-updating switch.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module18_industry_profile_schema.sql` | `industry_profiles` owner UPDATE policy (previously missing entirely) + 3 new columns + `industry-documents` bucket/RLS |
| `docs/MODULE_18_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_18_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/industryService.ts` | Added `gstDocUrl`/`registrationDocUrl`/`emailNotificationsEnabled` to `RealIndustryProfile`; added `updateCompanyInformation`, `updateContactDetails`, `uploadIndustryDocument`, `updateEmailNotificationSetting` |
| `src/hooks/useIndustryDashboard.ts` | Exposed the 4 new Module 18 actions |
| `src/components/IndustryModule.tsx` | Company Credentials tab rebuilt as 4 real cards: identity, Company Information form, Contact form, Documents, Settings |

### 4.1 — `RealIndustryProfile`: 3 new fields

```ts
export interface RealIndustryProfile {
  // ...existing fields...
  /** Module 18 — uploaded document photo URLs (null until uploaded). */
  gstDocUrl: string | null;
  registrationDocUrl: string | null;
  emailNotificationsEnabled: boolean;
}
```

`getIndustryProfile`'s `industry_profiles` select was extended with
`gst_doc_url, registration_doc_url, email_notifications_enabled`, and the
mapped return object picks them up.

### 4.2 — 4 new functions in `industryService.ts`

```ts
export interface IndustryCompanyInfoInput {
  companyName: string;
  industryType: string;
  gstNumber: string;
  regNumber: string;
}
export async function updateCompanyInformation(userId: string, input: IndustryCompanyInfoInput) { /* ... */ }

export interface IndustryContactInput {
  contactPerson: string;
  phone: string;
}
export async function updateContactDetails(userId: string, input: IndustryContactInput) { /* ...updates industry_profiles.contact_person + profiles.phone in parallel... */ }

export async function uploadIndustryDocument(userId: string, docType: 'gst' | 'registration', file: File): Promise<string | null> { /* ... */ }

export async function updateEmailNotificationSetting(userId: string, enabled: boolean) { /* ... */ }
```

### 4.3 — `useIndustryDashboard.ts`: 4 new exposed actions

`updateCompanyInformation`, `updateContactDetails`, `uploadDocument`, and
`updateEmailNotificationSetting` were added alongside the Module 16/17
actions already in this hook, all following the same write-then-`load()`
pattern.

### 4.4 — `IndustryModule.tsx`: Company Credentials tab rebuilt

- New local state: `companyForm`, `companySaving`, `companyMessage`,
  `contactForm`, `contactSaving`, `contactMessage`, `uploadingDocType`,
  `settingsSaving` — same shape as Module 15's Partner Profile form state.
- A `useEffect` syncs `companyForm`/`contactForm` from the loaded
  `profile` object.
- 5 new handlers: `handleSaveCompanyInfo`, `handleSaveContact`,
  `handleDocumentFileSelected`, `handleToggleEmailNotifications`.
- The tab's JSX is now 5 cards: identity header, an editable Company
  Information form, an editable Contact form, a Documents card (GST +
  Registration photo upload with previews), and a Settings card (email
  notifications toggle).

## 5. New Component

None — Module 18 only extends the existing Company Credentials tab in
`IndustryModule.tsx`.

## 6. Database Integration

- **`industry_profiles` gains its first-ever UPDATE policy.** Every prior
  module only ever added a SELECT policy for this table (`Rls_gap_fix.sql`)
  — until now, no code anywhere could actually write to it, which is why
  Company Credentials had always been mock-only even after Module 16 made
  everything else on this table real for reads.
- **3 new columns:** `gst_doc_url` (text, nullable), `registration_doc_url`
  (text, nullable), `email_notifications_enabled` (boolean, `not null
  default true`).
- **New `industry-documents` storage bucket**, public, with the same
  owner-folder-scoped write policies as `partner-documents` (Module 15).

## 7. Business Logic

- **Company name is required**, same validation Module 11/15 already use
  for their own "name" fields; industry type/GST/registration number are
  all optional and stored as `null` if cleared.
- **Contact details write to two tables in one call** (`industry_profiles`
  + `profiles`) via `Promise.all` — if either half fails, the function
  reports failure and the service layer surfaces one combined error
  message, rather than silently succeeding half of the update.
- **Settings is deliberately minimal** — Module 18 adds exactly one real,
  persisted preference rather than inventing a larger notification/privacy
  system nothing else in this project has built yet (the Customer
  Module's own "Notification/Privacy Settings" sub-tabs from Module 11 are
  local UI only, not persisted — Module 18 doesn't try to retroactively
  fix that, only to add one genuinely real toggle for its own role).
- **Document re-upload behavior matches Module 15 exactly** — the column
  value is overwritten, the old Storage object is left in place, unlinked.

## 8. Edge Cases & Deliberate Scope Boundaries

- **No document verification/approval workflow** — same reasoning as
  Module 15: that's an Admin-side concern for a later module, not this
  one.
- **Email itself remains non-editable** — same as every other role in
  this app; no email-change flow exists anywhere yet.
- **Unauthorized access:** every new write is scoped by `.eq('user_id',
  userId)` / `.eq('id', userId)` and backed by the new owner-only RLS
  policy on `industry_profiles` plus the existing one on `profiles` — an
  industry account can never edit another industry's company info,
  contact details, or documents.

## 9. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module18_industry_profile_schema.sql` | Owner UPDATE policy + 3 new columns + `industry-documents` bucket/RLS |
| `docs/MODULE_18_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_18_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/industryService.ts` | New fields + 4 new functions |
| `src/hooks/useIndustryDashboard.ts` | Exposed 4 new actions |
| `src/components/IndustryModule.tsx` | Company Credentials tab rebuilt as 5 real cards |

### SQL Files
`supabase/module18_industry_profile_schema.sql` — 1 new RLS policy, 3 new
columns, 1 new storage bucket, 4 new storage RLS policies.

### Storage Changes
New `industry-documents` bucket (public, owner-folder-scoped write).

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
- ✅ No broken Modules 1–17
- ✅ Module 18 fully integrated: this is the first module to give
  `industry_profiles` a real UPDATE path at all
- ✅ Company information, contact details, and both document photos all
  persist to real Supabase columns/storage — no mock Module 18 data
  remains
- ✅ The Industry role (Modules 16–18) has no remaining mock tabs — every
  sidebar item now reads and writes real Supabase data
