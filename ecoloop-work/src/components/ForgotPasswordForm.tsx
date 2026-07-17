/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordForm({ onBackToLogin, initialEmail = '' }: ForgotPasswordFormProps) {
  const { requestPasswordReset, isAuthenticating } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await requestPasswordReset(email);
    if (!result.success) {
      setError(result.error || 'Something went wrong. Please try again.');
      return;
    }
    setSent(true);
  };

  return (
    <div id="forgot-password-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl flex flex-col gap-5">
          {sent ? (
            <div className="text-center flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Check your inbox</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires shortly, so use it soon.
              </p>
              <button
                onClick={onBackToLogin}
                className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl mt-2 hover:bg-slate-800 transition"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              <div className="text-center flex flex-col gap-1">
                <h2 className="text-lg font-display font-bold text-slate-900">Forgot your password?</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your account email and we'll send you a link to reset it.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgot-email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="e.g. name@domain.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md"
                >
                  {isAuthenticating ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}