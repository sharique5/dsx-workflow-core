import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMatters } from '../hooks/useMatters';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import type { MatterDto } from '@dsx/shared';

function StatusBadge({ statusKey, statuses }: { statusKey: string; statuses: { key: string; label: string; isTerminal: boolean }[] }) {
  const status = statuses.find((s) => s.key === statusKey);
  const label = status?.label ?? statusKey;
  const isTerminal = status?.isTerminal ?? false;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isTerminal
          ? 'bg-gray-100 text-gray-600'
          : 'bg-blue-50 text-blue-700'
      }`}
    >
      {label}
    </span>
  );
}

function MatterRow({ matter, vocab }: { matter: MatterDto; vocab: ReturnType<typeof useVocabulary> }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        <Link to={`/cases/${matter.id}`} className="hover:text-blue-600">
          {matter.internalRef}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <Link to={`/cases/${matter.id}`} className="hover:text-blue-600">
          {matter.title}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {matter.participant?.name ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        <StatusBadge statusKey={matter.statusKey} statuses={vocab.statuses} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {new Date(matter.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

export function CasesPage() {
  const vocab = useVocabulary();
  const { data: matters, isLoading, isError } = useMatters();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    if (!matters) return [];
    const q = search.trim().toLowerCase();
    return matters.filter((m) => {
      const matchesSearch =
        !q ||
        m.internalRef.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.participant?.name ?? '').toLowerCase().includes(q) ||
        (m.externalRef ?? '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || m.statusKey === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [matters, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="font-semibold text-lg">{vocab.matter_plural}</h1>
        </div>
        <Link
          to="/cases/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          New {vocab.matter_label}
        </Link>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto">
        {/* Search + filter bar */}
        {matters && matters.length > 0 && (
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ref, title, or ${vocab.participant_label.toLowerCase()}…`}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">All statuses</option>
              {vocab.statuses.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            {(search || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Loading {vocab.matter_plural.toLowerCase()}…
          </div>
        )}

        {isError && (
          <div className="text-center py-12 text-red-500 text-sm">
            Failed to load {vocab.matter_plural.toLowerCase()}. Please refresh.
          </div>
        )}

        {matters && matters.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No {vocab.matter_plural.toLowerCase()} yet.</p>
            <Link
              to="/cases/new"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create your first {vocab.matter_label.toLowerCase()}
            </Link>
          </div>
        )}

        {matters && matters.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No {vocab.matter_plural.toLowerCase()} match your search.
          </div>
        )}

        {filtered.length > 0 && (
          <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">{vocab.participant_label}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((matter) => (
                  <MatterRow key={matter.id} matter={matter} vocab={vocab} />
                ))}
              </tbody>
            </table>
            {filtered.length < (matters?.length ?? 0) && (
              <div className="border-t px-4 py-2 text-xs text-gray-400">
                Showing {filtered.length} of {matters?.length} {vocab.matter_plural.toLowerCase()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
