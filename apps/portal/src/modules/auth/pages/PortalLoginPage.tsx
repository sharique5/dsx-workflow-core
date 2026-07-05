import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useBrand } from '../../../app/brand.context';

type Channel = 'email' | 'phone';

export function PortalLoginPage() {
  const { firmName } = useBrand();
  const [channel, setChannel] = useState<Channel>('email');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChannelSwitch = (c: Channel) => {
    setChannel(c);
    setIdentifier('');
    setError('');
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{firmName}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">We'll send a one-time login code</p>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => handleChannelSwitch('email')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              channel === 'email'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => handleChannelSwitch('phone')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              channel === 'phone'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            WhatsApp / SMS
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {channel === 'email' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5" htmlFor="portal-identifier">
                Email address
              </label>
              <input
                id="portal-identifier"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5" htmlFor="portal-phone">
                Phone number
              </label>
              <input
                id="portal-phone"
                type="tel"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1.5 text-xs text-slate-400">Include country code, e.g. +91</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending code…' : 'Send login code'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        Secure access &middot; {firmName}
      </p>
    </div>
  );
}
