/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { UserRole } from './types';
import RoleSwitcher from './components/RoleSwitcher';
import PublicModule from './components/PublicModule';
import CustomerModule from './components/CustomerModule';
import DeliveryPartnerModule from './components/DeliveryPartnerModule';
import IndustryModule from './components/IndustryModule';
import AdminModule from './components/AdminModule';
import ModuleLogin from './components/ModuleLogin';
import ProtectedRoute from './components/ProtectedRoute';
import ResetPasswordForm from './components/ResetPasswordForm';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated, role, isPasswordRecovery, clearPasswordRecovery, signOut } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('public');

  // Module 4 / Task 4.9 (Role Management): once a real login succeeds, the
  // AuthContext session listener resolves `role` from the profiles table —
  // this just moves the visible module to match it.
  useEffect(() => {
    if (isAuthenticated && role !== 'public') {
      setCurrentRole(role);
    }
  }, [isAuthenticated, role]);

  const handleRoleChange = (nextRole: UserRole) => {
    setCurrentRole(nextRole);
  };

  // Login forms call signIn() themselves via useAuth(); this is just a UI hook —
  // the effect above does the actual navigation once the session updates.
  const handleLoginSuccess = () => {};

  const handleLogout = async () => {
    await signOut();
    setCurrentRole('public');
  };

  // Task 4.5 — a password-recovery link was opened; show the reset form above everything else.
  if (isPasswordRecovery) {
    return <ResetPasswordForm onComplete={clearPasswordRecovery} />;
  }

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
      {/* Dynamic Module Router */}
      {currentRole === 'public' && (
        <PublicModule onLoginSuccess={handleLoginSuccess} />
      )}

      {currentRole === 'customer' && (
        <ProtectedRoute
          allowedRole="customer"
          fallback={
            <ModuleLogin
              role="customer"
              onLoginSuccess={handleLoginSuccess}
              onGoBack={() => setCurrentRole('public')}
            />
          }
        >
          <CustomerModule onLogout={handleLogout} />
        </ProtectedRoute>
      )}

      {currentRole === 'partner' && (
        <ProtectedRoute
          allowedRole="partner"
          fallback={
            <ModuleLogin
              role="partner"
              onLoginSuccess={handleLoginSuccess}
              onGoBack={() => setCurrentRole('public')}
            />
          }
        >
          <DeliveryPartnerModule onLogout={handleLogout} />
        </ProtectedRoute>
      )}

      {currentRole === 'industry' && (
        <ProtectedRoute
          allowedRole="industry"
          fallback={
            <ModuleLogin
              role="industry"
              onLoginSuccess={handleLoginSuccess}
              onGoBack={() => setCurrentRole('public')}
            />
          }
        >
          <IndustryModule onLogout={handleLogout} />
        </ProtectedRoute>
      )}

      {currentRole === 'admin' && (
        <ProtectedRoute
          allowedRole="admin"
          fallback={
            <ModuleLogin
              role="admin"
              onLoginSuccess={handleLoginSuccess}
              onGoBack={() => setCurrentRole('public')}
            />
          }
        >
          <AdminModule onLogout={handleLogout} />
        </ProtectedRoute>
      )}

      {/* Persistent Prototype Switcher (Bottom-Right Floating Anchor) */}
      <RoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
    </div>
  );
}