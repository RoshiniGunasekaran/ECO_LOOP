/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { UserRole } from './types';
import { useDatabase } from './context/DatabaseContext';
import RoleSwitcher from './components/RoleSwitcher';
import PublicModule from './components/PublicModule';
import CustomerModule from './components/CustomerModule';
import DeliveryPartnerModule from './components/DeliveryPartnerModule';
import IndustryModule from './components/IndustryModule';
import AdminModule from './components/AdminModule';

export default function App() {
  const { activeUserId, setActiveUserId, activeUserRole, setActiveUserRole } = useDatabase();
  const navigate = useNavigate();

  const handleRoleChange = (role: UserRole) => {
    setActiveUserRole(role);
    // When switcher changes the role, also change mock user accordingly to match defaults
    if (role === 'public') {
      setActiveUserId(null);
      navigate('/');
    } else if (role === 'customer') {
      setActiveUserId('CUST-001');
      navigate('/customer/dashboard');
    } else if (role === 'partner') {
      setActiveUserId('PART-001');
      navigate('/partner/dashboard');
    } else if (role === 'industry') {
      setActiveUserId('IND-001');
      navigate('/industry/dashboard');
    } else if (role === 'admin') {
      setActiveUserId('ADMIN-001');
      navigate('/admin/dashboard');
    }
  };

  const handleLoginSuccess = (role: UserRole, userId?: string) => {
    setActiveUserRole(role);
    if (userId) {
      setActiveUserId(userId);
    } else {
      // Fallback defaults
      if (role === 'admin') setActiveUserId('ADMIN-001');
      else if (role === 'partner') setActiveUserId('PART-001');
      else if (role === 'industry') setActiveUserId('IND-001');
      else setActiveUserId('CUST-001');
    }

    // Navigate to dashboard
    navigate(`/${role}/dashboard`);
  };

  const handleLogout = () => {
    setActiveUserRole('public');
    setActiveUserId(null);
    navigate('/');
  };

  // Check if current mode is production to hide the dev role switcher
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="home" />} />
        <Route path="/about" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="about" />} />
        <Route path="/faq" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="faq" />} />
        <Route path="/contact" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="contact" />} />
        <Route path="/services" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="services" />} />
        <Route path="/pricing" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="pricing" />} />
        <Route path="/rewards" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="rewards" />} />
        <Route path="/privacy" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="privacy" />} />
        <Route path="/terms" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="terms" />} />
        <Route path="/careers" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="careers" />} />
        <Route path="/login" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="login" />} />
        <Route path="/register" element={<PublicModule onLoginSuccess={handleLoginSuccess} initialTab="register" />} />

        {/* Dashboard Routes */}
        <Route 
          path="/customer/*" 
          element={
            activeUserRole === 'customer' ? (
              <CustomerModule onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/partner/*" 
          element={
            activeUserRole === 'partner' ? (
              <DeliveryPartnerModule onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/industry/*" 
          element={
            activeUserRole === 'industry' ? (
              <IndustryModule onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            activeUserRole === 'admin' ? (
              <AdminModule onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Persistent Prototype Switcher (Hidden in production) */}
      {!isProduction && (
        <RoleSwitcher currentRole={activeUserRole} onRoleChange={handleRoleChange} />
      )}
    </div>
  );
}

