import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestOtp, useLoginWithPassword } from '../hooks/useAuth';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';

type Method = 'password' | 'email-otp' | 'phone-otp';

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <span className="text-white font-semibold">Nair &amp; Associates</span>
      </div>
      <div>
        <h1 className="text-4xl font-bold text-white leading-tight">
          Manage every case<br />
          <span className="text-indigo-400">with precision.</span>
        </h1>
        <p className="mt-4 text-slate-400 text-base leading-relaxed">
          Purpose-built legal workflow for modern law firms.
        </p>
      </div>
      <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Nair &amp; Associates. All rights reserved.</p>
    </div>
  );
}

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

export function LoginPage() {
  usePageTitle('Sign In');
  const [method, setMethod] = useState<Method>('password');
  const navigate = useNavigate();

  // Password login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);
  const { mutate: loginWithPassword, isPending: pwPending } = useLoginWithPassword();

  // OTP login (email or phone)
  const [identifier, setIdentifier] = useState('');
  const [otpErrorMsg, setOtpErrorMsg] = useState<string | null>(null);
  const { mutate: requestOtp, isPending: otpPending } = useRequestOtp();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setPwErrorMsg(null);
    loginWithPassword(
      { email: email.trim(), password },
      { onError: () => setPwErrorMsg('Invalid email or password. Please try again.') },
    );
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return;
    setOtpErrorMsg(null);
    requestOtp(
      { identifier: id },
      {
        onSuccess: () => navigate('/verify-otp', { state: { identifier: id } }),
        onError: () => setOtpErrorMsg('Could not send login code. Please check your details and try again.'),
      },
    );
  };

  const switchMethod = (m: Method) => {
    setMethod(m);
    setEmail('');
    setPassword('');
    setIdentifier('');
    setPwErrorMsg(null);
    setOtpErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      <BrandPanel />

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Nair &amp; Associates</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
          </div>

          {/* Method tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-6">
            <MethodTab active={method === 'password'} onClick={() => switchMethod('password')}>
              Password
            </MethodTab>
            <MethodTab active={method === 'email-otp'} onClick={() => switchMethod('email-otp')}>
              Email OTP
            </MethodTab>
            <MethodTab active={method === 'phone-otp'} onClick={() => switchMethod('phone-otp')}>
              Phone OTP
            </MethodTab>
          </div>

          {/* ── Password form ── */}
          {method === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPwErrorMsg(null); }}
                  placeholder="you@nairassociates.com"
                  autoComplete="email"
                  required
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwErrorMsg(null); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className={`${INPUT_CLS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {pwErrorMsg && <ErrorBanner message={pwErrorMsg} />}

              <button
                type="submit"
                disabled={pwPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {pwPending ? 'Signing in…' : 'Sign in →'}
              </button>

              <p className="text-center text-xs text-slate-400">
                No password set?{' '}
                <button
                  type="button"
                  onClick={() => switchMethod('email-otp')}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Sign in with email OTP
                </button>
              </p>
            </form>
          )}

          {/* ── Email OTP form ── */}
          {method === 'email-otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label htmlFor="email-otp-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email-otp-id"
                  type="email"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setOtpErrorMsg(null); }}
                  placeholder="you@nairassociates.com"
                  autoComplete="email"
                  required
                  className={INPUT_CLS}
                />
              </div>

              {otpErrorMsg && <ErrorBanner message={otpErrorMsg} />}

              <button
                type="submit"
                disabled={otpPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {otpPending ? 'Sending code…' : 'Send login code →'}
              </button>
            </form>
          )}

          {/* ── Phone OTP form ── */}
          {method === 'phone-otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label htmlFor="phone-otp-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone number
                </label>
                <input
                  id="phone-otp-id"
                  type="tel"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setOtpErrorMsg(null); }}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                  className={INPUT_CLS}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Include country code, e.g. +91 for India
                </p>
              </div>

              {otpErrorMsg && <ErrorBanner message={otpErrorMsg} />}

              <button
                type="submit"
                disabled={otpPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {otpPending ? 'Sending code…' : 'Send login code →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message = 'Something went wrong. Please try again.' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}
