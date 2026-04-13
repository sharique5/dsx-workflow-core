import { Link, useParams } from 'react-router-dom';
import { useMatter, useCloseMatter, useDeleteMatter } from '../hooks/useMatters';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { useAuthStore } from '../../../store/auth.store';

function StatusBadge({ statusKey, statuses }: { statusKey: string; statuses: { key: string; label: string; isTerminal: boolean }[] }) {
  const status = statuses.find((s) => s.key === statusKey);
  const label = status?.label ?? statusKey;
  const isTerminal = status?.isTerminal ?? false;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isTerminal ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
      }`}
    >
      {label}
    </span>
  );
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vocab = useVocabulary();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const { data: matter, isLoading, isError } = useMatter(id!);
  const { mutate: closeMatter, isPending: isClosing } = useCloseMatter();
  const { mutate: deleteMatter, isPending: isDeleting } = useDeleteMatter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (isError || !matter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-red-500">{vocab.matter_label} not found.</p>
      </div>
    );
  }

  const isClosed = matter.statusKey === 'closed';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/cases" className="text-sm text-gray-400 hover:text-gray-600">
            {vocab.matter_plural}
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="font-semibold text-lg">{matter.internalRef}</h1>
          <StatusBadge statusKey={matter.statusKey} statuses={vocab.statuses} />
        </div>

        {isAdmin && !isClosed && (
          <button
            onClick={() => closeMatter(matter.id)}
            disabled={isClosing}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isClosing ? 'Closing…' : `Close ${vocab.matter_label}`}
          </button>
        )}
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        {/* Core details */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{matter.title}</h2>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Internal Ref</dt>
              <dd className="mt-1 text-gray-900">{matter.internalRef}</dd>
            </div>

            {matter.externalRef && (
              <div>
                <dt className="font-medium text-gray-500">External Ref</dt>
                <dd className="mt-1 text-gray-900">{matter.externalRef}</dd>
              </div>
            )}

            <div>
              <dt className="font-medium text-gray-500">{vocab.participant_label}</dt>
              <dd className="mt-1 text-gray-900">{matter.participant?.name ?? '—'}</dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">Created by</dt>
              <dd className="mt-1 text-gray-900">{matter.creator?.name ?? '—'}</dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-gray-900">
                {new Date(matter.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">Last updated</dt>
              <dd className="mt-1 text-gray-900">
                {new Date(matter.updatedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>

          {/* Metadata fields (court, judge, etc.) */}
          {Object.keys(vocab.metadata_fields).length > 0 && (
            <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {Object.entries(vocab.metadata_fields).map(([key, label]) => (
                <div key={key}>
                  <dt className="font-medium text-gray-500">{label}</dt>
                  <dd className="mt-1 text-gray-900">
                    {(matter.metadata as Record<string, string>)[key] ?? '—'}
                  </dd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder sections for Phase 2+ */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-medium text-gray-900">
            {vocab.scheduled_event_label}s
          </h3>
          <p className="mt-2 text-sm text-gray-400">Coming soon — Phase 3.</p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-medium text-gray-900">Documents</h3>
          <p className="mt-2 text-sm text-gray-400">Coming soon — Phase 3.</p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-medium text-gray-900">Notes</h3>
          <p className="mt-2 text-sm text-gray-400">Coming soon — Phase 3.</p>
        </div>

        {/* Danger zone */}
        {isAdmin && (
          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h3 className="font-medium text-red-700">Danger zone</h3>
            <p className="mt-1 text-sm text-gray-500">
              Deleting a {vocab.matter_label.toLowerCase()} is irreversible.
            </p>
            <button
              onClick={() => {
                if (confirm(`Delete "${matter.title}"? This cannot be undone.`)) {
                  deleteMatter(matter.id);
                }
              }}
              disabled={isDeleting}
              className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting…' : `Delete ${vocab.matter_label}`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
