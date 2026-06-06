import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { useDashboardStats } from '../../cases/hooks/useMatters';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';

function StatTile({
  value,
  label,
  sublabel,
  accent,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${accent}`}>
      <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const user = useAuthStore((s) => s.user);
  const vocab = useVocabulary();
  const { data: stats, isLoading } = useDashboardStats();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const [hearingDays, setHearingDays] = useState<7 | 15 | 30>(7);
  const [now] = useState(() => Date.now());
  const cutoff = now + hearingDays * 24 * 60 * 60 * 1000;
  const visibleHearings = (stats?.upcomingHearings ?? []).filter(
    (h) => new Date(h.scheduledAt).getTime() <= cutoff,
  );

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Here's what's happening today.</p>
        </div>
        <Link
          to="/cases/new"
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New {vocab.matter_label}
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            <Link to="/cases" className="block hover:opacity-90 transition-opacity">
              <StatTile
                value={stats?.totalMatters ?? 0}
                label={`Total ${vocab.matter_plural}`}
                accent="border-slate-200"
              />
            </Link>
            <Link to="/cases" className="block hover:opacity-90 transition-opacity">
              <StatTile
                value={stats?.openMatters ?? 0}
                label="Active cases"
                accent="border-indigo-100"
              />
            </Link>
            <StatTile
              value={stats?.closedMatters ?? 0}
              label="Closed"
              accent="border-slate-200"
            />
          </>
        )}
      </div>

      {/* Upcoming hearings */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Upcoming Hearings</h2>
          <div className="flex gap-1">
            {([7, 15, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setHearingDays(d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  hearingDays === d
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 w-40 bg-slate-100 rounded mb-1.5" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && (!visibleHearings || visibleHearings.length === 0) && (
            <p className="text-sm text-slate-400 py-2">No hearings in the next {hearingDays} days.</p>
          )}
          {!isLoading && visibleHearings && visibleHearings.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {visibleHearings.map((h) => {
                const d = new Date(h.scheduledAt);
                const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
                const timeLabel = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <li key={h.id} className="py-3 flex items-center gap-3">
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center text-center leading-none ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="text-xs font-bold">{d.getDate()}</span>
                      <span className="text-[9px] uppercase">{d.toLocaleString('en-IN', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/cases/${h.matterId}`}
                        className="text-sm font-medium text-slate-900 hover:text-indigo-600 truncate block"
                      >
                        {h.matterTitle}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">{h.matterRef}</span>
                        {' · '}
                        {isToday ? <span className="text-indigo-600 font-medium">Today</span> : dayLabel}
                        {' · '}
                        {timeLabel}
                      </p>
                    </div>
                    <Link
                      to={`/cases/${h.matterId}`}
                      className="shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/cases"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
        >
          <Briefcase size={15} />
          All {vocab.matter_plural.toLowerCase()}
        </Link>
        {user?.role === 'admin' && (
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
          >
            <Users size={15} />
            Clients
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link
            to="/staff"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
          >
            <UserPlus size={15} />
            Team
          </Link>
        )}
      </div>
    </div>
  );
}

