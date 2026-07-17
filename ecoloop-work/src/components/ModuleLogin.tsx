import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  Users, Truck, Factory, Shield, Lock, Mail, Eye, EyeOff, Sparkles, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordForm from './ForgotPasswordForm';
import VerifyEmailNotice from './VerifyEmailNotice';

interface ModuleLoginProps {
  role: 'customer' | 'partner' | 'industry' | 'admin';
  onLoginSuccess: () => void;
  onGoBack: () => void;
}

export default function ModuleLogin({ role, onLoginSuccess, onGoBack }: ModuleLoginProps) {
  const { signIn, isAuthenticating } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password' | 'verify-email'>('login');

  // Configure role-specific aesthetics
  const roleConfig = {
    customer: {
      title: 'Customer Portal',
      subtitle: 'Schedule doorstop pickups, manage wallet rewards, and view ledger bills.',
      icon: <Users className="w-6 h-6 text-emerald-600" />,
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      borderColor: 'border-emerald-100',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 focus:ring-emerald-500',
      accentColor: 'text-emerald-600',
      demoEmail: 'alex.rivera@gmail.com',
    },
    partner: {
      title: 'Delivery Partner Portal',
      subtitle: 'Accept regional pickup requests, verify waste weights, and update invoices.',
      icon: <Truck className="w-6 h-6 text-indigo-600" />,
      bgGradient: 'from-indigo-500/10 to-blue-500/5',
      borderColor: 'border-indigo-100',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 focus:ring-indigo-500',
      accentColor: 'text-indigo-600',
      demoEmail: 'daniel.cruz@ecoloop-partner.com',
    },
    industry: {
      title: 'Industrial Partner Portal',
      subtitle: 'View sorted scrap inventories, track bulk shipments, and process commercial orders.',
      icon: <Factory className="w-6 h-6 text-amber-600" />,
      bgGradient: 'from-amber-500/10 to-orange-500/5',
      borderColor: 'border-amber-100',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      btnColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100 focus:ring-amber-500',
      accentColor: 'text-amber-600',
      demoEmail: 'contact@evergreenpaper.com',
    },
    admin: {
      title: 'Administrator Console',
      subtitle: 'Manage system pricing matrices, approve DIY logs, and audit analytical metrics.',
      icon: <Shield className="w-6 h-6 text-rose-600" />,
      bgGradient: 'from-rose-500/10 to-pink-500/5',
      borderColor: 'border-rose-100',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      btnColor: 'bg-slate-900 hover:bg-slate-800 shadow-slate-200 focus:ring-slate-900',
      accentColor: 'text-rose-600',
      demoEmail: 'admin@ecoloop.com',
    }
  }[role];

  const handleAutofill = () => {
    setEmail(roleConfig.demoEmail);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    // Task 4.2 — real Supabase email/password login.
    const result = await signIn(email, password);

    if (!result.success) {
      if (result.error?.toLowerCase().includes('verify')) {
        setView('verify-email');
        return;
      }
      setError(result.error || 'Login failed. Please try again.');
      return;
    }

    // AuthContext's session listener now knows who's logged in and what role
    // they have; App.tsx routes to the right module automatically.
    onLoginSuccess();
  };

  if (view === 'forgot-password') {
    return <ForgotPasswordForm initialEmail={email} onBackToLogin={() => setView('login')} />;
  }

  if (view === 'verify-email') {
    return <VerifyEmailNotice email={email} onBackToLogin={() => setView('login')} />;
  }

  return (
    <div
      id={`module-login-container-${role}`}
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onGoBack}
          id="login-back-to-public-btn"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Public Website
        </button>

        <div className={`bg-gradient-to-br ${roleConfig.bgGradient} border ${roleConfig.borderColor} p-6 rounded-3xl flex items-center gap-4 mb-6 shadow-xs`}>
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100/80">
            {roleConfig.icon}
          </div>
          <div>
            <span className={`inline-block text-[8px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1.5 ${roleConfig.badgeColor}`}>
              🔒 Authentication Required
            </span>
            <h2 className="text-lg font-display font-bold text-slate-900 leading-tight">
              {roleConfig.title}
            </h2>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl flex flex-col gap-5">
          <div className="text-center flex flex-col gap-1 mb-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              {roleConfig.subtitle}
            </p>
          </div>

          {error && (
            <div id="login-error-alert" className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="e.g. name@domain.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span />
              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-slate-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              id="submit-auth-btn"
              disabled={isAuthenticating}
              className={`w-full text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-60 ${roleConfig.btnColor}`}
            >
              {isAuthenticating ? 'Verifying...' : 'Verify & Enter Console'}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[9px] font-mono text-slate-400 uppercase font-bold">Prototype Helper</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            type="button"
            id="autofill-credentials-btn"
            onClick={handleAutofill}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" /> Autofill Demo Email
          </button>
          <p className="text-[9px] text-center text-slate-400 -mt-3">
            Autofill only fills the email — you still need the real password for that account since login now checks a live Supabase database.
          </p>
        </div>
      </div>
    </div>
  );
}