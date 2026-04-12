import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';

export function PortalLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.requestOtp(identifier.trim());
      navigate('/verify-otp', { state: { identifier: identifier.trim() } });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Client Portal ..testv4</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your email or phone to sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or phone number"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send login code'}
          </button>
        </form>
      </div>
    </div>
  );
}
