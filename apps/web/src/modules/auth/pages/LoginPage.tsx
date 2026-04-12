import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp } from '../hooks/useAuth';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const navigate = useNavigate();
  const { mutate: requestOtp, isPending, error } = useRequestOtp();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    requestOtp(
      { identifier: identifier.trim() },
      {
        onSuccess: () => {
          // Pass identifier to OTP page via state (never via URL)
          navigate('/verify-otp', { state: { identifier: identifier.trim() } });
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">DSX Workflow</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
              Email or Phone ..testv5
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@firm.com"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            {isPending ? 'Sending code…' : 'Send login code'}
          </button>
        </form>
      </div>
    </div>
  );
}
