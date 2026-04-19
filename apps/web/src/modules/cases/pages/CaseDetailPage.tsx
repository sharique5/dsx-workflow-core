import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMatter, useCloseMatter, useDeleteMatter } from '../hooks/useMatters';
import { useScheduledEvents, useCreateScheduledEvent, useDeleteScheduledEvent } from '../hooks/useScheduledEvents';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useDocumentRequests, useCreateDocumentRequest, useMarkDocumentRequestReceived } from '../hooks/useDocumentRequests';
import { useFees, useCreateFee, useLogPayment } from '../hooks/useFees';
import { useDocuments, useUploadDocument, useDocumentDownloadUrl, useDeleteDocument } from '../hooks/useDocuments';
import { useInviteClient } from '../../clients/hooks/useClients';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { useAuthStore } from '../../../store/auth.store';
import type { ScheduledEventDto, NoteDto, AuditLogDto, FeeType } from '@dsx/shared';

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
  const { mutate: inviteClient, isPending: isInviting } = useInviteClient();

  // Hearings
  const { data: events } = useScheduledEvents(id!);
  const { mutate: createEvent, isPending: isCreatingEvent } = useCreateScheduledEvent(id!);
  const { mutate: deleteEvent } = useDeleteScheduledEvent(id!);
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [hearingDate, setHearingDate] = useState('');

  // Notes
  const { data: notes } = useNotes(id!);
  const { mutate: createNote, isPending: isCreatingNote } = useCreateNote(id!);
  const { mutate: updateNote } = useUpdateNote(id!);
  const { mutate: deleteNote } = useDeleteNote(id!);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePublished, setNewNotePublished] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  // Audit trail
  const { data: auditLogs } = useAuditLogs(id!);

  // Document requests
  const { data: documentRequests = [] } = useDocumentRequests(id!);
  const { mutate: createDocumentRequest, isPending: isCreatingDR } = useCreateDocumentRequest(id!);
  const { mutate: markReceived } = useMarkDocumentRequestReceived(id!);
  const [showAddDR, setShowAddDR] = useState(false);
  const [drDescription, setDrDescription] = useState('');
  const [drDueDate, setDrDueDate] = useState('');

  // Fees
  const { data: fees = [] } = useFees(id!);
  const { mutate: createFee, isPending: isCreatingFee } = useCreateFee(id!);
  const { mutate: logPayment, isPending: isLoggingPayment } = useLogPayment(id!);
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeType, setFeeType] = useState<FeeType>('one-time');
  const [feeTotalAmount, setFeeTotalAmount] = useState('');
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Documents
  const { data: documents = [] } = useDocuments(id!);
  const { mutate: uploadDocument, isPending: isUploading } = useUploadDocument(id!);
  const { mutate: downloadDocument, isPending: isDownloading } = useDocumentDownloadUrl(id!);
  const { mutate: deleteDocument } = useDeleteDocument(id!);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

            {/* Portal invite — admin only */}
            {isAdmin && matter.participant && (
              <div>
                <dt className="font-medium text-gray-500">Portal Access</dt>
                <dd className="mt-1 flex items-center gap-2">
                  {matter.participant.portalInviteStatus === 'active' ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  ) : matter.participant.portalInviteStatus === 'invited' ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        Invited
                      </span>
                      <button
                        onClick={() => inviteClient(matter.participant!.id)}
                        disabled={isInviting}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      >
                        {isInviting ? 'Resending…' : 'Resend invite'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Not invited
                      </span>
                      {matter.participant.email && (
                        <button
                          onClick={() => inviteClient(matter.participant!.id)}
                          disabled={isInviting}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isInviting ? 'Sending…' : `Invite ${vocab.participant_label}`}
                        </button>
                      )}
                      {!matter.participant.email && (
                        <span className="text-xs text-gray-400">(add email to invite)</span>
                      )}
                    </>
                  )}
                </dd>
              </div>
            )}

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

        {/* Hearings */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">{vocab.scheduled_event_label}s</h3>
            {!isClosed && (
              <button
                onClick={() => setShowAddHearing((v) => !v)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAddHearing ? 'Cancel' : `+ Add ${vocab.scheduled_event_label}`}
              </button>
            )}
          </div>

          {showAddHearing && (
            <form
              className="mt-4 flex gap-3 items-end border-t pt-4"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                if (!hearingDate) return;
                createEvent(
                  { scheduledAt: hearingDate },
                  { onSuccess: () => { setShowAddHearing(false); setHearingDate(''); } },
                );
              }}
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingEvent}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingEvent ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {(!events || events.length === 0) && !showAddHearing && (
            <p className="mt-3 text-sm text-gray-400">No {vocab.scheduled_event_label.toLowerCase()}s yet.</p>
          )}

          {events && events.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {events.map((event: ScheduledEventDto) => (
                <li key={event.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(event.scheduledAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.outcomeNotes && (
                      <p className="mt-0.5 text-sm text-gray-500">{event.outcomeNotes}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">Added by {event.creator?.name}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this hearing?')) deleteEvent(event.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Documents</h3>
            {!isClosed && user?.role !== 'client' && (
              <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
                {isUploading ? 'Uploading…' : '+ Upload'}
                <input
                  type="file"
                  className="sr-only"
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError(null);
                    uploadDocument(file, {
                      onError: (err: unknown) => {
                        const msg = err instanceof Error ? err.message : 'Upload failed';
                        setUploadError(msg);
                      },
                    });
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {uploadError && (
            <p className="mt-2 text-xs text-red-500">{uploadError}</p>
          )}

          {documents.length === 0 && !isUploading && (
            <p className="mt-3 text-sm text-gray-400">No documents uploaded yet.</p>
          )}

          {documents.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {documents.map((doc) => (
                <li key={doc.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {doc.mimeType} · {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => downloadDocument(doc.id)}
                      disabled={isDownloading}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      Download
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${doc.fileName}"?`)) deleteDocument(doc.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Notes</h3>
            <button
              onClick={() => setShowAddNote((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAddNote ? 'Cancel' : '+ Add Note'}
            </button>
          </div>

          {showAddNote && (
            <form
              className="mt-4 border-t pt-4 space-y-3"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                if (!newNoteContent.trim()) return;
                createNote(
                  { content: newNoteContent.trim(), isPublished: newNotePublished },
                  {
                    onSuccess: () => {
                      setNewNoteContent('');
                      setNewNotePublished(false);
                      setShowAddNote(false);
                    },
                  },
                );
              }}
            >
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                placeholder="Write a note…"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newNotePublished}
                    onChange={(e) => setNewNotePublished(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Visible to client
                </label>
                <button
                  type="submit"
                  disabled={isCreatingNote}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </form>
          )}

          {(!notes || notes.length === 0) && !showAddNote && (
            <p className="mt-3 text-sm text-gray-400">No notes yet.</p>
          )}

          {notes && notes.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {notes.map((note: NoteDto) => (
                <li key={note.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {note.creator?.name} · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            note.isPublished
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {note.isPublished ? 'Visible to client' : 'Internal'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() =>
                          updateNote({ id: note.id, data: { isPublished: !note.isPublished } })
                        }
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title={note.isPublished ? 'Make internal' : 'Publish to client'}
                      >
                        {note.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      {(note.createdBy === user?.id || isAdmin) && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this note?')) deleteNote(note.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Document Requests */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Document Requests</h3>
            {!isClosed && (
              <button
                onClick={() => setShowAddDR((v) => !v)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAddDR ? 'Cancel' : '+ Request document'}
              </button>
            )}
          </div>

          {showAddDR && (
            <div className="mt-4 rounded-md bg-gray-50 border p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  value={drDescription}
                  onChange={(e) => setDrDescription(e.target.value)}
                  placeholder="e.g. Proof of address"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Due date (optional)</label>
                <input
                  type="date"
                  value={drDueDate}
                  onChange={(e) => setDrDueDate(e.target.value)}
                  className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
                />
              </div>
              <button
                disabled={isCreatingDR || !drDescription.trim()}
                onClick={() => {
                  createDocumentRequest(
                    { matterId: id!, description: drDescription.trim(), dueDate: drDueDate || undefined },
                    {
                      onSuccess: () => {
                        setDrDescription('');
                        setDrDueDate('');
                        setShowAddDR(false);
                      },
                    },
                  );
                }}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isCreatingDR ? 'Saving…' : 'Save request'}
              </button>
            </div>
          )}

          {documentRequests.length === 0 && !showAddDR && (
            <p className="mt-3 text-sm text-gray-400">No document requests yet.</p>
          )}

          {documentRequests.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {documentRequests.map((dr) => (
                <li key={dr.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{dr.description}</p>
                    {dr.dueDate && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Due: {new Date(dr.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        dr.status === 'received'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {dr.status === 'received' ? 'Received' : 'Pending'}
                    </span>
                    {dr.status === 'pending' && !isClosed && (
                      <button
                        onClick={() => markReceived(dr.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Mark received
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fees */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Fees</h3>
            {isAdmin && !isClosed && (
              <button
                onClick={() => setShowAddFee((v) => !v)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAddFee ? 'Cancel' : '+ Add Fee'}
              </button>
            )}
          </div>

          {showAddFee && (
            <form
              className="mt-4 border-t pt-4 flex flex-wrap gap-3 items-end"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                const amount = parseFloat(feeTotalAmount);
                if (!amount || amount <= 0) return;
                createFee(
                  { type: feeType, totalAmount: amount },
                  {
                    onSuccess: () => {
                      setFeeTotalAmount('');
                      setFeeType('one-time');
                      setShowAddFee(false);
                    },
                  },
                );
              }}
            >
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as FeeType)}
                  className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
                >
                  <option value="one-time">One-time</option>
                  <option value="periodic">Periodic</option>
                  <option value="per-hearing">Per hearing</option>
                  <option value="per-consultation">Per consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeTotalAmount}
                  onChange={(e) => setFeeTotalAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="block w-36 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingFee}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingFee ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {fees.length === 0 && !showAddFee && (
            <p className="mt-3 text-sm text-gray-400">No fees recorded yet.</p>
          )}

          {fees.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100">
              {fees.map((fee) => (
                <li key={fee.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {fee.type.replace(/-/g, ' ')}
                      </p>
                      <div className="mt-1 flex gap-4 text-xs text-gray-500">
                        <span>Total: ₹{fee.totalAmount.toLocaleString('en-IN')}</span>
                        <span>Paid: ₹{fee.paidAmount.toLocaleString('en-IN')}</span>
                        <span className={fee.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          Due: ₹{fee.dueAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {fee.paymentHistory.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {fee.paymentHistory.map((p, i) => (
                            <li key={i} className="text-xs text-gray-400">
                              ₹{p.amount.toLocaleString('en-IN')} on {new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {p.note ? ` — ${p.note}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {payingFeeId === fee.id && (
                        <div className="mt-3 flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="block w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                            <input
                              type="text"
                              value={paymentNote}
                              onChange={(e) => setPaymentNote(e.target.value)}
                              placeholder="e.g. Cheque #123"
                              className="block w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
                            />
                          </div>
                          <button
                            disabled={isLoggingPayment || !paymentAmount}
                            onClick={() => {
                              const amt = parseFloat(paymentAmount);
                              if (!amt || amt <= 0) return;
                              logPayment(
                                { feeId: fee.id, data: { amount: amt, note: paymentNote || undefined } },
                                {
                                  onSuccess: () => {
                                    setPayingFeeId(null);
                                    setPaymentAmount('');
                                    setPaymentNote('');
                                  },
                                },
                              );
                            }}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoggingPayment ? 'Saving…' : 'Log payment'}
                          </button>
                          <button
                            onClick={() => { setPayingFeeId(null); setPaymentAmount(''); setPaymentNote(''); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {isAdmin && fee.dueAmount > 0 && !isClosed && payingFeeId !== fee.id && (
                      <button
                        onClick={() => { setPayingFeeId(fee.id); setPaymentAmount(''); setPaymentNote(''); }}
                        className="shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Log payment
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Audit Trail */}
        {isAdmin && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="font-medium text-gray-900">Activity</h3>

            {(!auditLogs || auditLogs.length === 0) && (
              <p className="mt-3 text-sm text-gray-400">No activity recorded yet.</p>
            )}

            {auditLogs && auditLogs.length > 0 && (
              <ol className="mt-4 relative border-l border-gray-200 ml-3 space-y-4">
                {auditLogs.map((log: AuditLogDto) => (
                  <li key={log.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300" />
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{log.actor?.name ?? 'Unknown'}</span>
                      {' '}
                      <span className="text-gray-500">{log.action}</span>
                      {' '}
                      <span className="text-gray-500">{log.entityType.replace('_', ' ')}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

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
