import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalCases, usePortalNextHearing } from '../hooks/usePortalCases';

function formatStatusKey(key: string) {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatHearingDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let badge = '';
  if (diffDays === 0) badge = 'Today';
  else if (diffDays === 1) badge = 'Tomorrow';
  else if (diffDays <= 7) badge = `In ${diffDays} days`;

  return { dateStr, timeStr, badge };
}

export function PortalCasesPage() {
  const { data: cases, isLoading } = usePortalCases();
  const { data: nextHearing } = usePortalNextHearing();
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

  const hearing = nextHearing ?? null;
  const hearingFmt = hearing ? formatHearingDate(hearing.scheduledAt) : null;

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">

      {/* Next hearing hero */}
      {hearing && hearingFmt && (
        <button
          onClick={() => navigate(`/cases/${hearing.matterId}`)}
          className="w-full text-left mb-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">
                Next Hearing
              </p>
              <p className="text-lg font-bold text-white leading-snug truncate">
                {hearingFmt.dateStr}
              </p>
              <p className="text-sm text-indigo-200 mt-0.5">{hearingFmt.timeStr}</p>
              <p className="mt-2 text-xs text-indigo-300 truncate font-mono">{hearing.matterRef} · {hearing.matterTitle}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              {hearingFmt.badge && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {hearingFmt.badge}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="opacity-60 mt-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </button>
      )}

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Your Cases</h1>
        <p className="text-xs text-slate-400 mt-0.5">{cases.length} {cases.length === 1 ? 'matter' : 'matters'} on file</p>
      </div>

      <ul className="space-y-3">
        {cases.map((c) => {
          const isNextHearingCase = hearing?.matterId === c.id;
          return (
          <li key={c.id}>
            <button
              onClick={() => navigate(`/cases/${c.id}`)}
              className={`group w-full text-left rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-150 ${
                isNextHearingCase
                  ? 'border-indigo-200 hover:border-indigo-300'
                  : 'border-slate-200 hover:border-indigo-200'
              }`}
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

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {isNextHearingCase && hearing && (
                  <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(hearing.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatRelativeDate(c.updatedAt)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
