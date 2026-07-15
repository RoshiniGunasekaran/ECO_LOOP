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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // If we switch to 'public', we log them out. If we switch to another role and were already authenticated, keep it, otherwise they will need to authenticate first.
    if (role === 'public') {
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentRole('public');
    setIsAuthenticated(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
      {/* Dynamic Module Router */}
      {currentRole === 'public' && (
        <PublicModule onLoginSuccess={handleLoginSuccess} />
      )}

      {currentRole === 'customer' && (
        isAuthenticated ? (
          <CustomerModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="customer" 
            onLoginSuccess={() => setIsAuthenticated(true)} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'partner' && (
        isAuthenticated ? (
          <DeliveryPartnerModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="partner" 
            onLoginSuccess={() => setIsAuthenticated(true)} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'industry' && (
        isAuthenticated ? (
          <IndustryModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="industry" 
            onLoginSuccess={() => setIsAuthenticated(true)} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {currentRole === 'admin' && (
        isAuthenticated ? (
          <AdminModule onLogout={handleLogout} />
        ) : (
          <ModuleLogin 
            role="admin" 
            onLoginSuccess={() => setIsAuthenticated(true)} 
            onGoBack={() => setCurrentRole('public')} 
          />
        )
      )}

      {/* Persistent Prototype Switcher (Bottom-Right Floating Anchor) */}
      <RoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
    </div>
  );
}

