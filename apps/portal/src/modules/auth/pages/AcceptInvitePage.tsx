import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { usePortalAuthStore } from '../../../store/auth.store';
import { useBrand } from '../../../app/brand.context';

function BrandMark() {
  const { firmName } = useBrand();
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{firmName}</p>
    </div>
  );
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = usePortalAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      try {
        const { data } = await authApi.acceptInvite(token);
        setUser(data.user);
        navigate('/cases', { replace: true });
      } catch {
        setError(
          'This invite link is invalid or has already been used. Please contact your lawyer.',
        );
      }
    };

    void run();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
        <BrandMark />
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">Invalid link</h2>
          <p className="text-sm text-slate-500">No invite token was found in this link.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
        <BrandMark />
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Link expired</h2>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Go to login &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <BrandMark />
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-900">Setting up your access</h2>
        <p className="mt-1 text-sm text-slate-500">Just a moment…</p>
      </div>
    </div>
  );
}
