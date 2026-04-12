import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { usePortalAuthStore } from '../../../store/auth.store';

interface LocationState { identifier?: string }

export function PortalOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const identifier = state?.identifier;
  const { setUser } = usePortalAuthStore();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!identifier) navigate('/login', { replace: true });
  }, [identifier, navigate]);

  if (!identifier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyOtp(identifier, otp);
      setUser(data.user);
      navigate('/cases');
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Enter your code</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sent to <span className="font-medium">{identifier}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl font-mono tracking-widest focus:border-black focus:outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm">
          <button onClick={() => navigate('/login')} className="text-gray-500 underline">
            Try a different address
          </button>
        </p>
      </div>
    </div>
  );
}
