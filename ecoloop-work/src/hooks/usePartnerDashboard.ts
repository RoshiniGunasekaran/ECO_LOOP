/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  usePartnerDashboard — Module 12 (Partner Dashboard)
 * ============================================================
 *  Loads the logged-in partner's real profile, real available
 *  (unassigned) pickups, real assigned/completed pickups, and
 *  real per-Kg pricing, and exposes online-toggle / accept /
 *  advance-status / complete actions that write to Supabase and
 *  then refresh.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as partnerService from '../services/partnerService';
import type {
  CompletePickupInput,
  PartnerPersonalDetailsInput,
  PartnerPickup,
  PartnerVehicleDetailsInput,
  RealPartnerProfile,
} from '../services/partnerService';
import * as pickupService from '../services/pickupService';
import { uploadProfilePicture } from '../services/profileService';

interface UsePartnerDashboardResult {
  loading: boolean;
  partner: RealPartnerProfile | null;
  availablePickups: PartnerPickup[];
  myPickups: PartnerPickup[];
  pricingRates: Record<string, number>;
  refresh: () => Promise<void>;
  toggleOnline: () => Promise<boolean>;
  acceptPickup: (pickupId: number) => Promise<boolean>;
  advanceStatus: (pickupId: number, nextStatus: 'In-Transit' | 'Arrived') => Promise<boolean>;
  collectPickup: (pickupId: number, proofFiles: File[]) => Promise<boolean>;
  completePickup: (
    pickupId: number,
    input: CompletePickupInput
  ) => Promise<{ success: boolean; finalAmount: number; invoiceId: string } | null>;
  confirmPayment: (pickupId: number) => Promise<boolean>;
  updatePersonalDetails: (input: PartnerPersonalDetailsInput) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePhoto: (file: File) => Promise<string | null>;
  updateVehicleDetails: (input: PartnerVehicleDetailsInput) => Promise<{ success: boolean; error?: string }>;
  uploadDocument: (docType: 'license' | 'aadhaar', file: File) => Promise<string | null>;
}

export function usePartnerDashboard(): UsePartnerDashboardResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<RealPartnerProfile | null>(null);
  const [availablePickups, setAvailablePickups] = useState<PartnerPickup[]>([]);
  const [myPickups, setMyPickups] = useState<PartnerPickup[]>([]);
  const [pricingRates, setPricingRates] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [partnerResult, availableResult, mineResult, ratesResult] = await Promise.all([
      partnerService.getPartnerProfile(userId),
      partnerService.getAvailablePickups(),
      partnerService.getPartnerPickups(userId),
      pickupService.getPricingRates(),
    ]);
    setPartner(partnerResult);
    setAvailablePickups(availableResult);
    setMyPickups(mineResult);
    setPricingRates(ratesResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOnline = useCallback(async () => {
    if (!userId || !partner) return false;
    const nextValue = !partner.isOnline;
    // Optimistic UI update — flip immediately, then reconcile from the DB.
    setPartner({ ...partner, isOnline: nextValue });
    const ok = await partnerService.setOnlineStatus(userId, nextValue);
    if (!ok) {
      setPartner((prev) => (prev ? { ...prev, isOnline: !nextValue } : prev));
    } else {
      await load();
    }
    return ok;
  }, [userId, partner, load]);

  const acceptPickup = useCallback(
    async (pickupId: number) => {
      if (!userId) return false;
      const ok = await partnerService.acceptPickup(userId, pickupId);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const advanceStatus = useCallback(
    async (pickupId: number, nextStatus: 'In-Transit' | 'Arrived') => {
      const ok = await partnerService.advancePickupStatus(pickupId, nextStatus);
      if (ok) await load();
      return ok;
    },
    [load]
  );

  const collectPickup = useCallback(
    async (pickupId: number, proofFiles: File[]) => {
      if (!userId) return false;
      const ok = await partnerService.collectPickup(userId, pickupId, proofFiles);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const completePickup = useCallback(
    async (pickupId: number, input: CompletePickupInput) => {
      if (!userId) return null;
      const pricePerKg = pricingRates[input.verifiedCategory] ?? 0.1;
      const result = await partnerService.completePickup(userId, pickupId, input, pricePerKg);
      if (result) await load();
      return result;
    },
    [userId, pricingRates, load]
  );

  const confirmPayment = useCallback(
    async (pickupId: number) => {
      const ok = await partnerService.confirmPayment(pickupId);
      if (ok) await load();
      return ok;
    },
    [load]
  );

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

  return {
    loading,
    partner,
    availablePickups,
    myPickups,
    pricingRates,
    refresh: load,
    toggleOnline,
    acceptPickup,
    advanceStatus,
    collectPickup,
    completePickup,
    confirmPayment,
    updatePersonalDetails,
    uploadProfilePhoto,
    updateVehicleDetails,
    uploadDocument,
  };
}
