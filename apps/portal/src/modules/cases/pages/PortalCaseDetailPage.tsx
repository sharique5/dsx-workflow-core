import { Link, useParams } from 'react-router-dom';
import {
  usePortalCase,
  usePortalCaseEvents,
  usePortalCaseNotes,
  usePortalCaseDocumentRequests,
  usePortalCaseFees,
} from '../hooks/usePortalCases';

function formatStatusKey(key: string) {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: matter, isLoading } = usePortalCase(id!);
  const { data: events = [] } = usePortalCaseEvents(id!);
  const { data: notes = [] } = usePortalCaseNotes(id!);
  const { data: documentRequests = [] } = usePortalCaseDocumentRequests(id!);
  const { data: fees = [] } = usePortalCaseFees(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-500">Case not found.</p>
      </div>
    );
  }

  const now = new Date();
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const nextHearing = sortedEvents.find((e) => new Date(e.scheduledAt) > now) ?? null;

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
      {/* Back link */}
      <Link to="/cases" className="text-sm text-blue-600 hover:text-blue-700 inline-block">
        ← All cases
      </Link>

      {/* Case header */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-semibold text-gray-900">{matter.title}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              matter.statusKey === 'closed'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {formatStatusKey(matter.statusKey)}
          </span>
        </div>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Reference</dt>
            <dd className="text-gray-900 font-medium">{matter.internalRef}</dd>
          </div>
          {matter.externalRef && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Court ref</dt>
              <dd className="text-gray-900">{matter.externalRef}</dd>
            </div>
          )}
        </dl>

        {/* Next hearing highlight */}
        {nextHearing ? (
          <div className="mt-4 rounded-md bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
              Next hearing
            </p>
            <p className="mt-1 text-sm font-semibold text-blue-900">
              {formatDateTime(nextHearing.scheduledAt)}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-md bg-gray-50 p-3">
            <p className="text-sm text-gray-400">No upcoming hearings scheduled.</p>
          </div>
        )}
      </div>

      {/* Hearing history */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900 text-sm mb-3">Hearing History</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No hearings recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {[...sortedEvents].reverse().map((e) => (
              <li key={e.id} className="py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">{formatDateTime(e.scheduledAt)}</p>
                  {e.outcomeNotes && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {e.outcomeNotes}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    new Date(e.scheduledAt) > now
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {new Date(e.scheduledAt) > now ? 'Upcoming' : 'Done'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Published notes */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900 text-sm mb-3">Notes from your lawyer</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes shared yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notes.map((n) => (
              <li key={n.id} className="py-3">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{n.content}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Document requests — read-only */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900 text-sm mb-3">Document Requests</h2>
        {documentRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No document requests.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documentRequests.map((dr) => (
              <li key={dr.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">{dr.description}</p>
                  {dr.dueDate && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Due: {formatDate(dr.dueDate)}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    dr.status === 'received'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  {dr.status === 'received' ? 'Received' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fees — read-only with full payment history (decision #38) */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900 text-sm mb-3">Fees</h2>
        {fees.length === 0 ? (
          <p className="text-sm text-gray-400">No fees on file.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {fees.map((fee) => (
              <li key={fee.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {fee.type.replace(/-/g, ' ')}
                  </p>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Total: ₹{fee.totalAmount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500">Paid: ₹{fee.paidAmount.toLocaleString('en-IN')}</p>
                    <p className={`text-xs font-medium ${fee.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Due: ₹{fee.dueAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                {fee.paymentHistory.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {fee.paymentHistory.map((p, i) => (
                      <li key={i} className="text-xs text-gray-400">
                        ₹{p.amount.toLocaleString('en-IN')} — {formatDate(p.paidAt)}
                        {p.note ? ` · ${p.note}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
