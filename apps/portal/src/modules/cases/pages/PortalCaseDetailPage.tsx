import type React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  usePortalCase,
  usePortalCaseEvents,
  usePortalCaseNotes,
  usePortalCaseDocumentRequests,
  usePortalCaseFees,
  usePortalCaseDocuments,
  usePortalDocumentDownloadUrl,
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

/* Reusable section card wrapper */
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-400 py-1">{message}</p>;
}

export function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: matter, isLoading } = usePortalCase(id!);
  const { data: events = [] } = usePortalCaseEvents(id!);
  const { data: notes = [] } = usePortalCaseNotes(id!);
  const { data: documentRequests = [] } = usePortalCaseDocumentRequests(id!);
  const { data: fees = [] } = usePortalCaseFees(id!);
  const { data: documents = [] } = usePortalCaseDocuments(id!);
  const { mutate: downloadDocument, isPending: isDownloading } = usePortalDocumentDownloadUrl(id!);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
        <p className="text-xs text-slate-400">Loading case details…</p>
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Case not found</p>
          <Link to="/cases" className="mt-2 inline-block text-xs text-indigo-600 hover:text-indigo-700">← Back to cases</Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const nextHearing = sortedEvents.find((e) => new Date(e.scheduledAt) > now) ?? null;
  const isClosed = matter.statusKey === 'closed';

  return (
    <div className="px-4 py-8 max-w-lg mx-auto space-y-4">
      {/* Back link */}
      <Link
        to="/cases"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        All cases
      </Link>

      {/* Case header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-bold text-slate-900 leading-snug">{matter.title}</h1>
          <span
            className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              isClosed
                ? 'bg-slate-100 text-slate-500 border-slate-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
            }`}
          >
            {formatStatusKey(matter.statusKey)}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-slate-400 mb-0.5">Reference</dt>
            <dd className="font-mono font-medium text-slate-700">{matter.internalRef}</dd>
          </div>
          {matter.externalRef && (
            <div>
              <dt className="text-slate-400 mb-0.5">Court ref</dt>
              <dd className="font-medium text-slate-700">{matter.externalRef}</dd>
            </div>
          )}
        </dl>

        {/* Next hearing highlight */}
        {nextHearing ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Next hearing</p>
              <p className="mt-0.5 text-sm font-bold text-indigo-900">{formatDateTime(nextHearing.scheduledAt)}</p>
              {nextHearing.outcomeNotes && (
                <p className="mt-0.5 text-xs text-indigo-500">{nextHearing.outcomeNotes}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
            <p className="text-xs text-slate-400">No upcoming hearings scheduled.</p>
          </div>
        )}
      </div>

      {/* Hearing history */}
      <SectionCard
        title="Hearing History"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      >
        {events.length === 0 ? (
          <EmptyState message="No hearings recorded yet." />
        ) : (
          <ul className="divide-y divide-slate-100 -my-1">
            {[...sortedEvents].reverse().map((e) => {
              const isPast = new Date(e.scheduledAt) <= now;
              return (
                <li key={e.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{formatDateTime(e.scheduledAt)}</p>
                    {e.outcomeNotes && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{e.outcomeNotes}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold border ${
                      isPast
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}
                  >
                    {isPast ? 'Done' : 'Upcoming'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Notes from lawyer */}
      <SectionCard
        title="Notes from your lawyer"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        {notes.length === 0 ? (
          <EmptyState message="No notes shared yet." />
        ) : (
          <ul className="divide-y divide-slate-100 -my-1">
            {notes.map((n) => (
              <li key={n.id} className="py-3">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                <p className="mt-1.5 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Document requests */}
      <SectionCard
        title="Document Requests"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        }
      >
        {documentRequests.length === 0 ? (
          <EmptyState message="No document requests." />
        ) : (
          <ul className="divide-y divide-slate-100 -my-1">
            {documentRequests.map((dr) => (
              <li key={dr.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{dr.description}</p>
                  {dr.dueDate && (
                    <p className="mt-0.5 text-xs text-slate-400">Due: {formatDate(dr.dueDate)}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    dr.status === 'received'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {dr.status === 'received' ? 'Received' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Documents */}
      <SectionCard
        title="Documents"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
      >
        {documents.length === 0 ? (
          <EmptyState message="No documents on file." />
        ) : (
          <ul className="divide-y divide-slate-100 -my-1">
            {documents.map((doc) => (
              <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{doc.fileName}</p>
                    <p className="text-xs text-slate-400">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => downloadDocument(doc.id)}
                  disabled={isDownloading}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Fees */}
      <SectionCard
        title="Fees"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        {fees.length === 0 ? (
          <EmptyState message="No fees on file." />
        ) : (
          <ul className="divide-y divide-slate-100 -my-1">
            {fees.map((fee) => (
              <li key={fee.id} className="py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {fee.type.replace(/-/g, ' ')}
                  </p>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Total: <span className="font-medium text-slate-700">₹{fee.totalAmount.toLocaleString('en-IN')}</span></p>
                      <p>Paid: <span className="font-medium text-emerald-600">₹{fee.paidAmount.toLocaleString('en-IN')}</span></p>
                    </div>
                    {fee.dueAmount > 0 ? (
                      <div className="mt-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1 text-right">
                        <p className="text-xs font-bold text-red-600">Due: ₹{fee.dueAmount.toLocaleString('en-IN')}</p>
                      </div>
                    ) : (
                      <div className="mt-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-right">
                        <p className="text-xs font-semibold text-emerald-600">Cleared</p>
                      </div>
                    )}
                  </div>
                </div>
                {fee.paymentHistory.length > 0 && (
                  <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1">
                    <p className="text-xs font-medium text-slate-500 mb-1">Payment history</p>
                    {fee.paymentHistory.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(p.paidAt)}{p.note ? ` · ${p.note}` : ''}</span>
                        <span className="font-medium text-slate-700">₹{p.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
