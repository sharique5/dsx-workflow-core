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
