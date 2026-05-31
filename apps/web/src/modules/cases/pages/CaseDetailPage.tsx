import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trash2, Download, Pencil, Plus, CheckCircle, ChevronLeft, Send, Upload, CheckCheck, CreditCard, X, Link2, Bell, FileText, MoreHorizontal } from 'lucide-react';
import { useMatter, useCloseMatter, useDeleteMatter } from '../hooks/useMatters';
import { useScheduledEvents, useCreateScheduledEvent, useDeleteScheduledEvent } from '../hooks/useScheduledEvents';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useDocumentRequests, useCreateDocumentRequest, useMarkDocumentRequestReceived } from '../hooks/useDocumentRequests';
import { useFees, useCreateFee, useLogPayment } from '../hooks/useFees';
import { useDocuments, useUploadDocument, useDocumentDownloadUrl, useDeleteDocument } from '../hooks/useDocuments';
import { useInviteClient, useClients } from '../../clients/hooks/useClients';
import { useUpdateMatter } from '../hooks/useMatters';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { useAuthStore } from '../../../store/auth.store';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';
import {
  useNotificationTemplates,
  useSendNotification,
  useNotificationLogs,
  useReminders,
  useCreateReminder,
  useDeleteReminder,
} from '../hooks/useNotifications';
import type { ScheduledEventDto, NoteDto, AuditLogDto, FeeType, BillingCycle, NotificationLogDto } from '@dsx/shared';

/**
 * Convert a datetime-local string ("YYYY-MM-DDTHH:mm") or date string ("YYYY-MM-DD")
 * to a UTC ISO string, treating the input as LOCAL time.
 *
 * Reason: new Date("YYYY-MM-DDTHH:mm") is parsed as UTC by V8/Chrome, not local time,
 * causing a +5:30 shift for IST users. The multi-arg constructor always uses local time.
 */
