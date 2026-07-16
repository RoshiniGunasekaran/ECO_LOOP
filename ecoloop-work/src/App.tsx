/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole } from './types';
import RoleSwitcher from './components/RoleSwitcher';
import PublicModule from './components/PublicModule';
import CustomerModule from './components/CustomerModule';
import DeliveryPartnerModule from './components/DeliveryPartnerModule';
import IndustryModule from './components/IndustryModule';
import AdminModule from './components/AdminModule';
import ModuleLogin from './components/ModuleLogin';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('public');
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // Any change in role resets the active session to guarantee secure role separation
    setAuthenticatedRole(null);
  };

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setAuthenticatedRole(role);
  };

  const handleLogout = () => {
    setCurrentRole('public');
    setAuthenticatedRole(null);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
      {/* Dynamic Module Router */}
      {currentRole === 'public' && (
        <PublicModule onLoginSuccess={handleLoginSuccess} />
      )}

      {currentRole === 'customer' && (
        authenticatedRole === 'customer' ? (
          <CustomerModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="customer" 
            onLoginSuccess={() => handleLoginSuccess('customer')} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'partner' && (
        authenticatedRole === 'partner' ? (
          <DeliveryPartnerModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="partner" 
            onLoginSuccess={() => handleLoginSuccess('partner')} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'industry' && (
        authenticatedRole === 'industry' ? (
          <IndustryModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="industry" 
            onLoginSuccess={() => handleLoginSuccess('industry')} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'admin' && (
        authenticatedRole === 'admin' ? (
          <AdminModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="admin" 
            onLoginSuccess={() => handleLoginSuccess('admin')} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {/* Persistent Prototype Switcher (Bottom-Right Floating Anchor) */}
      <RoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
    </div>
  );
}

