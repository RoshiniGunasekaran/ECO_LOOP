# MODULE 9 — DIY PROJECTS — IMPLEMENTATION GUIDE

## 0. Overview
Module 9 replaces every mock behind the Customer Module's **DIY Crafts &
submissions** tab with real Supabase reads/writes: a real submission form
with real before/after photo uploads, a real "my submissions" history, real
approval status, and real edit/delete for still-Pending submissions. The
read-only **Community** tab (browsing *other* customers' approved crafts,
liking, commenting) is intentionally left untouched — that's Module 10's job.

## 1. What Module 9 Adds
| Task | What's added | How |
|---|---|---|
| 9.1 Submit project | ✅ New | Real `insert` into `diy_projects` via `createDiyProject` |
| 9.2 Upload images | ✅ New | Before/after craft photos uploaded to the new `diy-photos` storage bucket, replacing the old "paste a URL" inputs |
| 9.3 Project history | ✅ New | `getMyDiyProjects` reads the logged-in customer's own real rows, newest first |
| 9.4 Approval status | ✅ New | Real `status` column (Pending/Approved/Rejected) rendered on each submission |
| 9.5 Edit project | ✅ New | `updateDiyProject`, allowed only while `status = 'Pending'` (enforced by RLS) |
| 9.6 Delete project | ✅ New | `deleteDiyProject`, allowed only while `status = 'Pending'` (enforced by a brand-new RLS DELETE policy) |

## 2. Files to Create
- `supabase/module9_diy_schema.sql` — storage bucket + RLS changes for this module
- `src/services/diyService.ts` — every Supabase call for this module
- `src/hooks/useCustomerDIY.ts` — loads "my submissions", exposes create/update/delete
- `MODULE_9_IMPLEMENTATION_GUIDE.md` (this file)
- `MODULE_9_MANUAL_TEST_CHECKLIST.md`

## 3. Files to Modify
- `src/components/CustomerModule.tsx` — import + wire the new hook, replace the DIY submission state/handlers, replace the DIY Projects tab JSX

No other file needs to change. `src/types.ts` is **left alone** — same call
Module 6 made for `RealPickup`: a local `RealDIYProject` type lives in
`diyService.ts` instead, so the existing mock `DIYProject` type (still used
by the untouched Community tab, `handleLikeDIY`, and `handleAddComment`)
isn't disturbed. `src/data.ts` and `DatabaseContext.tsx` are also left
alone — `diyProjects` / `setDiyProjects` stay in place because the
Community tab still reads them.

---

## 4. Database Changes — `supabase/module9_diy_schema.sql`

Run this in Supabase SQL Editor. Prerequisite: `module3_database_schema.sql`
and `Rls_gap_fix.sql` must already be applied.

**What it does, in order:**
1. Creates the **`diy-photos`** storage bucket (public read; a customer may
   only write inside their own `${user_id}/...` folder) — mirrors the
   `pickup-photos` bucket pattern from Module 2/6.
2. **Fixes** `diy_projects`' UPDATE policy: it previously let a customer
   edit their submission at *any* status, including after an admin had
   already Approved/Rejected it. It's now restricted to `status = 'Pending'`
   for customers (admins keep full access, for the future Approve/Reject
   screen).
3. Adds a **new DELETE policy**: a customer may permanently delete their
   own submission only while it's still `Pending`. Unlike `pickup_requests`
   (which has a `Cancelled` status to fall back on), `diy_projects` has no
   such state, so a real hard delete — scoped to Pending rows only — is the
   correct behavior for this table.

