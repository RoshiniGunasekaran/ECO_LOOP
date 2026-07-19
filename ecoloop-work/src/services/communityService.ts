/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  COMMUNITY SERVICE — Module 10 (Community)
 * ============================================================
 *  Every real database read/write for the Customer's "Community
 *  Explorer" tab lives here. CustomerModule.tsx never talks to
 *  `supabase` directly for the community feed — it calls these
 *  functions (via useCommunity) instead.
 *
 *  WHAT'S REAL:
 *  - The feed itself: real Approved diy_projects, newest first,
 *    with a real like count and a real comment count.
 *  - Like / unlike: writes to diy_project_likes, which a
 *    database trigger (module10_community_schema.sql) mirrors
 *    into diy_projects.likes.
 *  - Comment: writes to diy_project_comments.
 *  - Save/bookmark: writes to diy_project_saves (private per user).
 *  - Report: writes to diy_project_reports (owner-write, owner/
 *    admin-read — a future admin screen reviews these).
 *  - Search and Filter (tasks 10.2 / 10.3) are NOT separate
 *    network calls — they run client-side (useCommunity /
 *    CustomerModule) over the single feed this file returns,
 *    same as My Pickup Requests' search/filter in Module 6.
 *  - Share (task 10.6) needs no service function at all — it's
 *    a client-side Web Share API / clipboard action in the
 *    component using data the feed already has.
 * ============================================================
 */

import { supabase } from '../lib/supabaseClient';

export interface CommunityProject {
  id: number;
  customerId: string;
  authorName: string;
  projectName: string;
  projectDescription: string;
  materialsUsed: string[];
  beforeImage: string | null;
  afterImage: string | null;
  likes: number;
  commentCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  createdAt: string;
}

export interface CommunityComment {
  id: number;
  projectId: number;
  userId: string | null;
  userName: string;
  text: string;
  createdAt: string;
}

export type ReportReason =
  | 'Inappropriate Content'
  | 'Spam'
  | 'Misleading Information'
  | 'Copyright Issue'
  | 'Other';

function mapProjectRow(
  row: any,
  likedIds: Set<number>,
  savedIds: Set<number>,
  commentCounts: Map<number, number>
): CommunityProject {
  return {
    id: row.id,
    customerId: row.customer_id,
    authorName: row.customer_display_name || 'Eco Hero',
    projectName: row.project_name,
    projectDescription: row.project_description,
    materialsUsed: row.materials_used ?? [],
    beforeImage: row.before_image,
    afterImage: row.after_image,
    likes: row.likes ?? 0,
    commentCount: commentCounts.get(row.id) ?? 0,
    isLikedByMe: likedIds.has(row.id),
    isSavedByMe: savedIds.has(row.id),
    createdAt: row.created_at,
  };
}

function mapCommentRow(row: any): CommunityComment {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.comment_text,
    createdAt: row.created_at,
  };
}

/** Task 10.1 — Community feed. Every Approved DIY project, newest first. */
export async function getCommunityFeed(userId: string): Promise<CommunityProject[]> {
  const { data: projects, error } = await supabase
    .from('diy_projects')
    .select('*')
    .eq('status', 'Approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EcoLoop] Fetching community feed failed:', error.message);
    return [];
  }

  const rows = projects ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [likedResult, savedResult, commentsResult] = await Promise.all([
    supabase.from('diy_project_likes').select('project_id').eq('user_id', userId).in('project_id', ids),
    supabase.from('diy_project_saves').select('project_id').eq('user_id', userId).in('project_id', ids),
    supabase.from('diy_project_comments').select('project_id').in('project_id', ids),
  ]);

  if (likedResult.error) console.error('[EcoLoop] Fetching my likes failed:', likedResult.error.message);
  if (savedResult.error) console.error('[EcoLoop] Fetching my saves failed:', savedResult.error.message);
  if (commentsResult.error) console.error('[EcoLoop] Fetching comment counts failed:', commentsResult.error.message);

  const likedIds = new Set<number>((likedResult.data ?? []).map((r: any) => r.project_id));
  const savedIds = new Set<number>((savedResult.data ?? []).map((r: any) => r.project_id));

  const commentCounts = new Map<number, number>();
  for (const r of commentsResult.data ?? []) {
    commentCounts.set(r.project_id, (commentCounts.get(r.project_id) ?? 0) + 1);
  }

  return rows.map((row) => mapProjectRow(row, likedIds, savedIds, commentCounts));
}

/** Comments for a single project, oldest first (chat-style). */
export async function getComments(projectId: number): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('diy_project_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[EcoLoop] Fetching comments failed:', error.message);
    return [];
  }

  return (data ?? []).map(mapCommentRow);
}

/** Task 10.5 — Comment. Posts as the logged-in customer. */
export async function addComment(
  userId: string,
  userName: string,
  projectId: number,
  text: string
): Promise<CommunityComment | null> {
  const { data, error } = await supabase
    .from('diy_project_comments')
    .insert({ project_id: projectId, user_id: userId, user_name: userName, comment_text: text })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[EcoLoop] Adding comment failed:', error?.message);
    return null;
  }

  return mapCommentRow(data);
}

/**
 * Task 10.4 — Like. Toggles the like: inserts if not yet liked, deletes if
 * already liked. The `diy_projects.likes` counter is kept accurate by a
 * database trigger, not by client-side arithmetic.
 */
export async function setLiked(userId: string, projectId: number, liked: boolean): Promise<boolean> {
  if (liked) {
    const { error } = await supabase.from('diy_project_likes').insert({ project_id: projectId, user_id: userId });
    if (error) {
      console.error('[EcoLoop] Liking project failed:', error.message);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from('diy_project_likes')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Unliking project failed:', error.message);
    return false;
  }
  return true;
}

/** Task 10.7 — Save/bookmark. Toggles a private (per-user) bookmark. */
export async function setSaved(userId: string, projectId: number, saved: boolean): Promise<boolean> {
  if (saved) {
    const { error } = await supabase.from('diy_project_saves').insert({ project_id: projectId, user_id: userId });
    if (error) {
      console.error('[EcoLoop] Saving project failed:', error.message);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from('diy_project_saves')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('[EcoLoop] Unsaving project failed:', error.message);
    return false;
  }
  return true;
}

/** Task 10.8 — Report. Files a moderation report against a project. */
export async function reportProject(
  userId: string,
  projectId: number,
  reason: ReportReason,
  details: string
): Promise<boolean> {
  const { error } = await supabase
    .from('diy_project_reports')
    .insert({ project_id: projectId, reporter_id: userId, reason, details: details || null });

  if (error) {
    console.error('[EcoLoop] Reporting project failed:', error.message);
    return false;
  }
  return true;
}
