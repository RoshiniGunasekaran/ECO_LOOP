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