```sql
-- ============================================================================
-- ECOLOOP — MODULE 9: DIY PROJECTS (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql and Rls_gap_fix.sql must
--               already be run.
-- ============================================================================
-- WHAT ALREADY EXISTED (from Module 3, unused for real writes until now):
--   - public.diy_projects        — real table, real columns, RLS enabled.
--     Had SELECT (public can view Approved, owner can view own, admin all)
--     and INSERT (owner) policies, but its UPDATE policy let a customer
--     edit their row at ANY status — including after an admin had already
--     Approved/Rejected it — and there was no DELETE policy at all.
--   - public.diy_project_comments / public.diy_project_likes — real tables,
--     RLS enabled, but NO policies of any kind yet (default-deny). These
--     back the read-only "Community" showcase tab, which stays on mock
--     data until Module 10 (Community) wires it up — out of scope here.
--
-- WHY THIS FILE EXISTS: Module 9's six tasks (Submit project, Upload
-- images, Project history, Approval status, Edit project, Delete project)
-- need three things that don't exist yet:
--   1. A storage bucket for before/after craft photos (`diy-photos`) —
--      `diy_projects.before_image` / `after_image` have existed as plain
--      text columns since Module 3, but nothing has ever uploaded a real
--      file into them; the mock UI just took a pasted URL.
--   2. A tightened UPDATE policy — task 9.5 ("Edit project") only makes
--      sense while an admin hasn't reviewed the submission yet, the same
--      "customer can only edit while Pending" rule Module 6 applied to
--      pickup_requests.
--   3. A new DELETE policy — task 9.6 ("Delete project"), scoped the same
--      way: a customer may only delete their own still-Pending submission.
--      (Unlike pickup_requests, diy_projects has no 'Cancelled' status to
--      fall back on, so a real hard delete — restricted to Pending rows
--      only — is the correct behavior here, not a soft-cancel.)
-- ============================================================================


-- ============================================================================
-- 1. STORAGE — `diy-photos` bucket for before/after craft images
-- ============================================================================
-- Public bucket (read-only for anyone), same shape as `pickup-photos`
-- (Module 2): a customer may only write inside their own `${user_id}/...`
-- folder, and only ever create/replace/delete their own files.
insert into storage.buckets (id, name, public)
values ('diy-photos', 'diy-photos', true)
on conflict (id) do nothing;

create policy "diy_photos_public_read" on storage.objects
  for select using (bucket_id = 'diy-photos');

create policy "diy_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'diy-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "diy_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'diy-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- No UPDATE policy — a re-upload during Edit simply writes a new object
-- (unique, timestamped filename), it never overwrites an existing one.


-- ============================================================================
-- 2. FIX: diy_projects UPDATE policy — restrict customer edits to Pending
--    (Module 9 task 9.5 — Edit project)
-- ============================================================================
drop policy if exists "diy_owner_update" on public.diy_projects;

create policy "diy_owner_update_pending_or_admin" on public.diy_projects
  for update using (
    (customer_id = auth.uid() and status = 'Pending')
    or public.current_user_role() = 'admin'
  );
-- Before this fix, a customer could still edit project_name/description/etc.
-- on a project an admin had already Approved or Rejected — silently
-- invalidating whatever the admin reviewed. Admins are unaffected: they
-- still need full UPDATE access to Approve/Reject any submission
-- regardless of status (Module 23's job, not this module's, to build the
-- admin-facing screen for that — the RLS just needs to allow it).


-- ============================================================================
-- 3. NEW: diy_projects DELETE policy
--    (Module 9 task 9.6 — Delete project)
-- ============================================================================
create policy "diy_owner_delete_pending_or_admin" on public.diy_projects
  for delete using (
    (customer_id = auth.uid() and status = 'Pending')
    or public.current_user_role() = 'admin'
  );
-- A customer may permanently remove their own submission only while it is
-- still awaiting review. Once Approved or Rejected, it is part of the
-- historical/community record and can no longer be deleted by the
-- customer (an admin still can, for moderation). `on delete cascade` on
-- `diy_project_comments.project_id` / `diy_project_likes.project_id`
-- (from Module 3) means a delete here can never leave orphaned rows —
-- moot for a Pending project in practice, since nothing can comment/like
-- a project that isn't Approved yet, but the cascade is correct either way.
```

**Storage:** creates the `diy-photos` bucket (new — see section 1 above).

---

