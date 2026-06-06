import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMatters } from '../hooks/useMatters';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { CasesTableSkeleton } from '../../../shared/components/Skeleton';
import type { MatterDto } from '@dsx/shared';
import { useStates } from '../hooks/useCourts';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { useAuthStore } from '../../../store/auth.store';
import { useStaff } from '../../staff/hooks/useStaff';

const PAGE_LIMIT = 25;

function StatusBadge({
  statusKey,
  statuses,
}: {
  statusKey: string;
  statuses: { key: string; label: string; isTerminal: boolean }[];
}) {
  const status = statuses.find((s) => s.key === statusKey);
  const label = status?.label ?? statusKey;
  const isTerminal = status?.isTerminal ?? false;
  return (
    <span
      className={inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap +""+${
        isTerminal
          ? 'bg-slate-100 text-slate-500'
          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
      }+""+}
    >
      {!isTerminal && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />}
      {label}
    </span>
  );
}

function MatterRow({
  matter,
  vocab,
  isAdmin,
}: {
  matter: MatterDto;
  vocab: ReturnType<typeof useVocabulary>;
  isAdmin: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-5 py-3.5 text-sm font-mono font-medium text-slate-700">
        <Link to={+""+/cases/+""+} className="hover:text-indigo-600">
          {matter.internalRef}
        </Link>
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">
        <Link to={+""+/cases/+""+} className="hover:text-indigo-600">
          {matter.title}
        </Link>
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-500">
        {matter.participant?.name ?? <span className="text-slate-300">—</span>}
      </td>
      {isAdmin && (
        <td className="px-5 py-3.5 text-sm text-slate-500">
          {matter.assignedTo?.name ?? <span className="text-slate-300">—</span>}
        </td>
      )}
      <td className="px-5 py-3.5 text-sm">
        <StatusBadge statusKey={matter.statusKey} statuses={vocab.statuses} />
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-400">
        {new Date(matter.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="px-5 py-3.5 text-sm text-right">
        <Link
          to={+""+/cases/+""+}
          className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </td>
    </tr>
  );
}

function MatterCard({
  matter,
  vocab,
  isAdmin,
}: {
  matter: MatterDto;
  vocab: ReturnType<typeof useVocabulary>;
  isAdmin: boolean;
}) {
  return (
    <Link
      to={+""+/cases/+""+}
      className="block px-4 py-3.5 hover:bg-slate-50 transition-colors active:bg-slate-100"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{matter.title}</p>
          <p className="mt-0.5 text-xs font-mono text-slate-400">{matter.internalRef}</p>
        </div>
        <StatusBadge statusKey={matter.statusKey} statuses={vocab.statuses} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {matter.participant?.name && (
          <span className="flex items-center gap-1">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {matter.participant.name}
          </span>
        )}
        {isAdmin && matter.assignedTo?.name && (
          <span className="text-slate-400">→ {matter.assignedTo.name}</span>
        )}
        <span className="text-slate-400">
          {new Date(matter.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      </div>
    </Link>
  );
}

export function CasesPage() {
  usePageTitle('Cases');
  const vocab = useVocabulary();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const { data: paged, isLoading, isError } = useMatters(page, PAGE_LIMIT);
  const matters = paged?.data;
  const total = paged?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sort, setSort] = useState<{
    field: 'internalRef' | 'title' | 'participant' | 'createdAt';
    dir: 'asc' | 'desc';
  }>({ field: 'createdAt', dir: 'desc' });

  const { data: states = [], isLoading: statesLoading } = useStates();
  const { data: staffList = [] } = useStaff();

  const filtered = useMemo(() => {
    if (!matters) return [];
    const q = search.trim().toLowerCase();
    const base = matters.filter((m) => {
      const matchesSearch =
        !q ||
        m.internalRef.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.participant?.name ?? '').toLowerCase().includes(q) ||
        (m.externalRef ?? '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || m.statusKey === statusFilter;
      const matchesState = !stateFilter || (m.metadata as Record<string, string>)['state'] === stateFilter;
      const matchesAssigned = !assignedFilter || m.assignedToId === assignedFilter;
      const filedAt = new Date(m.createdAt).getTime();
      const matchesDateFrom = !dateFrom || filedAt >= new Date(dateFrom).getTime();
      const matchesDateTo = !dateTo || filedAt <= new Date(dateTo + 'T23:59:59').getTime();
      return matchesSearch && matchesStatus && matchesState && matchesAssigned && matchesDateFrom && matchesDateTo;
    });
    return [...base].sort((a, b) => {
      let av = '';
      let bv = '';
      if (sort.field === 'internalRef') { av = a.internalRef; bv = b.internalRef; }
      else if (sort.field === 'title') { av = a.title; bv = b.title; }
      else if (sort.field === 'participant') { av = a.participant?.name ?? ''; bv = b.participant?.name ?? ''; }
      else { av = a.createdAt; bv = b.createdAt; }
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [matters, search, statusFilter, stateFilter, assignedFilter, dateFrom, dateTo, sort]);

  const toggleSort = (field: typeof sort.field) => {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    );
  };

  const hasAnyFilter = !!(search || statusFilter || stateFilter || assignedFilter || dateFrom || dateTo);
  const hasAdvancedFilters = !!(assignedFilter || dateFrom || dateTo);

  const clearAll = () => {
    setSearch('');
    setStatusFilter('');
    setStateFilter('');
    setAssignedFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{vocab.matter_plural}</h1>
          {matters && (
            <p className="mt-0.5 text-sm text-slate-500">
              {total} {total === 1 ? vocab.matter_label.toLowerCase() : vocab.matter_plural.toLowerCase()} total
            </p>
          )}
        </div>
        <Link
          to="/cases/new"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New {vocab.matter_label}
        </Link>
      </div>

      {/* Filters */}
      {matters && matters.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={+""+Search …+""+}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All statuses</option>
                {vocab.statuses.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <div className="hidden sm:block w-48">
                <SearchableSelect
                  options={[{ id: '', name: 'All states' }, ...states]}
                  value={stateFilter ? (states.find((s) => s.name === stateFilter)?.id ?? '') : ''}
                  onChange={(_id, name) => setStateFilter(name === 'All states' ? '' : name)}
                  placeholder="All states"
                  disabled={statesLoading}
                  loading={statesLoading}
                />
              </div>
              {/* Advanced toggle — mobile only */}
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={+""+sm:hidden shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors +""+}
                aria-label="Filters"
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
              </button>
              {hasAnyFilter && (
                <button onClick={clearAll} className="shrink-0 text-sm text-slate-400 hover:text-slate-700 px-2" title="Clear filters">✕</button>
              )}
            </div>
          </div>

          {/* Advanced filters */}
          <div className={+""+lex-wrap gap-2 +""+}>
            <div className="sm:hidden w-full">
              <SearchableSelect
                options={[{ id: '', name: 'All states' }, ...states]}
                value={stateFilter ? (states.find((s) => s.name === stateFilter)?.id ?? '') : ''}
                onChange={(_id, name) => setStateFilter(name === 'All states' ? '' : name)}
                placeholder="All states"
                disabled={statesLoading}
                loading={statesLoading}
              />
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Filed from"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white focus:border-indigo-500 focus:outline-none" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Filed to"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white focus:border-indigo-500 focus:outline-none" />
            {isAdmin && staffList.length > 0 && (
              <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white focus:border-indigo-500 focus:outline-none">
                <option value="">All staff</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {isLoading && <CasesTableSkeleton />}
      {isError && <div className="text-center py-12 text-red-500 text-sm">Failed to load cases. Please refresh.</div>}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm text-center py-16">
          <p className="text-sm text-slate-400">
            {hasAnyFilter ? 'No cases match your filters.' : +""+No  yet.+""+}
          </p>
          {!hasAnyFilter && (
            <Link to="/cases/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Create your first {vocab.matter_label.toLowerCase()} →
            </Link>
          )}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {[
                    { field: 'internalRef' as const, label: 'Ref' },
                    { field: 'title' as const, label: 'Title' },
                    { field: 'participant' as const, label: 'Client' },
                  ].map(({ field, label }) => (
                    <th key={field} className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort(field)}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 tracking-wider hover:text-slate-800">
                        {label}
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          className={sort.field === field ? 'text-indigo-500' : 'text-slate-300'}>
                          {sort.field === field && sort.dir === 'asc'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                        </svg>
                      </span>
                    </th>
                  ))}
                  {isAdmin && <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider whitespace-nowrap">Assigned</th>}
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-500 tracking-wider">Status</th>
                  <th className="px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 tracking-wider hover:text-slate-800">
                      Filed
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        className={sort.field === 'createdAt' ? 'text-indigo-500' : 'text-slate-300'}>
                        {sort.field === 'createdAt' && sort.dir === 'asc'
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                      </svg>
                    </span>
                  </th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((matter) => (
                  <MatterRow key={matter.id} matter={matter} vocab={vocab} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile card list */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((matter) => (
            <MatterCard key={matter.id} matter={matter} vocab={vocab} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-xs text-slate-400">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
