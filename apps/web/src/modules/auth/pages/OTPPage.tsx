import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVerifyOtp } from '../hooks/useAuth';

interface LocationState {
  identifier?: string;
}

export function OTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const identifier = state?.identifier;

  const [otp, setOtp] = useState('');
  const { mutate: verifyOtp, isPending, error } = useVerifyOtp();

  useEffect(() => {
    if (!identifier) navigate('/login', { replace: true });
  }, [identifier, navigate]);

  if (!identifier) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    verifyOtp({ identifier, otp });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-slate-700">{identifier}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1.5">
              Login code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={handleOtpChange}
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-3 text-center text-2xl font-mono tracking-[0.5em] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm text-red-600">Invalid or expired code. Please try again.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isPending ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            &larr; Use a different address
          </button>
        </p>
      </div>
    </div>
  );
}


interface LocationState {
  identifier?: string;
}

export function OTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const identifier = state?.identifier;

  const [otp, setOtp] = useState('');
  const { mutate: verifyOtp, isPending, error } = useVerifyOtp();

  // Redirect back if no identifier in state (direct URL access)
  useEffect(() => {
    if (!identifier) navigate('/login', { replace: true });
  }, [identifier, navigate]);

  if (!identifier) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    verifyOtp({ identifier, otp });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Check your inbox</h1>
          <p className="mt-1 text-sm text-gray-500">
            We sent a 6-digit code to <span className="font-medium">{identifier}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Login code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={handleOtpChange}
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg font-mono tracking-widest shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              Invalid or expired code. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            {isPending ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="underline hover:text-gray-700"
          >
            Use a different address
          </button>
        </p>
      </div>
    </div>
  );
}
