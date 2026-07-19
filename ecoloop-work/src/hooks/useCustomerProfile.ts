/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  useCustomerProfile — Module 11 (Customer Profile)
 * ============================================================
 *  Loads the logged-in customer's real profile row and saved
 *  addresses, and exposes actions to edit personal info,
 *  upload a profile picture, change password, and manage
 *  saved (doorstep collection) addresses.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as profileService from '../services/profileService';
import type {
  RealProfile,
  ProfileUpdateInput,
  RealSavedAddress,
  NewSavedAddressInput,
} from '../services/profileService';

interface UseCustomerProfileResult {
  loading: boolean;
  profile: RealProfile | null;
  addresses: RealSavedAddress[];
  emailVerified: boolean;
  saving: boolean;
  uploadingPicture: boolean;
  refresh: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  addAddress: (input: NewSavedAddressInput) => Promise<boolean>;
  setDefaultAddress: (addressId: number) => Promise<boolean>;
  deleteAddress: (addressId: number) => Promise<boolean>;
}

export function useCustomerProfile(): UseCustomerProfileResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RealProfile | null>(null);
  const [addresses, setAddresses] = useState<RealSavedAddress[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [profileResult, addressesResult] = await Promise.all([
      profileService.getProfile(userId),
      profileService.getSavedAddresses(userId),
    ]);
    setProfile(profileResult);
    setAddresses(addressesResult);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      setSaving(true);
      try {
        const result = await profileService.updateProfile(userId, input);
        if (result.success) await load();
        return result;
      } finally {
        setSaving(false);
      }
    },
    [userId, load]
  );

  const uploadProfilePicture = useCallback(
    async (file: File) => {
      if (!userId) return { success: false, error: 'Not signed in.' };
      setUploadingPicture(true);
      try {
        const url = await profileService.uploadProfilePicture(userId, file);
        if (!url) return { success: false, error: 'Upload failed. Please try a different image.' };
        await load();
        return { success: true };
      } finally {
        setUploadingPicture(false);
      }
    },
    [userId, load]
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (!userId || !profile) return { success: false, error: 'Not signed in.' };
      return profileService.changePassword(profile.email, oldPassword, newPassword);
    },
    [userId, profile]
  );

  const addAddress = useCallback(
    async (input: NewSavedAddressInput) => {
      if (!userId) return false;
      const ok = await profileService.addSavedAddress(userId, input);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const setDefaultAddress = useCallback(
    async (addressId: number) => {
      if (!userId) return false;
      const ok = await profileService.setDefaultAddress(userId, addressId);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  const deleteAddress = useCallback(
    async (addressId: number) => {
      if (!userId) return false;
      const ok = await profileService.deleteSavedAddress(userId, addressId);
      if (ok) await load();
      return ok;
    },
    [userId, load]
  );

  return {
    loading,
    profile,
    addresses,
    emailVerified: Boolean(session?.user?.email_confirmed_at),
    saving,
    uploadingPicture,
    refresh: load,
    updateProfile,
    uploadProfilePicture,
    changePassword,
    addAddress,
    setDefaultAddress,
    deleteAddress,
  };
}