## 5. New Service — `src/services/diyService.ts` (complete file)

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  DIY SERVICE — Module 9 (DIY Projects)
 * ============================================================
 *  Every real database read/write for the Customer's "DIY
 *  Crafts & submissions" tab lives here. CustomerModule.tsx
 *  never talks to `supabase` directly for a customer's own DIY
 *  submissions — it calls these functions (via useCustomerDIY)
 *  instead.
 *
 *  WHAT'S REAL vs WHAT'S STILL OUT OF SCOPE:
 *  - Submit, edit (while Pending), delete (while Pending), and
 *    "my submissions" history are all real Supabase reads/
 *    writes now.
 *  - Before/after craft photos are uploaded to the real
 *    `diy-photos` storage bucket (created by this module's
 *    schema file) instead of pasted as a URL.
 *  - "Approval status" reads the real `status` column
 *    (Pending/Approved/Rejected), but nothing in the app can
 *    actually SET it to Approved/Rejected yet — that's Module 23
 *    (Admin → Reward Management). Until then, a submission only
 *    changes status if you update it manually in Supabase's
 *    Table Editor. Likewise `reward_earned` stays 0 until that
 *    module wires up awarding points on approval.
 *  - The read-only "Community" showcase tab (browsing OTHER
 *    customers' approved projects, liking, commenting) is
 *    UNTOUCHED by this module and still runs on mock data —
 *    that's Module 10 (Community)'s job, not this one's.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface NewDiyProjectInput {
  projectName: string;
  projectDescription: string;
  materialsUsed: string[];
  estimatedCost: number;
  benefits?: string;
}

export interface EditableDiyProjectInput {
  projectName?: string;
  projectDescription?: string;
  materialsUsed?: string[];
  estimatedCost?: number;
  benefits?: string;
}

export interface RealDIYProject {
  id: number;
  customerId: string;
  projectName: string;
  projectDescription: string;
  materialsUsed: string[];
  estimatedCost: number;
  benefits: string | null;
  beforeImage: string | null;
  afterImage: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  rewardEarned: number;
  likes: number;
  createdAt: string;
}

const DIY_PHOTOS_BUCKET = 'diy-photos';

/**
 * Uploads a single before/after craft photo to the `diy-photos` bucket and
 * returns its public URL. Best-effort — returns null on failure instead of
 * throwing, so one bad photo never blocks the rest of the submission.
 */
