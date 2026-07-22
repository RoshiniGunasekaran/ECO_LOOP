# MODULE 15 — PARTNER PROFILE — IMPLEMENTATION GUIDE

## 1. Overview

The Delivery Partner's Profile tab has shown the real `partner_profiles` row
since Module 12, but every field on it was `readOnly` — the partner could
see their vehicle type, plate number, driving-license number, and Aadhaar
number, but never change any of it, and there was no way to upload a photo
of either document. Both `partnerService.ts` and the Profile tab itself
carried an explicit note that this was deliberately out of scope until
Module 15. This module finishes the roadmap's Partner Profile task list:

| Task | Requirement | Status |
|---|---|---|
| 15.1 | Personal details | ✅ **New in Module 15** — editable name/phone, with email shown read-only |
| 15.2 | Vehicle | ✅ **New in Module 15** — editable vehicle type, plate number, license/Aadhaar numbers |
| 15.3 | Documents | ✅ **New in Module 15** — real license/Aadhaar photo upload, stored per-partner |
| 15.4 | Earnings history | ✅ Already real since Module 12/14 — unchanged. The Earning Records tab already reads live `pickup_requests` rows; nothing in this task needed new work |

No other Customer/Admin/Industry module, and no file outside the list in
§3/§4, is touched.

## 2. What Module 15 Adds

- **A real, editable Personal Details form** on the Profile tab — full
  name and phone, saved to the same `profiles` row Module 4/11/12 already
  share. Email stays read-only (no email-change flow exists anywhere in
  this app yet).
- **A real profile-picture upload** on the Profile tab's avatar. This
  reuses Module 11's existing `profileService.uploadProfilePicture`
  as-is — it already writes to `profiles.profile_pic_url` and the shared
  `profile-photos` bucket, and nothing about it is Customer-specific, so
  Module 15 does not duplicate it.
- **A real, editable Vehicle & Document Credentials form** — vehicle
  type (dropdown, same 3 options as the sign-up form), plate number,
  driving-license number, and Aadhaar number, saved to `partner_profiles`.
- **Real document photo upload** — a partner can upload a photo of their
  driving license and a photo of their Aadhaar card. Each is stored in a
  new `partner-documents` bucket and its public URL is saved onto two new
  `partner_profiles` columns (`driving_license_doc_url`, `aadhaar_doc_url`).
  Re-uploading replaces which file is *linked* to the profile; the old
  object is left in storage, unlinked — same deliberate behavior as
  Module 11's avatar re-upload and Module 9's DIY photo re-uploads.

**No changes to earnings/stats logic, the Earning Records tab, invoices,
or payment confirmation** — Module 14 already made all of that real;
Module 15 only touches the Profile tab.

## 3. Files to Create

| File | Purpose |
|---|---|
| `supabase/module15_partner_profile_schema.sql` | Adds the 2 new `partner_profiles` columns + the `partner-documents` storage bucket and its RLS policies |
| `docs/MODULE_15_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_15_MANUAL_TEST_CHECKLIST.md` | Manual QA steps for this module |

## 4. Files to Modify

