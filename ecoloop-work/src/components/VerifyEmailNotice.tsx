/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface VerifyEmailNoticeProps {
  email: string;
  onBackToLogin: () => void;
}

export default function VerifyEmailNotice({ email, onBackToLogin }: VerifyEmailNoticeProps) {
  const { resendVerificationEmail } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResend = async () => {
    setStatus('sending');
    const result = await resendVerificationEmail(email);
    setStatus(result.success ? 'sent' : 'error');
  };

  return (
    <div id="verify-email-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-display font-bold text-slate-900">Verify your email</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            We've sent a verification link to <strong>{email}</strong>. Click the link in that email to activate your account, then come back and log in.
          </p>

          {status === 'sent' && (
            <p className="text-xs font-semibold text-emerald-600">✅ Verification email resent.</p>
          )}
          {status === 'error' && (
            <p className="text-xs font-semibold text-rose-600">Couldn't resend right now. Please try again shortly.</p>
          )}

          <button
            onClick={handleResend}
            disabled={status === 'sending'}
            className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 px-4 transition mt-2 disabled:opacity-60"
          >
            {status === 'sending' ? 'Resending...' : 'Resend Verification Email'}
          </button>
        </div>
      </div>
    </div>
  );
}