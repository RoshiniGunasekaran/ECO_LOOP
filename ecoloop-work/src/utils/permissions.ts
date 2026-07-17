/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  ROLE PERMISSIONS — Module 4, Task 4.10
 * ============================================================
 *  A single, explicit map of "what each role is allowed to do".
 *  This is the frontend's mirror of the Supabase Row Level
 *  Security policies in module3_database_schema.sql — RLS is
 *  the real security boundary, this file just lets the UI hide
 *  buttons/routes a role shouldn't see, without waiting on a
 *  failed request to find out.
 * ============================================================
 */

import { UserRole } from '../types';

export type Permission =
  | 'view_customer_dashboard'
  | 'manage_own_pickups'
  | 'view_partner_dashboard'
  | 'manage_assigned_pickups'
  | 'view_industry_dashboard'
  | 'manage_incoming_waste'
  | 'view_admin_dashboard'
  | 'manage_users'
  | 'manage_pricing'
  | 'approve_diy_projects'
  | 'view_reports';

const ROLE_PERMISSIONS: Record<Exclude<UserRole, 'public'>, Permission[]> = {
  customer: ['view_customer_dashboard', 'manage_own_pickups'],
  partner: ['view_partner_dashboard', 'manage_assigned_pickups'],
  industry: ['view_industry_dashboard', 'manage_incoming_waste'],
  admin: [
    'view_admin_dashboard',
    'manage_users',
    'manage_pricing',
    'approve_diy_projects',
    'view_reports',
    // Admins can also see every other dashboard for support/debugging purposes.
    'view_customer_dashboard',
    'view_partner_dashboard',
    'view_industry_dashboard',
  ],
};

/** Which module/route each role is allowed to land on. Mirrors App.tsx's routing. */
export const ROLE_HOME_ROUTE: Record<Exclude<UserRole, 'public'>, UserRole> = {
  customer: 'customer',
  partner: 'partner',
  industry: 'industry',
  admin: 'admin',
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role || role === 'public') return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: UserRole | null | undefined): Permission[] {
  if (!role || role === 'public') return [];
  return ROLE_PERMISSIONS[role];
}

/** Guards against a signed-in role trying to view another role's console/module. */
export function canAccessModule(currentRole: UserRole | null | undefined, targetModule: Exclude<UserRole, 'public'>): boolean {
  if (!currentRole || currentRole === 'public') return false;
  if (currentRole === 'admin') return true; // admins can view every module
  return currentRole === targetModule;
}