function localInputToISO(value: string): string {
  const [datePart, timePart = '00:00'] = value.split('T');
  const [yr, mo, dy] = datePart.split('-').map(Number);
  const [hr, mn] = timePart.split(':').map(Number);
  return new Date(yr, mo - 1, dy, hr, mn).toISOString();
}

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
  notifCustomMessage, setNotifCustomMessage, notifChannel, setNotifChannel, showSendForm, setShowSendForm,
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
  setNotifChannel: (v: 'email' | 'whatsapp') => void;
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

            {/* Channel selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Channel</label>
              <div className="flex gap-2">
                {(['email', 'whatsapp'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => { setNotifChannel(ch); setNotifTemplateId(''); setNotifCustomMessage(''); }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      notifChannel === ch
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {ch === 'email' ? '✉ Email' : '💬 WhatsApp'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Template (optional)</label>
              <select
                value={notifTemplateId}
                onChange={(e) => { setNotifTemplateId(e.target.value); setNotifCustomMessage(''); }}
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">— Custom message —</option>
                {notifTemplates.filter((t) => t.channel === notifChannel).map((t) => {
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
              {isSending ? 'Sending…' : notifChannel === 'whatsapp' ? 'Send via WhatsApp' : 'Send via email'}
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
  isCreatingReminder, onCreateReminder, onDeleteReminder,
}: {
  isClosed: boolean;
  events: import('@dsx/shared').ScheduledEventDto[] | undefined;
  reminders: import('@dsx/shared').ReminderDto[];
  showReminderForm: boolean;
  setShowReminderForm: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingReminder: boolean;
  onCreateReminder: (payload: { scheduledEventId: string; remindAt: string; message?: string }) => void;
  onDeleteReminder: (id: string) => void;
}) {
  const hasEvents = events && events.length > 0;

  // Reminder form: pick hearing + days/hours before + message
  const [reminderEventId, setReminderEventId] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState('1');
  const [reminderMessage, setReminderMessage] = useState('');

  const presets = [
    { label: '1 day before', value: '1' },
    { label: '3 days before', value: '3' },
    { label: '1 week before', value: '7' },
    { label: 'Custom' , value: 'custom' },
  ];
  const [reminderPreset, setReminderPreset] = useState('1');
  const [customDays, setCustomDays] = useState('');

  const effectiveDays = reminderPreset === 'custom' ? Number(customDays) : Number(reminderPreset);

  const selectedEvent = events?.find((e) => e.id === reminderEventId);
  const remindAtPreview = selectedEvent && effectiveDays > 0
    ? new Date(new Date(selectedEvent.scheduledAt).getTime() - effectiveDays * 24 * 60 * 60 * 1000)
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderEventId || !selectedEvent || !effectiveDays) return;
    const remindAt = new Date(
      new Date(selectedEvent.scheduledAt).getTime() - effectiveDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    onCreateReminder({
      scheduledEventId: reminderEventId,
      remindAt,
      message: reminderMessage || undefined,
    });
    setReminderEventId('');
    setReminderPreset('1');
    setCustomDays('');
    setReminderMessage('');
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
            {showReminderForm ? <><X size={14} className="inline mr-1" />Cancel</> : <><Bell size={14} className="inline mr-1" />Set reminder</>}
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
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Hearing <span className="text-red-500">*</span></label>
              <select
                value={reminderEventId}
                onChange={(e) => setReminderEventId(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select a hearing…</option>
                {events.filter((ev) => new Date(ev.scheduledAt) > new Date()).map((ev) => {
                  const label = new Date(ev.scheduledAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  });
                  return <option key={ev.id} value={ev.id}>{label}</option>;
                })}
              </select>
              {events.filter((ev) => new Date(ev.scheduledAt) > new Date()).length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No upcoming hearings to set a reminder for.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Remind me <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setReminderPreset(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      reminderPreset === p.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {reminderPreset === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="e.g. 5"
                    required
                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-sm text-slate-500">days before the hearing</span>
                </div>
              )}
              {remindAtPreview && (
                <p className="mt-2 text-xs text-slate-500">
                  Reminder will be sent on{' '}
                  <span className="font-medium text-slate-700">
                    {remindAtPreview.toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Message / Note <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="e.g. Ask client to bring payment receipt"
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
                    {reminder.message && (
                      <p className="mt-0.5 text-xs text-slate-600 italic">"{reminder.message}"</p>
                    )}
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
                        className="text-red-400 hover:text-red-600"
                        title="Delete reminder"
                      >
                        <Trash2 size={14} />
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

  usePageTitle(matter?.internalRef ?? 'Case');
  const { mutate: closeMatter, isPending: isClosing } = useCloseMatter();
  const { mutate: deleteMatter, isPending: isDeleting } = useDeleteMatter();
  const { mutate: inviteClient, isPending: isInviting } = useInviteClient();
  const { mutate: updateMatter, isPending: isAssigningClient } = useUpdateMatter(id!);
  const { data: allClients = [] } = useClients();
  const [assignClientId, setAssignClientId] = useState('');

  // Hearings
  const { data: events } = useScheduledEvents(id!);
  const { mutate: createEvent, isPending: isCreatingEvent } = useCreateScheduledEvent(id!);
  const { mutate: deleteEvent } = useDeleteScheduledEvent(id!);
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [hearingDate, setHearingDate] = useState('');
  const [hearingCourtLink, setHearingCourtLink] = useState('');
  const [hearingJudgeNotes, setHearingJudgeNotes] = useState('');
  const [hearingLawyerNotes, setHearingLawyerNotes] = useState('');

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
  const [feeType, setFeeType] = useState<FeeType>('one_time');
  const [feeBillingCycle, setFeeBillingCycle] = useState<string>('monthly');
  const [feeTotalAmount, setFeeTotalAmount] = useState('');
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Documents
  const { data: documents = [] } = useDocuments(id!);
  const { mutate: uploadDocument, isPending: isUploading } = useUploadDocument(id!);
  const { mutate: downloadDocument, isPending: isDownloading } = useDocumentDownloadUrl(id!);
  const { mutate: deleteDocument } = useDeleteDocument(id!);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docDescription, setDocDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);

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
  const [notifChannel, setNotifChannel] = useState<'email' | 'whatsapp'>('email');

  // Reminder form state
  const [showReminderForm, setShowReminderForm] = useState(false);
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
          <Link
            to="/cases"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3 transition-colors"
          >
            <ChevronLeft size={14} />
            Back to Cases
          </Link>
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
            {isClosing ? 'Closing…' : 'Mark as Closed'}
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
              {/* Assign client — shown when no participant linked yet */}
              {isAdmin && !matter.participant && !isClosed && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={assignClientId}
                    onChange={(e) => setAssignClientId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">— Select client —</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    disabled={!assignClientId || isAssigningClient}
                    onClick={() => {
                      if (!assignClientId) return;
                      updateMatter({ participantId: assignClientId }, {
                        onSuccess: () => setAssignClientId(''),
                      });
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isAssigningClient ? 'Saving…' : 'Assign'}
                  </button>
                </div>
              )}
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
                {showAddHearing ? <><X size={14} className="inline mr-1" />Cancel</> : <><Plus size={14} className="inline mr-1" />Add {vocab.scheduled_event_label}</>}
              </button>
            )}
          </div>

          <div className="px-6 py-4">

          {showAddHearing && (
            <form
              className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                if (!hearingDate) return;
                const utcDate = localInputToISO(hearingDate);
                createEvent(
                  {
                    scheduledAt: utcDate,
                    courtLink: hearingCourtLink || undefined,
                    judgeNotes: hearingJudgeNotes || undefined,
                    lawyerNotes: hearingLawyerNotes || undefined,
                  },
                  {
                    onSuccess: () => {
                      setShowAddHearing(false);
                      setHearingDate('');
                      setHearingCourtLink('');
                      setHearingJudgeNotes('');
                      setHearingLawyerNotes('');
                    },
                  },
                );
              }}
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Court Link <span className="text-slate-400 font-normal">(optional URL)</span>
                </label>
                <input
                  type="text"
                  value={hearingCourtLink}
                  onChange={(e) => setHearingCourtLink(e.target.value)}
                  placeholder="https://…"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Judge Notes</label>
                  <textarea
                    value={hearingJudgeNotes}
                    onChange={(e) => setHearingJudgeNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes from the judge…"
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Lawyer Notes</label>
                  <textarea
                    value={hearingLawyerNotes}
                    onChange={(e) => setHearingLawyerNotes(e.target.value)}
                    rows={2}
                    placeholder="Internal notes…"
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingEvent ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {(!events || events.length === 0) && !showAddHearing && (
            <p className="text-sm text-slate-400 py-2">No {vocab.scheduled_event_label.toLowerCase()}s yet.</p>
          )}

          {events && events.length > 0 && (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {events.map((event: ScheduledEventDto) => {
                const isUpcoming = new Date(event.scheduledAt) > new Date();
                const isFirstUpcoming = isUpcoming && !events.slice(0, events.indexOf(event)).some(
                  (e) => new Date(e.scheduledAt) > new Date()
                );
                return (
                <li key={event.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {new Date(event.scheduledAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isFirstUpcoming && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Upcoming
                        </span>
                      )}
                    </p>
                    {event.courtLink && (
                      <a
                        href={event.courtLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Court link
                      </a>
                    )}
                    {event.judgeNotes && (
                      <p className="mt-1 text-xs text-slate-500"><span className="font-medium text-slate-600">Judge: </span>{event.judgeNotes}</p>
                    )}
                    {event.lawyerNotes && (
                      <p className="mt-0.5 text-xs text-slate-500"><span className="font-medium text-slate-600">Notes: </span>{event.lawyerNotes}</p>
                    )}
                    {event.outcomeNotes && (
                      <p className="mt-0.5 text-xs text-slate-500"><span className="font-medium text-slate-600">Outcome: </span>{event.outcomeNotes}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400">Added by {event.creator?.name}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this hearing?')) deleteEvent(event.id);
                      }}
                      className="text-red-400 hover:text-red-600 shrink-0"
                      title="Delete hearing"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
                );
              })}
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
          </div>

          <div className="px-6 py-4">
          {uploadError && (
            <p className="mb-3 text-xs text-red-500">{uploadError}</p>
          )}

          {!isClosed && user?.role !== 'client' && (
            <label
              className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
              } ${isUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                setUploadError(null);
                uploadDocument(file, { onError: (err: unknown) => { setUploadError(err instanceof Error ? err.message : 'Upload failed'); } });
              }}
            >
              <input
                type="file"
                className="sr-only"
                disabled={isUploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadError(null);
                  uploadDocument(file, { onError: (err: unknown) => { setUploadError(err instanceof Error ? err.message : 'Upload failed'); } });
                  e.target.value = '';
                }}
              />
              {isUploading ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-indigo-600 font-medium">Uploading…</p>
                  <div className="w-full max-w-xs h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </>
              ) : (
                <>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={dragOver ? '#4f46e5' : '#94a3b8'} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium text-slate-600">
                    {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-slate-400">PDF, Word, Excel, Images</p>
                </>
              )}
            </label>
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
                      {doc.description && (
                        <p className="mt-0.5 text-xs text-slate-600">{doc.description}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => downloadDocument(doc.id)}
                      disabled={isDownloading}
                      className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${doc.fileName}"?`)) deleteDocument(doc.id);
                        }}
                        className="text-red-400 hover:text-red-600"
                        title="Delete document"
                      >
                        <Trash2 size={14} />
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
              {showAddNote ? <><X size={14} className="inline mr-1" />Cancel</> : <><Plus size={14} className="inline mr-1" />Add Note</>}
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
                      {(note.createdBy === user?.id || isAdmin) && (
                        <button
                          onClick={() => setDeleteNoteId(note.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete note"
                        >
                          <Trash2 size={14} />
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

          <div className="px-6 py-4">
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
                    { description: drDescription.trim(), dueDate: drDueDate || undefined },
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
                        className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                        title="Mark received"
                      >
                        <CheckCheck size={13} />Mark received
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
                {showAddFee ? <><X size={14} className="inline mr-1" />Cancel</> : <><Plus size={14} className="inline mr-1" />Add Fee</>}
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
                  { type: feeType, totalAmount: amount, billingCycle: feeType === 'periodic' ? feeBillingCycle as BillingCycle : undefined },
                  {
                    onSuccess: () => {
                      setFeeTotalAmount('');
                      setFeeType('one_time');
                      setFeeBillingCycle('monthly');
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
                  <option value="one_time">One-time</option>
                  <option value="periodic">Periodic</option>
                  <option value="per_hearing">Per hearing</option>
                  <option value="per_consultation">Per consultation</option>
                </select>
              </div>
              {feeType === 'periodic' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Billing Cycle</label>
                  <select
                    value={feeBillingCycle}
                    onChange={(e) => setFeeBillingCycle(e.target.value)}
                    className="block rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
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
                        {fee.type.replace(/_/g, ' ')}
                        {fee.billingCycle && (
                          <span className="ml-2 text-xs font-normal text-slate-500 capitalize">({fee.billingCycle})</span>
                        )}
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
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Date</label>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="block w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                              const paidAt = paymentDate ? localInputToISO(paymentDate) : undefined;
                              logPayment(
                                { feeId: fee.id, data: { amount: amt, note: paymentNote || undefined, paidAt } },
                                {
                                  onSuccess: () => {
                                    setPayingFeeId(null);
                                    setPaymentAmount('');
                                    setPaymentNote('');
                                    setPaymentDate('');
                                  },
                                },
                              );
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isLoggingPayment ? 'Saving…' : 'Log payment'}
                          </button>
                          <button
                            onClick={() => { setPayingFeeId(null); setPaymentAmount(''); setPaymentNote(''); setPaymentDate(''); }}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {isAdmin && fee.dueAmount > 0 && !isClosed && payingFeeId !== fee.id && (
                      <button
                    onClick={() => { setPayingFeeId(fee.id); setPaymentAmount(''); setPaymentNote(''); setPaymentDate(new Date().toISOString().slice(0, 10)); }}
                        className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                      >
                        <CreditCard size={13} />Log payment
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
          setNotifChannel={setNotifChannel}
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
          isCreatingReminder={isCreatingReminder}
          onCreateReminder={(payload) => createReminder(payload, {
            onSuccess: () => setShowReminderForm(false),
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

    {/* Delete note confirmation modal */}
    {deleteNoteId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Delete note?</h3>
          <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteNoteId(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteNote(deleteNoteId); setDeleteNoteId(null); }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  );
}
