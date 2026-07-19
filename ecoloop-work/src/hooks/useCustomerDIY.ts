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
