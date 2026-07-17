/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ResetPasswordFormProps {
  onComplete: () => void;
}

export default function ResetPasswordForm({ onComplete }: ResetPasswordFormProps) {
  const { updatePassword, isAuthenticating } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = await updatePassword(password);
    if (!result.success) {
      setError(result.error || 'Something went wrong. Please try again.');
      return;
    }
    setDone(true);
  };

  return (
    <div id="reset-password-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl flex flex-col gap-5">
          {done ? (
            <div className="text-center flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Password updated</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Your password has been changed successfully. You're now signed in with your new password.
              </p>
              <button
                onClick={onComplete}
                className="text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl mt-2 hover:bg-slate-800 transition"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <div className="text-center flex flex-col gap-1">
                <h2 className="text-lg font-display font-bold text-slate-900">Set a new password</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose a new password for your EcoLoop account.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-new-password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md"
                >
                  {isAuthenticating ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}