| File | Reason |
|---|---|
| `src/services/partnerService.ts` | Added `drivingLicenseDocUrl`/`aadhaarDocUrl` to `RealPartnerProfile`; `getPartnerProfile` now selects the 2 new columns; added `updatePartnerPersonalDetails`, `updateVehicleDetails`, `uploadPartnerDocument` |
| `src/hooks/usePartnerDashboard.ts` | Exposed `updatePersonalDetails`, `uploadProfilePhoto` (delegates to Module 11's `profileService.uploadProfilePicture`), `updateVehicleDetails`, `uploadDocument` |
| `src/components/DeliveryPartnerModule.tsx` | Profile tab rebuilt: editable Personal Details form, avatar upload control, editable Vehicle & Document Credentials form, document photo upload cards |

### 4.1 — `RealPartnerProfile`: two new fields

**Find:**
```ts
  vehicleType: string | null;
  vehicleNumber: string | null;
  drivingLicense: string | null;
  aadhaarNumber: string | null;
  isOnline: boolean;
```

**Replace:**
```ts
  vehicleType: string | null;
  vehicleNumber: string | null;
  drivingLicense: string | null;
  aadhaarNumber: string | null;
  /** Module 15 — uploaded document photo URLs (null until a partner uploads one). */
  drivingLicenseDocUrl: string | null;
  aadhaarDocUrl: string | null;
  isOnline: boolean;
```

### 4.2 — `getPartnerProfile`: select + map the 2 new columns

**Find:**
```ts
      .select(
        'vehicle_type, vehicle_number, driving_license, aadhaar_number, is_online, rating, today_pickups, completed_pickups, earnings, distance_traveled'
      )
```

**Replace:**
```ts
      .select(
        'vehicle_type, vehicle_number, driving_license, aadhaar_number, driving_license_doc_url, aadhaar_doc_url, is_online, rating, today_pickups, completed_pickups, earnings, distance_traveled'
      )
```

**Find:**
```ts
    vehicleType: pp.vehicle_type,
    vehicleNumber: pp.vehicle_number,
    drivingLicense: pp.driving_license,
    aadhaarNumber: pp.aadhaar_number,
    isOnline: pp.is_online,
```

**Replace:**
```ts
    vehicleType: pp.vehicle_type,
    vehicleNumber: pp.vehicle_number,
    drivingLicense: pp.driving_license,
    aadhaarNumber: pp.aadhaar_number,
    drivingLicenseDocUrl: pp.driving_license_doc_url,
    aadhaarDocUrl: pp.aadhaar_doc_url,
    isOnline: pp.is_online,
```

### 4.3 — Three new functions in `partnerService.ts`

Added directly above the existing `mapPickupRow` helper:

```ts
export interface PartnerPersonalDetailsInput {
  fullName: string;
  phone: string;
}

/** Task 15.1 — Personal details. Updates the shared `profiles` row's name/phone. */
export async function updatePartnerPersonalDetails(
  userId: string,
  input: PartnerPersonalDetailsInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.fullName.trim()) {
    return { success: false, error: 'Full name cannot be empty.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[EcoLoop] Partner personal details update failed:', error.message);
    return { success: false, error: 'Could not save your changes. Please try again.' };
  }
  return { success: true };
}

export interface PartnerVehicleDetailsInput {
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
  aadhaarNumber: string;
}

/** Task 15.2 — Vehicle. Updates `partner_profiles`' vehicle + document-number fields. */
export async function updateVehicleDetails(
  userId: string,
  input: PartnerVehicleDetailsInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('partner_profiles')
    .update({
      vehicle_type: input.vehicleType.trim() || null,
      vehicle_number: input.vehicleNumber.trim() || null,
      driving_license: input.drivingLicense.trim() || null,
      aadhaar_number: input.aadhaarNumber.trim() || null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Partner vehicle details update failed:', error.message);
    return { success: false, error: 'Could not save your vehicle details. Please try again.' };
  }
  return { success: true };
}

const PARTNER_DOCUMENTS_BUCKET = 'partner-documents';

/**
 * Task 15.3 — Documents. Uploads a license or Aadhaar photo to the
 * `partner-documents` bucket and saves its public URL onto the matching
 * `partner_profiles` column. Best-effort — returns null on failure.
 */
export async function uploadPartnerDocument(
  userId: string,
  docType: 'license' | 'aadhaar',
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${userId}/${docType}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PARTNER_DOCUMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[EcoLoop] Partner document upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from(PARTNER_DOCUMENTS_BUCKET).getPublicUrl(path);
  const url = publicUrlData.publicUrl;

  const column = docType === 'license' ? 'driving_license_doc_url' : 'aadhaar_doc_url';
  const { error: updateError } = await supabase
    .from('partner_profiles')
    .update({ [column]: url })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[EcoLoop] Saving new document URL failed:', updateError.message);
    return null;
  }

  return url;
}
```

### 4.4 — `usePartnerDashboard.ts`: 4 new exposed actions

New imports:
```ts
import type {
  CompletePickupInput,
  PartnerPersonalDetailsInput,
  PartnerPickup,
  PartnerVehicleDetailsInput,
  RealPartnerProfile,
} from '../services/partnerService';
import { uploadProfilePicture } from '../services/profileService';
```

New actions (same write-then-`load()` pattern as every other action in
this hook):
```ts
const updatePersonalDetails = useCallback(
  async (input: PartnerPersonalDetailsInput) => {
    if (!userId) return { success: false, error: 'Not signed in.' };
    const result = await partnerService.updatePartnerPersonalDetails(userId, input);
    if (result.success) await load();
    return result;
  },
  [userId, load]
);

const uploadProfilePhoto = useCallback(
  async (file: File) => {
    if (!userId) return null;
    const url = await uploadProfilePicture(userId, file);
    if (url) await load();
    return url;
  },
  [userId, load]
);

const updateVehicleDetails = useCallback(
  async (input: PartnerVehicleDetailsInput) => {
    if (!userId) return { success: false, error: 'Not signed in.' };
    const result = await partnerService.updateVehicleDetails(userId, input);
    if (result.success) await load();
    return result;
  },
  [userId, load]
);

const uploadDocument = useCallback(
  async (docType: 'license' | 'aadhaar', file: File) => {
    if (!userId) return null;
    const url = await partnerService.uploadPartnerDocument(userId, docType, file);
    if (url) await load();
    return url;
  },
  [userId, load]
);
```
...and all 4 added to the returned object.

### 4.5 — `DeliveryPartnerModule.tsx`: Profile tab rebuilt

- Destructures the 4 new hook actions.
- New local state: `personalForm`, `personalSaving`, `personalMessage`,
  `photoUploading`, `vehicleForm`, `vehicleSaving`, `vehicleMessage`,
  `uploadingDocType` — same shape as Module 11's `pfForm`/`pfSuccess`
  pattern in `CustomerModule.tsx`.
- A `useEffect` (new import) syncs `personalForm`/`vehicleForm` from the
  loaded `partner` object, same pattern as Module 11's Customer Profile
  form sync.
- 4 new handlers: `handleSavePersonalDetails`, `handleProfilePhotoSelected`,
  `handleSaveVehicleDetails`, `handleDocumentFileSelected`.
- The Profile tab JSX (previously three `readOnly` inputs and a static
  note) is replaced with 4 cards: identity + avatar upload, an editable
  Personal Details form, an editable Vehicle & Document Credentials form,
  and a Document Photos card with an image preview + upload button per
  document.

## 5. New Component

None — Module 15 only extends the existing Profile tab inside
`DeliveryPartnerModule.tsx`; no new file was needed for UI.

## 6. Service & Hook Changes

### 6.1 — `src/services/partnerService.ts`
| Export | Purpose |
|---|---|
| `RealPartnerProfile.drivingLicenseDocUrl` / `.aadhaarDocUrl` *(new fields)* | Uploaded document photo URLs |
| `updatePartnerPersonalDetails(userId, input)` | Task 15.1 |
| `updateVehicleDetails(userId, input)` | Task 15.2 |
| `uploadPartnerDocument(userId, docType, file)` | Task 15.3 |

### 6.2 — `src/hooks/usePartnerDashboard.ts`
Added `updatePersonalDetails`, `uploadProfilePhoto`, `updateVehicleDetails`,
`uploadDocument` — all follow the existing write-then-refresh pattern.

## 7. Database Integration

- `partner_profiles` gains 2 new nullable `text` columns:
  `driving_license_doc_url`, `aadhaar_doc_url`. No default, no `not null`
  constraint — a partner who hasn't uploaded a document yet simply has
  `null` there, rendered as "No document uploaded" in the UI.
- No changes to `pickup_requests`, `transactions`, or any earnings-related
  table — Task 15.4 (Earnings history) needed no database work, since
  Module 12/14 already made the Earning Records tab real.

## 8. Business Logic

- **Personal details**: full name is required (mirrors Module 11's
  Customer Profile validation exactly); phone is optional and stored as
  `null` if left blank.
- **Vehicle & document numbers**: all 4 fields are optional at the
  database level (matches the existing nullable columns from Module 3) —
  a partner can clear a field and save, same as leaving it blank at
  sign-up.
- **Document photos**: best-effort uploads, same failure-tolerant pattern
  as every other photo upload in this app (Module 6/9/11/13) — a failed
  upload shows an alert and leaves the previously-saved document (if any)
  untouched, rather than corrupting existing data.
- **Re-uploading a document** simply overwrites the *column value*, not
  the storage object — the old file stays in the bucket, unlinked. This
  matches the exact behavior Module 11 already documented for avatar
  re-uploads, kept consistent rather than introducing delete-on-replace
  logic this project hasn't used anywhere else.

## 9. Edge Cases & Deliberate Scope Boundaries

- **No document "verification status" workflow.** The roadmap's Module 15
  task is "Documents" (upload), not admin review/approval of those
  documents — that would belong to a later Admin module (e.g. Module 20's
  partner approval flow) and isn't invented here.
- **Email is still not editable anywhere in the app** — the read-only
  email field on the new Personal Details form is consistent with Module
  11's Customer Profile, which has the same restriction and the same
  reasoning (no email-change flow exists in Module 4).
- **No new RLS policies were needed for the 2 new columns or for the text
  fields (vehicle/license/Aadhaar numbers).** `partner_profiles_owner_update`
  (Module 12) already covers every column on the row by `user_id`, and RLS
  policies in Postgres are row-scoped, not column-scoped — a genuinely new
  policy was only needed for the brand-new `partner-documents` **storage**
  bucket, which didn't exist before.
- **Unauthorized access:** every new write (`updatePartnerPersonalDetails`,
  `updateVehicleDetails`, `uploadPartnerDocument`) is scoped by
  `.eq('user_id', userId)` / `.eq('id', userId)` and backed by the existing
  owner-only RLS policies — a partner can never edit another partner's
  profile or upload a document into another partner's storage folder (the
  `partner_documents_owner_insert` policy checks
  `(storage.foldername(name))[1] = auth.uid()::text`, same pattern as
  `profile-photos` and `pickup-photos`).

