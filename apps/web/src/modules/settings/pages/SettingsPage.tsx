import React, { useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { useSetPassword, useClearPassword } from '../../auth/hooks/useAuth';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <p className="text-sm text-green-700">{message}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
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

export function SettingsPage() {
  usePageTitle('Settings');
  const user = useAuthStore((s) => s.user);

  // ── Password form state ────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { mutate: setPassword, isPending: pwPending } = useSetPassword();
  const { mutate: clearPassword, isPending: clearPending } = useClearPassword();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearStatus, setClearStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword.length < 8) {
      setPwStatus({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    setPassword(newPassword, {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        setPwStatus({ type: 'success', msg: 'Password updated successfully.' });
      },
      onError: () => {
        setPwStatus({ type: 'error', msg: 'Failed to update password. Please try again.' });
      },
    });
  };

  const handleClearPassword = () => {
    setClearStatus(null);
    clearPassword(undefined, {
      onSuccess: () => {
        setShowClearConfirm(false);
        setClearStatus({ type: 'success', msg: 'Password removed. You can now only sign in via OTP.' });
      },
      onError: () => {
        setShowClearConfirm(false);
        setClearStatus({ type: 'error', msg: 'Failed to remove password. Please try again.' });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account preferences</p>
      </div>

      {/* ── Profile card ── */}
      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        </div>
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <span className="text-base font-semibold text-indigo-600">
              {user?.name
                ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                : '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email ?? user?.phone ?? '—'}
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                {user?.role}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Password section ── */}
      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Password</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Set or change your password for email + password login. You can always sign in via OTP regardless of this setting.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
          {/* New password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwStatus(null); }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className={`${INPUT_CLS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus(null); }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`${INPUT_CLS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          {pwStatus && (
            pwStatus.type === 'success'
              ? <SuccessBanner message={pwStatus.msg} />
              : <ErrorBanner message={pwStatus.msg} />
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={pwPending || !newPassword || !confirmPassword}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {pwPending ? 'Saving…' : 'Save password'}
            </button>
          </div>
        </form>

        {/* Remove password */}
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Remove password</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Disable password login and revert to OTP-only access.
              </p>
            </div>
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => { setShowClearConfirm(true); setClearStatus(null); }}
                className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Remove
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleClearPassword}
                  disabled={clearPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {clearPending ? 'Removing…' : 'Yes, remove'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {clearStatus && (
            <div className="mt-3">
              {clearStatus.type === 'success'
                ? <SuccessBanner message={clearStatus.msg} />
                : <ErrorBanner message={clearStatus.msg} />}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
