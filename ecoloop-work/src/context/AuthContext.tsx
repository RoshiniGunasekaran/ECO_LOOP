/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  AUTH CONTEXT — Module 4, Task 4.7 (Session Management)
 *                 + Task 4.9 (Role Management)
 * ============================================================
 *  This replaces the old fake `useState<UserRole>` session
 *  tracking in App.tsx with a REAL Supabase session:
 *   - On first load, asks Supabase "is anyone logged in?"
 *   - Subscribes to auth changes (login, logout, token refresh,
 *     password-recovery link opened) for the lifetime of the app.
 *   - Once a session exists, loads that user's `profiles` row,
 *     which is where their `role` (customer/partner/industry/
 *     admin) actually lives.
 *
 *  Anything in the app that needs "who is logged in / what can
 *  they do" should call `useAuth()` — never read from
 *  `supabase.auth` directly outside of authService.ts.
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole, SignUpPayload, AuthResult } from '../types';
import * as authService from '../services/authService';

interface AuthContextProps {
  /** True until the very first session check finishes (prevents a login-page flash on refresh). */
  initializing: boolean;
  /** True while a signIn/signUp/signOut request is in flight. */
  isAuthenticating: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Convenience: 'public' when logged out, otherwise the role from `profiles.role`. */
  role: UserRole;
  /** True only once BOTH a Supabase session and a matching profile row exist. */
  isAuthenticated: boolean;
  /** Set when a password-recovery link was opened, so the app can show the reset-password screen. */
  isPasswordRecovery: boolean;

  signUp: (payload: SignUpPayload) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await authService.fetchProfile(userId);
    setProfile(p);
  }, []);

  useEffect(() => {
    // Detect a password-recovery link (Supabase appends #type=recovery to the redirect URL).
    if (window.location.hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }

    // 1. Check for an existing session on load (keeps you logged in across refreshes).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    // 2. Subscribe to every future auth change for the life of the app.
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    setIsAuthenticating(true);
    try {
      return await authService.signUp(payload);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      return await authService.signIn(email, password);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      const result = await authService.signOut();
      setSession(null);
      setProfile(null);
      return result;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return authService.requestPasswordReset(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const result = await authService.updatePassword(newPassword);
    if (result.success) {
      setIsPasswordRecovery(false);
      // Clear the #type=recovery hash from the URL now that it's handled.
      window.history.replaceState(null, '', window.location.pathname);
    }
    return result;
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    return authService.resendVerificationEmail(email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const role: UserRole = profile?.role ?? 'public';
  const isAuthenticated = Boolean(session && profile);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        isAuthenticating,
        session,
        profile,
        role,
        isAuthenticated,
        isPasswordRecovery,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
        resendVerificationEmail,
        refreshProfile,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextProps {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside an <AuthProvider>');
  }
  return ctx;
}