/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCommunity — Module 10 (Community)
 * ============================================================
 *  Loads the real Community feed (Approved DIY projects from
 *  every customer) and exposes like / save / comment / report
 *  actions that write to Supabase and keep local state in sync
 *  (optimistic like/save, refetch-on-success for comments).
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as communityService from '../services/communityService';
import type { CommunityComment, CommunityProject, ReportReason } from '../services/communityService';

interface UseCommunityResult {
  loading: boolean;
  feed: CommunityProject[];
  refresh: () => Promise<void>;

  toggleLike: (projectId: number) => Promise<void>;
  toggleSave: (projectId: number) => Promise<void>;

  commentsByProject: Record<number, CommunityComment[]>;
  commentsLoading: Record<number, boolean>;
  loadComments: (projectId: number) => Promise<void>;
  postingComment: boolean;
  addComment: (projectId: number, text: string) => Promise<boolean>;

  reporting: boolean;
  reportProject: (projectId: number, reason: ReportReason, details: string) => Promise<boolean>;
}

export function useCommunity(): UseCommunityResult {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const userName = profile?.fullName ?? 'EcoLoop Customer';

  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<CommunityProject[]>([]);
  const [commentsByProject, setCommentsByProject] = useState<Record<number, CommunityComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [postingComment, setPostingComment] = useState(false);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await communityService.getCommunityFeed(userId);
    setFeed(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = useCallback(
    async (projectId: number) => {
      if (!userId) return;
      const current = feed.find((p) => p.id === projectId);
      if (!current) return;
      const nextLiked = !current.isLikedByMe;

      // Optimistic update — instant feedback, matches how the old mock UI felt.
      setFeed((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, isLikedByMe: nextLiked, likes: p.likes + (nextLiked ? 1 : -1) }
            : p
        )
      );

      const ok = await communityService.setLiked(userId, projectId, nextLiked);
      if (!ok) {
        // Roll back on failure (e.g. RLS rejected it, network error).
        setFeed((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, isLikedByMe: !nextLiked, likes: p.likes + (nextLiked ? -1 : 1) }
              : p
          )
        );
      }
    },
    [feed, userId]
  );

  const toggleSave = useCallback(
    async (projectId: number) => {
      if (!userId) return;
      const current = feed.find((p) => p.id === projectId);
      if (!current) return;
      const nextSaved = !current.isSavedByMe;

      setFeed((prev) => prev.map((p) => (p.id === projectId ? { ...p, isSavedByMe: nextSaved } : p)));

      const ok = await communityService.setSaved(userId, projectId, nextSaved);
      if (!ok) {
        setFeed((prev) => prev.map((p) => (p.id === projectId ? { ...p, isSavedByMe: !nextSaved } : p)));
      }
    },
    [feed, userId]
  );

  const loadComments = useCallback(async (projectId: number) => {
    setCommentsLoading((prev) => ({ ...prev, [projectId]: true }));
    const comments = await communityService.getComments(projectId);
    setCommentsByProject((prev) => ({ ...prev, [projectId]: comments }));
    setCommentsLoading((prev) => ({ ...prev, [projectId]: false }));
  }, []);

  const addComment = useCallback(
    async (projectId: number, text: string) => {
      if (!userId || !text.trim()) return false;
      setPostingComment(true);
      const created = await communityService.addComment(userId, userName, projectId, text.trim());
      setPostingComment(false);
      if (!created) return false;

      setCommentsByProject((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] ?? []), created],
      }));
      setFeed((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, commentCount: p.commentCount + 1 } : p))
      );
      return true;
    },
    [userId, userName]
  );

  const doReportProject = useCallback(
    async (projectId: number, reason: ReportReason, details: string) => {
      if (!userId) return false;
      setReporting(true);
      const ok = await communityService.reportProject(userId, projectId, reason, details);
      setReporting(false);
      return ok;
    },
    [userId]
  );

  return {
    loading,
    feed,
    refresh: load,
    toggleLike,
    toggleSave,
    commentsByProject,
    commentsLoading,
    loadComments,
    postingComment,
    addComment,
    reporting,
    reportProject: doReportProject,
  };
}
