import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
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
import {
  useNotificationTemplates,
  useSendNotification,
  useNotificationLogs,
  useReminders,
  useCreateReminder,
  useDeleteReminder,
} from '../hooks/useNotifications';
import type { ScheduledEventDto, NoteDto, AuditLogDto, FeeType, NotificationLogDto } from '@dsx/shared';

function StatusBadge({ statusKey, statuses }: { statusKey: string; statuses: { key: string; label: string; isTerminal: boolean }[] }) {
  const status = statuses.find((s) => s.key === statusKey);
  const label = status?.label ?? statusKey;
  const isTerminal = status?.isTerminal ?? false;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isTerminal ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
      }`}
    >
      {!isTerminal && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />}
      {label}
    </span>
  );
}

// ─── Notifications sub-component ─────────────────────────────────────────────

function NotificationsCard({
  isClosed, participant, notifTemplates, notifTemplateId, setNotifTemplateId,
  notifCustomMessage, setNotifCustomMessage, notifChannel, showSendForm, setShowSendForm,
  isSending, sendError, notifLogs, onSend, matterId,
}: {
  isClosed: boolean;
  participant: { id: string; name: string; email?: string | null } | null | undefined;
  notifTemplates: import('@dsx/shared').NotificationTemplateDto[];
  notifTemplateId: string;
  setNotifTemplateId: (v: string) => void;
  notifCustomMessage: string;
  setNotifCustomMessage: (v: string) => void;
  notifChannel: 'email' | 'whatsapp';
  showSendForm: boolean;
  setShowSendForm: React.Dispatch<React.SetStateAction<boolean>>;
  isSending: boolean;
  sendError: Error | null;
  notifLogs: import('@dsx/shared').NotificationLogDto[];
  onSend: (payload: { matterId: string; recipientId: string; channel: 'email' | 'whatsapp'; templateId?: string; customMessage?: string }) => void;
  matterId: string;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notifTemplateId && !notifCustomMessage.trim()) return;
    onSend({
      matterId,
      recipientId: participant!.id,
      channel: notifChannel,
      templateId: notifTemplateId || undefined,
      customMessage: notifTemplateId ? undefined : notifCustomMessage.trim(),
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
        {!isClosed && participant && (
          <button
            onClick={() => setShowSendForm((v) => !v)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showSendForm ? 'Cancel' : '+ Send notification'}
          </button>
        )}
      </div>

      <div className="px-6 py-4">
        {!participant && (
          <p className="text-sm text-slate-400 py-2">No client linked to this case.</p>
        )}

        {participant && showSendForm && (
          <form className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3" onSubmit={handleSubmit}>
            <p className="text-xs text-slate-500">
              Sending to: <span className="font-medium text-slate-700">{participant.name}</span>
              {participant.email && <span className="ml-1 text-slate-400">({participant.email})</span>}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Template (optional)</label>
              <select
                value={notifTemplateId}
                onChange={(e) => { setNotifTemplateId(e.target.value); setNotifCustomMessage(''); }}
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">— Custom message —</option>
                {notifTemplates.filter((t) => t.channel === 'email').map((t) => {
                  const label = t.triggerType.split('_').join(' ');
                  const suffix = t.isSystem ? 'system' : 'custom';
                  return <option key={t.id} value={t.id}>{label} ({suffix})</option>;
                })}
              </select>
            </div>

            {!notifTemplateId && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Message *</label>
                <textarea
                  value={notifCustomMessage}
                  onChange={(e) => setNotifCustomMessage(e.target.value)}
                  rows={3}
                  placeholder="Type your message to the client…"
                  required
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            )}

            {sendError && (
              <p className="text-xs text-red-500">
                {sendError instanceof Error ? sendError.message : 'Failed to send. Please try again.'}
              </p>
            )}

            <button
              type="submit"
              disabled={isSending || (!notifTemplateId && !notifCustomMessage.trim())}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSending ? 'Sending…' : 'Send via email'}
            </button>
          </form>
        )}

        {notifLogs.length === 0 && (
          <p className="text-sm text-slate-400 py-2">No notifications sent yet.</p>
        )}
        {notifLogs.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {notifLogs.map((log) => {
              const dotColor = log.status === 'sent' || log.status === 'delivered'
                ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-400' : 'bg-amber-400';
              const msg = log.customMessage
                ? log.customMessage
                : log.template
                  ? 'Template: ' + log.template.triggerType.split('_').join(' ')
                  : '—';
              const sentAt = new Date(log.createdAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <li key={log.id} className="py-3 flex items-start gap-3">
                  <span className={'mt-0.5 inline-flex h-2 w-2 rounded-full shrink-0 ' + dotColor} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{msg}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{log.channel} · {log.status} · {sentAt}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Reminders sub-component ──────────────────────────────────────────────────

function RemindersCard({
  isClosed, events, reminders, showReminderForm, setShowReminderForm,
  reminderEventId, setReminderEventId, reminderAt, setReminderAt,
  isCreatingReminder, onCreateReminder, onDeleteReminder,
}: {
  isClosed: boolean;
  events: import('@dsx/shared').ScheduledEventDto[] | undefined;
  reminders: import('@dsx/shared').ReminderDto[];
  showReminderForm: boolean;
  setShowReminderForm: React.Dispatch<React.SetStateAction<boolean>>;
  reminderEventId: string;
  setReminderEventId: (v: string) => void;
  reminderAt: string;
  setReminderAt: (v: string) => void;
  isCreatingReminder: boolean;
  onCreateReminder: (payload: { scheduledEventId: string; remindAt: string }) => void;
  onDeleteReminder: (id: string) => void;
}) {
  const hasEvents = events && events.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderEventId || !reminderAt) return;
    onCreateReminder({ scheduledEventId: reminderEventId, remindAt: reminderAt });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Hearing Reminders</h3>
        {!isClosed && hasEvents && (
          <button
            onClick={() => setShowReminderForm((v) => !v)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showReminderForm ? 'Cancel' : '+ Set reminder'}
          </button>
        )}
      </div>

      <div className="px-6 py-4">
        {!hasEvents && (
          <p className="text-sm text-slate-400 py-2">No hearings scheduled — add a hearing first.</p>
        )}

        {showReminderForm && hasEvents && (
          <form className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Hearing *</label>
              <select
                value={reminderEventId}
                onChange={(e) => setReminderEventId(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select a hearing…</option>
                {events.map((ev) => {
                  const label = new Date(ev.scheduledAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  });
                  return <option key={ev.id} value={ev.id}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Remind at *</label>
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingReminder}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isCreatingReminder ? 'Saving…' : 'Save reminder'}
            </button>
          </form>
        )}

        {reminders.length === 0 && !showReminderForm && hasEvents && (
          <p className="text-sm text-slate-400 py-2">No reminders set.</p>
        )}

        {reminders.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {reminders.map((reminder) => {
              const remindAtStr = new Date(reminder.remindAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });
              const statusCls = reminder.isSent
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-100';
              return (
                <li key={reminder.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{remindAtStr}</p>
                    {reminder.scheduledEvent && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {'For hearing: ' + new Date(reminder.scheduledEvent.scheduledAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + statusCls}>
                      {reminder.isSent ? 'Sent' : 'Pending'}
                    </span>
                    {!reminder.isSent && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this reminder?')) onDeleteReminder(reminder.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  // Notifications & reminders
  const { data: notifTemplates = [] } = useNotificationTemplates();
  const { data: notifLogs = [] } = useNotificationLogs(id);
  const { mutate: sendNotification, isPending: isSending, error: sendError } = useSendNotification();
  const { data: reminders = [] } = useReminders(id!);
  const { mutate: createReminder, isPending: isCreatingReminder } = useCreateReminder(id!);
  const { mutate: deleteReminder } = useDeleteReminder(id!);

  // Notification form state
  const [showSendForm, setShowSendForm] = useState(false);
  const [notifTemplateId, setNotifTemplateId] = useState('');
  const [notifCustomMessage, setNotifCustomMessage] = useState('');
  const notifChannel = 'email' as const;

  // Reminder form state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEventId, setReminderEventId] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'hearings' | 'documents' | 'fees' | 'notes' | 'admin'>('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Loading…
      </div>
    );
  }

  if (isError || !matter) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-red-500">{vocab.matter_label} not found.</p>
      </div>
    );
  }

  const isClosed = matter.statusKey === 'closed';

  const tabs: Array<{ key: 'overview' | 'hearings' | 'documents' | 'fees' | 'notes' | 'admin'; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'hearings', label: 'Hearings' },
    { key: 'documents', label: 'Documents' },
    { key: 'fees', label: 'Fees' },
    { key: 'notes', label: 'Notes' },
    ...(isAdmin ? [{ key: 'admin' as const, label: 'Admin' }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{matter.title}</h1>
            <StatusBadge statusKey={matter.statusKey} statuses={vocab.statuses} />
          </div>
        </div>
        {isAdmin && !isClosed && (
          <button
            onClick={() => closeMatter(matter.id)}
            disabled={isClosing}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {isClosing ? 'Closing…' : `Close ${vocab.matter_label}`}
          </button>
        )}
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="px-6">
          <nav className="flex overflow-x-auto -mb-px" aria-label="Case sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Core details */}
        <div className={activeTab !== 'overview' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Case Details</h2>
          </div>
          <div className="px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Internal Ref</dt>
              <dd className="font-mono text-slate-800">{matter.internalRef}</dd>
            </div>

            {matter.externalRef && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Court Ref</dt>
                <dd className="font-mono text-slate-800">{matter.externalRef}</dd>
              </div>
            )}

            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{vocab.participant_label}</dt>
              <dd className="text-slate-800 font-medium">{matter.participant?.name ?? '—'}</dd>
            </div>

            {/* Portal invite — admin only */}
            {isAdmin && matter.participant && (
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Portal Access</dt>
                <dd className="flex items-center gap-2">
                  {matter.participant.portalInviteStatus === 'active' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      • Active
                    </span>
                  ) : matter.participant.portalInviteStatus === 'invited' ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Invited
                      </span>
                      <button
                        onClick={() => inviteClient(matter.participant!.id)}
                        disabled={isInviting}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                      >
                        {isInviting ? 'Resending…' : 'Resend invite'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        Not invited
                      </span>
                      {matter.participant.email && (
                        <button
                          onClick={() => inviteClient(matter.participant!.id)}
                          disabled={isInviting}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {isInviting ? 'Sending…' : `Invite ${vocab.participant_label}`}
                        </button>
                      )}
                      {!matter.participant.email && (
                        <span className="text-xs text-slate-400">(add email to invite)</span>
                      )}
                    </>
                  )}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Created by</dt>
              <dd className="text-slate-800">{matter.creator?.name ?? '—'}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Filed</dt>
              <dd className="text-slate-800">
                {new Date(matter.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last updated</dt>
              <dd className="text-slate-800">
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
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {Object.entries(vocab.metadata_fields).map(([key, label]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</dt>
                  <dd className="text-slate-800">
                    {(matter.metadata as Record<string, string>)[key] ?? '—'}
                  </dd>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
        </div>

        {/* Hearings */}
        <div className={activeTab !== 'hearings' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">{vocab.scheduled_event_label}s</h3>
            {!isClosed && (
              <button
                onClick={() => setShowAddHearing((v) => !v)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showAddHearing ? 'Cancel' : `+ Add ${vocab.scheduled_event_label}`}
              </button>
            )}
          </div>

          <div className="px-6 py-4">

          {showAddHearing && (
            <form
              className="mb-4 flex gap-3 items-end rounded-lg bg-slate-50 border border-slate-200 p-4"
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
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingEvent}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCreatingEvent ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {(!events || events.length === 0) && !showAddHearing && (
            <p className="text-sm text-slate-400 py-2">No {vocab.scheduled_event_label.toLowerCase()}s yet.</p>
          )}

          {events && events.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {events.map((event: ScheduledEventDto) => (
                <li key={event.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(event.scheduledAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.outcomeNotes && (
                      <p className="mt-0.5 text-sm text-slate-500">{event.outcomeNotes}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">Added by {event.creator?.name}</p>
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
        </div>
        </div>

        {/* Documents */}
        <div className={activeTab !== 'documents' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
            {!isClosed && user?.role !== 'client' && (
              <label className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1.5">
                {isUploading ? 'Uploading…' : (
                  <>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Upload
                  </>
                )}
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

          <div className="px-6 py-4">
          {uploadError && (
            <p className="mb-3 text-xs text-red-500">{uploadError}</p>
          )}

          {documents.length === 0 && !isUploading && (
            <p className="text-sm text-slate-400 py-2">No documents uploaded yet.</p>
          )}

          {documents.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.fileName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => downloadDocument(doc.id)}
                      disabled={isDownloading}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
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
        </div>
        </div>

        {/* Notes */}
        <div className={activeTab !== 'notes' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
            <button
              onClick={() => setShowAddNote((v) => !v)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showAddNote ? 'Cancel' : '+ Add Note'}
            </button>
          </div>

          <div className="px-6 py-4">

          {showAddNote && (
            <form
              className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3"
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
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newNotePublished}
                    onChange={(e) => setNewNotePublished(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Visible to client
                </label>
                <button
                  type="submit"
                  disabled={isCreatingNote}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </form>
          )}

          {(!notes || notes.length === 0) && !showAddNote && (
            <p className="text-sm text-slate-400 py-2">No notes yet.</p>
          )}

          {notes && notes.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {notes.map((note: NoteDto) => (
                <li key={note.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {note.creator?.name} · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            note.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500'
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
                        className="text-xs text-slate-400 hover:text-slate-600"
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
        </div>
        </div>

        {/* Document Requests */}
        <div className={activeTab !== 'documents' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Document Requests</h3>
            {!isClosed && (
              <button
                onClick={() => setShowAddDR((v) => !v)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showAddDR ? 'Cancel' : '+ Request document'}
              </button>
            )}
          </div>

          {showAddDR && (
            <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Description *</label>
                <input
                  type="text"
                  value={drDescription}
                  onChange={(e) => setDrDescription(e.target.value)}
                  placeholder="e.g. Proof of address"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Due date (optional)</label>
                <input
                  type="date"
                  value={drDueDate}
                  onChange={(e) => setDrDueDate(e.target.value)}
                  className="block w-48 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isCreatingDR ? 'Saving…' : 'Save request'}
              </button>
            </div>
          )}

          {documentRequests.length === 0 && !showAddDR && (
            <p className="text-sm text-slate-400 py-2">No document requests yet.</p>
          )}

          {documentRequests.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {documentRequests.map((dr) => (
                <li key={dr.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">{dr.description}</p>
                    {dr.dueDate && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Due: {new Date(dr.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        dr.status === 'received'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}
                    >
                      {dr.status === 'received' ? 'Received' : 'Pending'}
                    </span>
                    {dr.status === 'pending' && !isClosed && (
                      <button
                        onClick={() => markReceived(dr.id)}
                        className="text-xs text-slate-400 hover:text-slate-600"
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
        </div>

        {/* Fees */}
        <div className={activeTab !== 'fees' ? 'hidden' : undefined}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Fees</h3>
            {isAdmin && !isClosed && (
              <button
                onClick={() => setShowAddFee((v) => !v)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showAddFee ? 'Cancel' : '+ Add Fee'}
              </button>
            )}
          </div>

          <div className="px-6 py-4">
          {showAddFee && (
            <form
              className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 flex flex-wrap gap-3 items-end"
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
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as FeeType)}
                  className="block rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="one-time">One-time</option>
                  <option value="periodic">Periodic</option>
                  <option value="per-hearing">Per hearing</option>
                  <option value="per-consultation">Per consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeTotalAmount}
                  onChange={(e) => setFeeTotalAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="block w-36 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingFee}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCreatingFee ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {fees.length === 0 && !showAddFee && (
            <p className="text-sm text-slate-400 py-2">No fees recorded yet.</p>
          )}

          {fees.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {fees.map((fee) => (
                <li key={fee.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 capitalize">
                        {fee.type.replace(/-/g, ' ')}
                      </p>
                      <div className="mt-1.5 flex gap-4 text-xs text-slate-500">
                        <span>Total: ₹{fee.totalAmount.toLocaleString('en-IN')}</span>
                        <span>Paid: ₹{fee.paidAmount.toLocaleString('en-IN')}</span>
                        <span className={fee.dueAmount > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                          Due: ₹{fee.dueAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {fee.paymentHistory.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {fee.paymentHistory.map((p, i) => (
                            <li key={i} className="text-xs text-slate-400">
                              ₹{p.amount.toLocaleString('en-IN')} on {new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {p.note ? ` — ${p.note}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {payingFeeId === fee.id && (
                        <div className="mt-3 flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (₹)</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="block w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Note (optional)</label>
                            <input
                              type="text"
                              value={paymentNote}
                              onChange={(e) => setPaymentNote(e.target.value)}
                              placeholder="e.g. Cheque #123"
                              className="block w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isLoggingPayment ? 'Saving…' : 'Log payment'}
                          </button>
                          <button
                            onClick={() => { setPayingFeeId(null); setPaymentAmount(''); setPaymentNote(''); }}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {isAdmin && fee.dueAmount > 0 && !isClosed && payingFeeId !== fee.id && (
                      <button
                        onClick={() => { setPayingFeeId(fee.id); setPaymentAmount(''); setPaymentNote(''); }}
                        className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
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
        </div>
        </div>

        {/* Audit Trail */}
        {isAdmin && activeTab === 'admin' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
            </div>
            <div className="px-6 py-4">
            {(!auditLogs || auditLogs.length === 0) && (
              <p className="text-sm text-slate-400 py-2">No activity recorded yet.</p>
            )}

            {auditLogs && auditLogs.length > 0 && (
              <ol className="relative border-l border-slate-200 ml-3 space-y-4">
                {auditLogs.map((log: AuditLogDto) => (
                  <li key={log.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{log.actor?.name ?? 'Unknown'}</span>
                      {' '}
                      <span className="text-slate-500">{log.action}</span>
                      {' '}
                      <span className="text-slate-500">{log.entityType.replace('_', ' ')}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
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
          </div>
        )}

        {/* Notifications */}
        {isAdmin && activeTab === 'admin' && <NotificationsCard
          isClosed={isClosed}
          participant={matter.participant}
          notifTemplates={notifTemplates}
          notifTemplateId={notifTemplateId}
          setNotifTemplateId={setNotifTemplateId}
          notifCustomMessage={notifCustomMessage}
          setNotifCustomMessage={setNotifCustomMessage}
          notifChannel={notifChannel}
          showSendForm={showSendForm}
          setShowSendForm={setShowSendForm}
          isSending={isSending}
          sendError={sendError}
          notifLogs={notifLogs as NotificationLogDto[]}
          onSend={(payload) => sendNotification(payload, {
            onSuccess: () => {
              setShowSendForm(false);
              setNotifTemplateId('');
              setNotifCustomMessage('');
            },
          })}
          matterId={id!}
        />}

        {/* Reminders */}
        {isAdmin && activeTab === 'hearings' && <RemindersCard
          isClosed={isClosed}
          events={events as ScheduledEventDto[]}
          reminders={reminders}
          showReminderForm={showReminderForm}
          setShowReminderForm={setShowReminderForm}
          reminderEventId={reminderEventId}
          setReminderEventId={setReminderEventId}
          reminderAt={reminderAt}
          setReminderAt={setReminderAt}
          isCreatingReminder={isCreatingReminder}
          onCreateReminder={(payload) => createReminder(payload, {
            onSuccess: () => {
              setShowReminderForm(false);
              setReminderEventId('');
              setReminderAt('');
            },
          })}
          onDeleteReminder={(remId) => deleteReminder(remId)}
        />}

        {/* Danger zone */}
        {isAdmin && activeTab === 'admin' && (
          <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100">
              <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-500 mb-4">
                Deleting a {vocab.matter_label.toLowerCase()} is irreversible.
              </p>
              <button
                onClick={() => {
                  if (confirm(`Delete "${matter.title}"? This cannot be undone.`)) {
                    deleteMatter(matter.id);
                  }
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting…' : `Delete ${vocab.matter_label}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
