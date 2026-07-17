/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerPickups — Module 6 (Pickup Management)
 * ============================================================
 *  Loads the logged-in customer's real pickups + real pricing
 *  rates, and exposes create / edit / cancel / feedback actions
 *  that write to Supabase and then refresh the list.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as pickupService from '../services/pickupService';
import type { EditablePickupInput, NewPickupInput, RealPickup } from '../services/pickupService';

interface UseCustomerPickupsResult {
  loading: boolean;
  pickups: RealPickup[];
  pricingRates: Record<string, number>;
  refresh: () => Promise<void>;
  createPickup: (input: NewPickupInput, imageFiles: File[]) => Promise<number | null>;
  updatePickup: (pickupId: number, updates: EditablePickupInput) => Promise<boolean>;
  cancelPickup: (pickupId: number) => Promise<boolean>;
  submitFeedback: (pickupId: number, rating: number, comment: string) => Promise<boolean>;
  addImages: (pickupId: number, files: File[]) => Promise<string[]>;
}

export function useCustomerPickups(): UseCustomerPickupsResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<RealPickup[]>([]);
  const [pricingRates, setPricingRates] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [pickupsResult, ratesResult] = await Promise.all([
      pickupService.getPickups(userId),
      pickupService.getPricingRates(),
    ]);
    setPickups(pickupsResult);
    setPricingRates(ratesResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createPickup = useCallback(
    async (input: NewPickupInput, imageFiles: File[]) => {
      if (!userId) return null;
      const id = await pickupService.createPickup(userId, input, imageFiles);
      if (id !== null) await load();
      return id;
    },
    [userId, load]
  );

  const updatePickup = useCallback(
    async (pickupId: number, updates: EditablePickupInput) => {
      const ok = await pickupService.updatePickup(pickupId, updates);
      if (ok) await load();
      return ok;
    },
    [load]
  );

  const cancelPickup = useCallback(
    async (pickupId: number) => {
      const ok = await pickupService.cancelPickup(pickupId);
      if (ok) await load();
      return ok;
    },
    [load]
  );

  const submitFeedback = useCallback(
    async (pickupId: number, rating: number, comment: string) => {
      const ok = await pickupService.submitPickupFeedback(pickupId, rating, comment);
      if (ok) await load();
      return ok;
    },
    [load]
  );

  const addImages = useCallback(
    async (pickupId: number, files: File[]) => {
      if (!userId) return [];
      const urls = await pickupService.addImagesToPickup(userId, pickupId, files);
      if (urls.length) await load();
      return urls;
    },
    [userId, load]
  );

  return {
    loading,
    pickups,
    pricingRates,
    refresh: load,
    createPickup,
    updatePickup,
    cancelPickup,
    submitFeedback,
    addImages,
  };
}