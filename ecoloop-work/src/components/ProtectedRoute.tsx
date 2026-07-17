/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  PROTECTED ROUTE — Module 4, Task 4.8
 * ============================================================
 *  Wraps a role's module (CustomerModule, DeliveryPartnerModule,
 *  IndustryModule, AdminModule) and only renders it when:
 *   1. A real Supabase session exists, AND
 *   2. That user's profile role matches (or is 'admin', who can
 *      view any module for support purposes).
 *  Otherwise it renders `fallback` (typically the login form for
 *  that role) instead of the protected content.
 * ============================================================
 */

import React from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { canAccessModule } from '../utils/permissions';

interface ProtectedRouteProps {
  allowedRole: Exclude<UserRole, 'public'>;
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export default function ProtectedRoute({ allowedRole, children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, role, initializing } = useAuth();

  // Avoid flashing the login form for a split second while we check for an existing session.
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessModule(role, allowedRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}