import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalCases } from '../hooks/usePortalCases';

function formatStatusKey(key: string) {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PortalCasesPage() {
  const { data: cases, isLoading } = usePortalCases();
  const navigate = useNavigate();

  // Auto-redirect if client has only one case
  useEffect(() => {
    if (cases && cases.length === 1) {
      navigate(`/cases/${cases[0].id}`, { replace: true });
    }
  }, [cases, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
          <p className="text-xs text-slate-400">Loading your cases…</p>
        </div>
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">No cases found</p>
        <p className="text-xs text-slate-400 mt-1">Contact your lawyer if you believe this is an error.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Your Cases</h1>
        <p className="text-xs text-slate-400 mt-0.5">{cases.length} {cases.length === 1 ? 'matter' : 'matters'} on file</p>
      </div>

      <ul className="space-y-3">
        {cases.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => navigate(`/cases/${c.id}`)}
              className="group w-full text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug truncate">{c.title}</p>
                  <p className="mt-1 text-xs text-slate-400 font-mono">{c.internalRef}</p>
                </div>
                <span
                  className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    c.statusKey === 'closed'
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}
                >
                  {formatStatusKey(c.statusKey)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