async function uploadDiyImage(userId: string, file: File, slot: 'before' | 'after'): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${userId}/${Date.now()}-${slot}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DIY_PHOTOS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error(`[EcoLoop] DIY ${slot} image upload failed:`, uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from(DIY_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mapRow(row: any): RealDIYProject {
  return {
    id: row.id,
    customerId: row.customer_id,
    projectName: row.project_name,
    projectDescription: row.project_description,
    materialsUsed: row.materials_used ?? [],
    estimatedCost: Number(row.estimated_cost ?? 0),
    benefits: row.benefits,
    beforeImage: row.before_image,
    afterImage: row.after_image,
    status: row.status,
    rewardEarned: row.reward_earned ?? 0,
    likes: row.likes ?? 0,
    createdAt: row.created_at,
  };
}

/** Task 9.3 — Project history. The logged-in customer's own submissions, newest first. */
export async function getMyDiyProjects(userId: string): Promise<RealDIYProject[]> {
  const { data, error } = await supabase
    .from('diy_projects')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching DIY submissions failed:', error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}

/** Task 9.1 + 9.2 — Submit project, with optional before/after photo uploads. */
export async function createDiyProject(
  userId: string,
  input: NewDiyProjectInput,
  beforeFile: File | null,
  afterFile: File | null
): Promise<number | null> {
  const [beforeUrl, afterUrl] = await Promise.all([
    beforeFile ? uploadDiyImage(userId, beforeFile, 'before') : Promise.resolve(null),
    afterFile ? uploadDiyImage(userId, afterFile, 'after') : Promise.resolve(null),
  ]);

  const { data, error } = await supabase
    .from('diy_projects')
    .insert({
      customer_id: userId,
      project_name: input.projectName,
      project_description: input.projectDescription,
      materials_used: input.materialsUsed,
      estimated_cost: input.estimatedCost,
      benefits: input.benefits || null,
      before_image: beforeUrl,
      after_image: afterUrl,
      status: 'Pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[EcoLoop] Create DIY project failed:', error?.message);
    return null;
  }

  return data.id;
}

/**
 * Task 9.5 — Edit project. RLS (module9_diy_schema.sql) only allows this
 * while the project's status is still 'Pending'; if it was already
 * reviewed, the update is silently rejected by Postgres (0 rows affected)
 * and this returns false.
 */
export async function updateDiyProject(
  userId: string,
  projectId: number,
  updates: EditableDiyProjectInput,
  beforeFile: File | null,
  afterFile: File | null
): Promise<boolean> {
  const [beforeUrl, afterUrl] = await Promise.all([
    beforeFile ? uploadDiyImage(userId, beforeFile, 'before') : Promise.resolve(null),
    afterFile ? uploadDiyImage(userId, afterFile, 'after') : Promise.resolve(null),
  ]);

  const payload: Record<string, unknown> = {};
  if (updates.projectName !== undefined) payload.project_name = updates.projectName;
  if (updates.projectDescription !== undefined) payload.project_description = updates.projectDescription;
  if (updates.materialsUsed !== undefined) payload.materials_used = updates.materialsUsed;
  if (updates.estimatedCost !== undefined) payload.estimated_cost = updates.estimatedCost;
  if (updates.benefits !== undefined) payload.benefits = updates.benefits || null;
  if (beforeUrl) payload.before_image = beforeUrl;
  if (afterUrl) payload.after_image = afterUrl;

  const { data, error } = await supabase
    .from('diy_projects')
    .update(payload)
    .eq('id', projectId)
    .select('id');

  if (error) {
    console.error('[EcoLoop] Update DIY project failed:', error.message);
    return false;
  }

  // RLS blocks (rather than errors on) an update to a non-Pending row —
  // Postgres just matches/updates 0 rows, so check that explicitly.
  return (data ?? []).length > 0;
}

/**
 * Task 9.6 — Delete project. RLS only allows this while the project's
 * status is still 'Pending'.
 */
export async function deleteDiyProject(projectId: number): Promise<boolean> {
  const { data, error } = await supabase.from('diy_projects').delete().eq('id', projectId).select('id');

  if (error) {
    console.error('[EcoLoop] Delete DIY project failed:', error.message);
    return false;
  }

  return (data ?? []).length > 0;
}
```

---

## 6. New Hook — `src/hooks/useCustomerDIY.ts` (complete file)

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerDIY — Module 9 (DIY Projects)
 * ============================================================
 *  Loads the logged-in customer's real DIY submissions and
 *  exposes create / edit / delete actions that write to
 *  Supabase and then refresh the list.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as diyService from '../services/diyService';
import type { EditableDiyProjectInput, NewDiyProjectInput, RealDIYProject } from '../services/diyService';

interface UseCustomerDIYResult {
  loading: boolean;
  myProjects: RealDIYProject[];
  submitting: boolean;
  refresh: () => Promise<void>;
  createProject: (input: NewDiyProjectInput, beforeFile: File | null, afterFile: File | null) => Promise<number | null>;
  updateProject: (
    projectId: number,
    updates: EditableDiyProjectInput,
    beforeFile: File | null,
    afterFile: File | null
  ) => Promise<boolean>;
  deleteProject: (projectId: number) => Promise<boolean>;
}

export function useCustomerDIY(): UseCustomerDIYResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [myProjects, setMyProjects] = useState<RealDIYProject[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await diyService.getMyDiyProjects(userId);
    setMyProjects(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createProject = useCallback(
    async (input: NewDiyProjectInput, beforeFile: File | null, afterFile: File | null) => {
      if (!userId) return null;
      setSubmitting(true);
      const id = await diyService.createDiyProject(userId, input, beforeFile, afterFile);
      setSubmitting(false);
      if (id !== null) await load();
      return id;
    },
    [userId, load]
  );

  const updateProject = useCallback(
    async (
      projectId: number,
      updates: EditableDiyProjectInput,
      beforeFile: File | null,
      afterFile: File | null
    ) => {
      if (!userId) return false;
      setSubmitting(true);
      const ok = await diyService.updateDiyProject(userId, projectId, updates, beforeFile, afterFile);
      setSubmitting(false);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const deleteProject = useCallback(
    async (projectId: number) => {
      const ok = await diyService.deleteDiyProject(projectId);
      if (ok) await load();
      return ok;
    },
    [load]
  );

  return {
    loading,
    myProjects,
    submitting,
    refresh: load,
    createProject,
    updateProject,
    deleteProject,
  };
}
```

---

## 7. Edits to `src/components/CustomerModule.tsx`

### 7.1 Import the new hook

```
Find:
import { useCustomerRewards } from '../hooks/useCustomerRewards';
import { 

Replace:
import { useCustomerRewards } from '../hooks/useCustomerRewards';
import { useCustomerDIY } from '../hooks/useCustomerDIY';
import { 
```

### 7.2 Import the `RealDIYProject` type

```
Find:
import type { RealPickup } from '../services/pickupService';

Replace:
import type { RealPickup } from '../services/pickupService';
import type { RealDIYProject } from '../services/diyService';
```

### 7.3 Add the `Pencil` icon

```
Find:
  Trophy, Lock
} from 'lucide-react';

Replace:
  Trophy, Lock, Pencil
} from 'lucide-react';
```

### 7.4 Wire up the Module 9 hook (placed right after the Module 8 rewards hook)

```
Find:
    redeemReward: rwRedeemReward,
  } = useCustomerRewards();

Replace:
    redeemReward: rwRedeemReward,
  } = useCustomerRewards();

  // Module 9 (DIY Projects) — REAL Supabase-backed data. Prefixed with "dy"
  // so it never collides with the mock `diyProjects` array above, which
  // stays in place because the read-only "Community" showcase tab (browsing
  // OTHER customers' approved crafts, liking, commenting) still runs on it
  // until Module 10 (Community) wires that tab up for real.
  const {
    loading: dyLoading,
    myProjects: dyMyProjects,
    submitting: dySubmitting,
    createProject: dyCreateProject,
    updateProject: dyUpdateProject,
    deleteProject: dyDeleteProject,
  } = useCustomerDIY();
```

### 7.5 Replace the mock URL-based DIY form state with real file-upload + edit state

```
Find:
  // DIY Submission State
  const [newDIY, setNewDIY] = useState({
    name: '',
    description: '',
    materials: '',
    estimatedCost: 5,
    benefits: '',
    beforeImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=200',
    afterImage: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&q=80&w=200'
  });
  const [diySuccess, setDiySuccess] = useState(false);

Replace:
  // DIY Submission State — Module 9: real photo files instead of pasted
  // URLs, plus `editingDiyId` so the same form does both create and edit.
  const [newDIY, setNewDIY] = useState({
    name: '',
    description: '',
    materials: '',
    estimatedCost: 5,
    benefits: '',
    beforeImageFile: null as File | null,
    beforeImagePreview: '',
    afterImageFile: null as File | null,
    afterImagePreview: ''
  });
  const [diySuccess, setDiySuccess] = useState(false);
  const [diyError, setDiyError] = useState('');
  const [editingDiyId, setEditingDiyId] = useState<number | null>(null);
```

### 7.6 Replace `handleDIYSubmit` with real create/edit logic, add image-change/edit/cancel-edit/delete handlers

```
Find:
  const handleDIYSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const diyId = `DIY-${Math.floor(100 + Math.random() * 900)}`;
    const newCraft: DIYProject = {
      id: diyId,
      customerId: customer.id,
      customerName: customer.name,
      projectName: newDIY.name,
      projectDescription: newDIY.description,
      materialsUsed: newDIY.materials.split(',').map(m => m.trim()),
      estimatedCost: newDIY.estimatedCost,
      benefits: newDIY.benefits,
      beforeImage: newDIY.beforeImage,
      afterImage: newDIY.afterImage,
      status: 'Pending',
      rewardEarned: 0,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    setDiyProjects([newCraft, ...diyProjects]);
    setDiySuccess(true);
    setTimeout(() => {
      setDiySuccess(false);
      setNewDIY({
        name: '', description: '', materials: '', estimatedCost: 5, benefits: '',
        beforeImage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=200',
        afterImage: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&q=80&w=200'
      });
      setActiveTab('diy-projects');
    }, 2000);
  };

Replace:
  const resetDIYForm = () => {
    setNewDIY({
      name: '', description: '', materials: '', estimatedCost: 5, benefits: '',
      beforeImageFile: null, beforeImagePreview: '',
      afterImageFile: null, afterImagePreview: ''
    });
    setEditingDiyId(null);
  };

  const handleDIYImageChange = (slot: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (slot === 'before') {
      setNewDIY({ ...newDIY, beforeImageFile: file, beforeImagePreview: previewUrl });
    } else {
      setNewDIY({ ...newDIY, afterImageFile: file, afterImagePreview: previewUrl });
    }
  };

  // Task 9.5 — Populate the form from an existing submission and switch it into edit mode.
  const handleEditDIYProject = (project: RealDIYProject) => {
    setEditingDiyId(project.id);
    setDiyError('');
    setDiySuccess(false);
    setNewDIY({
      name: project.projectName,
      description: project.projectDescription,
      materials: project.materialsUsed.join(', '),
      estimatedCost: project.estimatedCost,
      benefits: project.benefits ?? '',
      beforeImageFile: null,
      beforeImagePreview: project.beforeImage ?? '',
      afterImageFile: null,
      afterImagePreview: project.afterImage ?? ''
    });
  };

  const handleCancelEditDIY = () => resetDIYForm();

  // Task 9.6 — Delete a still-Pending submission (RLS enforces the Pending-only rule server-side too).
  const handleDeleteDIYProject = async (project: RealDIYProject) => {
    if (project.status !== 'Pending') {
      alert('This project has already been reviewed and can no longer be deleted.');
      return;
    }
    if (!confirm(`Delete "${project.projectName}"? This can't be undone.`)) return;

    const ok = await dyDeleteProject(project.id);
    if (!ok) alert('Could not delete this project. Please try again.');
    if (editingDiyId === project.id) resetDIYForm();
  };

  const handleDIYSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiyError('');

    const materialsUsed = newDIY.materials.split(',').map(m => m.trim()).filter(Boolean);
    const payload = {
      projectName: newDIY.name,
      projectDescription: newDIY.description,
      materialsUsed,
      estimatedCost: newDIY.estimatedCost,
      benefits: newDIY.benefits,
    };

    let ok: boolean;
    if (editingDiyId !== null) {
      ok = await dyUpdateProject(editingDiyId, payload, newDIY.beforeImageFile, newDIY.afterImageFile);
      if (!ok) setDiyError('Could not save your changes. This project may have already been reviewed.');
    } else {
      const newId = await dyCreateProject(payload, newDIY.beforeImageFile, newDIY.afterImageFile);
      ok = newId !== null;
      if (!ok) setDiyError('Could not submit your DIY project. Please check your connection and try again.');
    }

    if (!ok) return;

    setDiySuccess(true);
    setTimeout(() => {
      setDiySuccess(false);
      resetDIYForm();
      setActiveTab('diy-projects');
    }, 2000);
  };
```

`handleLikeDIY` and `handleAddComment` are **untouched** — they still
operate on the mock `diyProjects` array for the Community tab, which is
Module 10's job to make real.

### 7.7 Replace the DIY Projects tab JSX

Find the block starting at `{/* DIY PROJECTS VIEW */}` and ending at the
`)}` right before `{/* COMMUNITY DIY PROJECTS */}`, and replace it with:

```tsx
{/* DIY PROJECTS VIEW */}
{activeTab === 'diy-projects' && (
  <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-extrabold text-slate-900">
            {editingDiyId !== null ? 'Edit DIY Eco Craft' : 'Submit DIY Eco Craft'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingDiyId !== null
              ? 'You can edit this submission until it has been reviewed.'
              : 'Submit designs where you repurposed household waste into items. Earn Eco Points upon administrative review.'}
          </p>
        </div>
        {editingDiyId !== null && (
          <button onClick={handleCancelEditDIY} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Cancel edit
          </button>
        )}
      </div>

      {diySuccess ? (
        <div className="py-12 text-center flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 font-display">
            {editingDiyId !== null ? 'DIY Craft Updated!' : 'DIY Craft Submitted!'}
          </h3>
          <p className="text-xs text-slate-400">Our content auditors will review your craft before adding it to the community lobby.</p>
        </div>
      ) : (
        <form onSubmit={handleDIYSubmit} className="flex flex-col gap-4 mt-4">
          {diyError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg p-2.5 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {diyError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Project Name</label>
            <input type="text" required placeholder="e.g. Plastic Bottle Hanging Planters" value={newDIY.name} onChange={(e) => setNewDIY({ ...newDIY, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Description & Guide</label>
            <textarea rows={3} required placeholder="How did you build it? What waste was repurposed? Describe..." value={newDIY.description} onChange={(e) => setNewDIY({ ...newDIY, description: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Materials list (comma separated)</label>
              <input type="text" placeholder="Soda bottle, twine, paint" value={newDIY.materials} onChange={(e) => setNewDIY({ ...newDIY, materials: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Repurposing Benefit</label>
              <input type="text" placeholder="Diverts plastic, adds greenery" value={newDIY.benefits} onChange={(e) => setNewDIY({ ...newDIY, benefits: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
            </div>
          </div>

          {/* Before / After Images — real file uploads (Task 9.2) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Before Photo</label>
              {newDIY.beforeImagePreview && (
                <img src={newDIY.beforeImagePreview} alt="before preview" className="h-20 w-full object-cover rounded-lg border border-slate-200 mb-1" />
              )}
              <label className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2 cursor-pointer hover:bg-slate-100">
                <Upload className="w-3.5 h-3.5" /> {newDIY.beforeImageFile ? newDIY.beforeImageFile.name : 'Choose photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDIYImageChange('before', e)} />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">After Photo</label>
              {newDIY.afterImagePreview && (
                <img src={newDIY.afterImagePreview} alt="after preview" className="h-20 w-full object-cover rounded-lg border border-slate-200 mb-1" />
              )}
              <label className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2 cursor-pointer hover:bg-slate-100">
                <Upload className="w-3.5 h-3.5" /> {newDIY.afterImageFile ? newDIY.afterImageFile.name : 'Choose photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDIYImageChange('after', e)} />
              </label>
            </div>
          </div>

          <button type="submit" disabled={dySubmitting} className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
            {dySubmitting ? 'Saving...' : editingDiyId !== null ? 'Save Changes' : 'Submit DIY Project'}
          </button>
        </form>
      )}
    </div>

    {/* MY PAST SUBMISSIONS — Task 9.3 (Project history) + 9.4 (Approval status) */}
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-4">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">My Submitted Craft Challenges</h3>

      {dyLoading ? (
        <p className="text-xs text-slate-400">Loading your submissions...</p>
      ) : dyMyProjects.length === 0 ? (
        <p className="text-xs text-slate-400">You haven't submitted any DIY crafts yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {dyMyProjects.map((p) => (
            <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.afterImage ? (
                  <img className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0" src={p.afterImage} alt="craft" />
                ) : (
                  <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{p.projectName}</h4>
                  <p className="text-[9px] text-slate-400 font-mono">Submitted: {p.createdAt.slice(0, 10)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700'
                      : p.status === 'Rejected' ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                  }`}>{p.status}</span>
                  {p.status === 'Approved' && <p className="text-[10px] text-brand-600 font-bold mt-1">+{p.rewardEarned} XP Earned</p>}
                </div>
                {p.status === 'Pending' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditDIYProject(p)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteDIYProject(p)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

No other tab, no sidebar nav, no bottom nav, no routing changes, and no
edits to the `community` tab — the `diy-projects` tab id and its nav entry
are unchanged.

---

## 8. Business Rules
- **A submission is only ever editable/deletable while `Pending`.** Both
  are enforced twice: client-side (the Edit/Delete buttons only render for
  `Pending` rows) and server-side (RLS silently blocks the write, matching
  the "customer can only edit a Pending pickup" rule Module 6 already set
  for `pickup_requests`).
- **Delete is a real hard delete, scoped to Pending only.** `diy_projects`
  has no `Cancelled`-style status to fall back on the way pickups do, so
  once a submission is reviewed it becomes part of the permanent
  Approved/Rejected record and can no longer be removed by the customer —
  only an admin can, for moderation.
- **Photos are real uploaded files, not pasted URLs**, stored under the
  uploader's own folder (`${user_id}/...`) in the new `diy-photos` bucket,
  the same ownership-scoped-folder convention `pickup-photos` uses.
- **Approval and reward-point awarding are explicitly out of scope.**
  `status` and `reward_earned` are read-only from the customer's side —
  nothing in this module can move a submission out of `Pending`. That's
  Module 23 (Admin → Reward Management)'s job.
- **The Community tab is untouched on purpose.** It's a different task
  (Module 10) — browsing *other* customers' approved crafts, liking, and
  commenting are all still mock data after this module.

## 9. Edge Cases Handled
- No submissions yet → "You haven't submitted any DIY crafts yet." instead of a blank list.
- Submitting/editing with no photo selected → `beforeImage`/`afterImage` stay `null`/unchanged; the UI shows a placeholder icon instead of a broken `<img>`.
- One photo upload fails (network blip) → the other upload and the row write still proceed; the failed slot is simply left blank instead of blocking the whole submission.
- Editing a project that gets Approved/Rejected by an admin *in another tab* while the edit form is still open → the update returns 0 rows affected, `updateDiyProject` returns `false`, and the UI shows "This project may have already been reviewed." instead of silently pretending success.
- Clicking Delete on a non-`Pending` project (shouldn't be reachable via the UI, but guarded anyway) → blocked with an explicit alert before any network call.
- Deleting the project currently open in the edit form → the form resets automatically instead of continuing to edit a row that no longer exists.
- Materials list left blank or with stray commas (`"a, , b"`) → empty entries are filtered out before saving.
- Very long project name/description → no truncation on save; only the "My Submitted Craft Challenges" list row truncates visually (`truncate` class) so long names don't break the layout.

## 10. Verification
1. `npx tsc --noEmit` → confirmed clean (0 errors) after all Module 9 changes.
2. `npm run build` (`vite build`) → run this in your own environment after `npm install`.
3. Confirm every other Customer tab (Dashboard, Create Pickup, Pickups, Wallet, Rewards, Community, Settings, Support) still renders and behaves exactly as before — Module 9 only touches the DIY Projects tab and two new files.

## 11. Completion Report

**Files created**
- `supabase/module9_diy_schema.sql`
- `src/services/diyService.ts`
- `src/hooks/useCustomerDIY.ts`
- `MODULE_9_IMPLEMENTATION_GUIDE.md` (this file)
- `MODULE_9_MANUAL_TEST_CHECKLIST.md`

**Files modified**
- `src/components/CustomerModule.tsx` — imports, `Pencil` icon, hook wiring, DIY form state, `handleDIYSubmit` + new `handleDIYImageChange`/`handleEditDIYProject`/`handleCancelEditDIY`/`handleDeleteDIYProject`, and the entire DIY Projects tab JSX (submit/edit form with real photo uploads, and the real "my submissions" history with edit/delete)

**Tables used:** `diy_projects` (existed since Module 3; UPDATE policy fixed, DELETE policy **new**). **Bucket used:** `diy-photos` (**new**).

**Verification performed:** `npx tsc --noEmit` → clean.

**Features completed:** all 6 Module 9 tasks (9.1–9.6).

**Pending / explicitly out of scope for Module 9:**
- Admin Approve/Reject screen and awarding `reward_earned` points on approval — that's Module 23 (Admin → Reward Management)'s job; until then, `status` is changed manually via the Supabase Table Editor.
- The Community tab (browsing other customers' Approved crafts, liking, commenting) — still mock data, that's Module 10 (Community)'s job.
- `diy_project_comments` / `diy_project_likes` have RLS enabled but **no policies at all yet** (default-deny) — also Module 10's job, not touched here.

**Next module:** Module 10 — Community.