## 10. Verification

### Files Created
| File | Purpose |
|---|---|
| `supabase/module15_partner_profile_schema.sql` | New columns + `partner-documents` bucket/RLS |
| `docs/MODULE_15_IMPLEMENTATION_GUIDE.md` | This file |
| `docs/MODULE_15_MANUAL_TEST_CHECKLIST.md` | Manual QA steps |

### Files Modified
| File | Reason |
|---|---|
| `src/services/partnerService.ts` | New fields + 3 new functions |
| `src/hooks/usePartnerDashboard.ts` | Exposed 4 new actions |
| `src/components/DeliveryPartnerModule.tsx` | Profile tab rebuilt as 4 editable/uploadable cards |

### SQL Files
`supabase/module15_partner_profile_schema.sql` — 2 new columns on
`partner_profiles`, 1 new storage bucket, 4 new storage RLS policies.

### Storage Changes
New `partner-documents` bucket (public, owner-folder-scoped write),
mirroring `profile-photos` and `pickup-photos`.

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
- ✅ No broken Modules 1–14
- ✅ Module 15 fully integrated with Module 11 (reuses
  `profileService.uploadProfilePicture` as-is) and Module 12
  (extends `RealPartnerProfile`/`getPartnerProfile` in place)
- ✅ Personal details, vehicle details, and document photos all persist to
  real Supabase columns/storage — no mock Module 15 data remains anywhere
- ✅ Every write is scoped to the signed-in partner's own row/folder by
  existing or newly-added owner-only RLS
