/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useIndustryDashboard — Modules 16, 17 & 18
 * ============================================================
 *  Loads the logged-in industry's real profile + real inventory
 *  (Module 16), exposes real accept/reject/processing actions for
 *  incoming waste (Module 17), and real profile-edit actions
 *  (Module 18). One hook, same reasoning as `usePartnerDashboard`
 *  combining Modules 12–15 for the Partner role.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as industryService from '../services/industryService';
import type {
  IndustryCompanyInfoInput,
  IndustryContactInput,
  IndustryDelivery,
  IndustryProcessingStatus,
  IndustryReportStats,
  InventoryItem,
  RealIndustryProfile,
} from '../services/industryService';

interface UseIndustryDashboardResult {
  loading: boolean;
  profile: RealIndustryProfile | null;
  inventory: InventoryItem[];
  reportStats: IndustryReportStats | null;
  availableDeliveries: IndustryDelivery[];
  myDeliveries: IndustryDelivery[];
  refresh: () => Promise<void>;
  acceptDelivery: (pickupId: number) => Promise<{ success: boolean; error?: string }>;
  advanceProcessingStatus: (pickupId: number, currentStatus: IndustryProcessingStatus) => Promise<boolean>;
  updateCompanyInformation: (input: IndustryCompanyInfoInput) => Promise<{ success: boolean; error?: string }>;
  updateContactDetails: (input: IndustryContactInput) => Promise<{ success: boolean; error?: string }>;
  uploadDocument: (docType: 'gst' | 'registration', file: File) => Promise<string | null>;
  updateEmailNotificationSetting: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
}

export function useIndustryDashboard(): UseIndustryDashboardResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RealIndustryProfile | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<IndustryDelivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<IndustryDelivery[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const profileResult = await industryService.getIndustryProfile(userId);
    const [inventoryResult, availableResult, mineResult] = profileResult
      ? await Promise.all([
          industryService.getInventory(userId),
          industryService.getAvailableDeliveries(),
          industryService.getIndustryDeliveries(userId),
        ])
      : [[], [], []];
    setProfile(profileResult);
    setInventory(inventoryResult);
    setAvailableDeliveries(availableResult);
    setMyDeliveries(mineResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const reportStats = profile ? industryService.computeReportStats(profile, inventory) : null;

  const acceptDelivery = useCallback(
    async (pickupId: number) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      const result = await industryService.acceptDelivery(userId, pickupId);
      await load();
      return result;
    },
    [userId, load]
  );

  const advanceProcessingStatus = useCallback(
    async (pickupId: number, currentStatus: IndustryProcessingStatus) => {
      const result = await industryService.advanceProcessingStatus(pickupId, currentStatus);
      if (result.success) await load();
      return result.success;
    },
    [load]
  );

  const updateCompanyInformation = useCallback(
    async (input: IndustryCompanyInfoInput) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      const result = await industryService.updateCompanyInformation(userId, input);
      if (result.success) await load();
      return result;
    },
    [userId, load]
  );

  const updateContactDetails = useCallback(
    async (input: IndustryContactInput) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      const result = await industryService.updateContactDetails(userId, input);
      if (result.success) await load();
      return result;
    },
    [userId, load]
  );

  const uploadDocument = useCallback(
    async (docType: 'gst' | 'registration', file: File) => {
      if (!userId) return null;
      const url = await industryService.uploadIndustryDocument(userId, docType, file);
      if (url) await load();
      return url;
    },
    [userId, load]
  );

  const updateEmailNotificationSetting = useCallback(
    async (enabled: boolean) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      const result = await industryService.updateEmailNotificationSetting(userId, enabled);
      if (result.success) await load();
      return result;
    },
    [userId, load]
  );

  return {
    loading,
    profile,
    inventory,
    reportStats,
    availableDeliveries,
    myDeliveries,
    refresh: load,
    acceptDelivery,
    advanceProcessingStatus,
    updateCompanyInformation,
    updateContactDetails,
    uploadDocument,
    updateEmailNotificationSetting,
  };
}
