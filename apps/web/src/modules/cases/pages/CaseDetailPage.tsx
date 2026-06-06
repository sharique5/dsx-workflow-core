import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trash2, Download, Plus, ChevronLeft, CheckCheck, CreditCard, X, Bell, MessageSquare, Send } from 'lucide-react';
import { useMatter, useCloseMatter, useDeleteMatter } from '../hooks/useMatters';
import { useScheduledEvents, useCreateScheduledEvent, useDeleteScheduledEvent } from '../hooks/useScheduledEvents';
import { useNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useDocumentRequests, useCreateDocumentRequest, useMarkDocumentRequestReceived } from '../hooks/useDocumentRequests';
import { useFees, useCreateFee, useLogPayment } from '../hooks/useFees';
import { useDocuments, useUploadDocument, useUpdateDocument, useDocumentDownloadUrl, useDeleteDocument } from '../hooks/useDocuments';
import { documentsApi } from '../api/documents.api';
import { useInviteClient, useClients } from '../../clients/hooks/useClients';
import { useUpdateMatter } from '../hooks/useMatters';
import { useStaff } from '../../staff/hooks/useStaff';
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
import type { ScheduledEventDto, NoteDto, AuditLogDto, FeeType, BillingCycle, NotificationLogDto, MessageDto } from '@dsx/shared';
import { useMessages, useSendMessage, useMarkMessagesRead, useMessagesUnreadCount } from '../hooks/useMessages';

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
            {showSendForm ? <><X size={14} className="inline mr-1" />Cancel</> : '+ Send notification'}
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

// ─── Note card with expand/collapse ─────────────────────────────────────────

const NOTE_CLAMP_LINES = 4;

function NoteCard({ note, userId, isAdmin, onDelete }: {
  note: NoteDto;
  userId: string | undefined;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = note.content.split('\n').length;
  const approxLong = lineCount > NOTE_CLAMP_LINES || note.content.length > 300;

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-slate-800 whitespace-pre-wrap leading-relaxed${!expanded && approxLong ? ' line-clamp-4' : ''}`}>
            {note.content}
          </p>
          {approxLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {expanded ? 'Show less' : 'View more'}
            </button>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {note.creator?.name} · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              note.isPublished
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {note.isPublished ? 'Visible to client' : 'Internal'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {(note.createdBy === userId || isAdmin) && (
            <button onClick={() => onDelete(note.id)} className="text-red-400 hover:text-red-600" title="Delete note">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </li>
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
  const { data: allClientsPaged } = useClients();
  const allClients = allClientsPaged?.data ?? [];
  const { data: staffList = [] } = useStaff();
  const [assignClientId, setAssignClientId] = useState('');
  const [assignStaffId, setAssignStaffId] = useState('');

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
  const { mutate: updateDocument } = useUpdateDocument(id!);
  const { mutate: downloadDocument, isPending: isDownloading } = useDocumentDownloadUrl(id!);
  const { mutate: deleteDocument } = useDeleteDocument(id!);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Pending-upload form (2-step: pick file → fill description+tags → submit)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDescription, setPendingDescription] = useState('');
  const [pendingTagInput, setPendingTagInput] = useState('');
  // Tag filter & inline edit
  const [docTagFilter, setDocTagFilter] = useState('');
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editDocTagInput, setEditDocTagInput] = useState('');
  // Preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');

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
  const [activeTab, setActiveTab] = useState<'overview' | 'hearings' | 'documents' | 'fees' | 'notes' | 'messages' | 'admin' | 'timeline'>('overview');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Messages
  const { data: messages = [] } = useMessages(id!);
  const { mutate: sendMessage, isPending: isMessageSending } = useSendMessage(id!);
  const { mutate: markRead } = useMarkMessagesRead(id!);
  const { data: unreadData } = useMessagesUnreadCount(id!);
  const unreadCount = unreadData?.unread ?? 0;

  // Scroll to bottom and mark read when messages tab is opened
  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markRead();
    }
  }, [activeTab, messages.length, markRead]);

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

  const tabs: Array<{ key: 'overview' | 'hearings' | 'documents' | 'fees' | 'notes' | 'messages' | 'admin' | 'timeline'; label: string; badge?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'hearings', label: 'Hearings' },
    { key: 'documents', label: 'Documents' },
    { key: 'fees', label: 'Fees' },
    { key: 'notes', label: 'Notes' },
    { key: 'messages', label: 'Messages', badge: unreadCount > 0 ? unreadCount : undefined },
    { key: 'timeline', label: 'Timeline' },
    ...(isAdmin ? [{ key: 'admin' as const, label: 'Admin' }] : []),
  ];

  return (
    <>
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
                className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {tab.badge}
                  </span>
                )}
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

            {/* Staff Assignment */}
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assigned to</dt>
              {isAdmin && !isClosed ? (
                <div className="flex items-center gap-2">
                  <select
                    value={assignStaffId || matter.assignedToId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignStaffId(val);
                      updateMatter({ assignedToId: val || undefined });
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Unassigned</option>
                    {staffList
                      .filter((m) => m.isActive)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.role === 'admin' ? ' (Admin)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <dd className="text-slate-800">{matter.assignedTo?.name ?? '—'}</dd>
              )}
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

          {/* Preview modal */}
          {previewUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewUrl(null)}>
              <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Preview</span>
                  <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                {previewMime.startsWith('image/') ? (
                  <div className="flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
                    <img src={previewUrl} alt="preview" className="max-w-full max-h-[75vh] object-contain rounded" />
                  </div>
                ) : (
                  <iframe src={previewUrl} className="w-full" style={{ height: '80vh' }} title="Document preview" />
                )}
              </div>
            </div>
          )}

          {!isClosed && user?.role !== 'client' && (
            <>
              {pendingFile ? (
                /* Step 2: description + tags */
                <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="truncate max-w-xs">{pendingFile.name}</span>
                    <span className="ml-auto text-xs text-slate-400 font-normal">{(pendingFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={pendingDescription}
                    onChange={(e) => setPendingDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma separated, e.g. contract, hearing)"
                    value={pendingTagInput}
                    onChange={(e) => setPendingTagInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={isUploading}
                      onClick={() => {
                        setUploadError(null);
                        const tags = pendingTagInput.split(',').map((t) => t.trim()).filter(Boolean);
                        uploadDocument(
                          { file: pendingFile, description: pendingDescription || undefined, tags },
                          {
                            onSuccess: () => { setPendingFile(null); setPendingDescription(''); setPendingTagInput(''); },
                            onError: (err: unknown) => setUploadError(err instanceof Error ? err.message : 'Upload failed'),
                          },
                        );
                      }}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isUploading ? 'Uploading…' : 'Upload'}
                    </button>
                    <button
                      onClick={() => { setPendingFile(null); setPendingDescription(''); setPendingTagInput(''); setUploadError(null); }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 1: pick file */
                <label
                  className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
                    dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                  } cursor-pointer`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) { setUploadError(null); setPendingFile(file); }
                  }}
                >
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setUploadError(null); setPendingFile(file); }
                      e.target.value = '';
                    }}
                  />
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={dragOver ? '#4f46e5' : '#94a3b8'} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium text-slate-600">{dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}</p>
                  <p className="text-xs text-slate-400">PDF, Word, Excel, Images</p>
                </label>
              )}
            </>
          )}

          {/* Tag filter */}
          {documents.length > 0 && (() => {
            const allTags = [...new Set(documents.flatMap((d) => d.tags ?? []))].sort();
            return allTags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-slate-500 mr-1">Filter:</span>
                <button
                  onClick={() => setDocTagFilter('')}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${!docTagFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setDocTagFilter(tag === docTagFilter ? '' : tag)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${docTagFilter === tag ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {documents.length === 0 && !pendingFile && (
            <p className="text-sm text-slate-400 py-2">No documents uploaded yet.</p>
          )}

          {documents.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {documents
                .filter((doc) => !docTagFilter || (doc.tags ?? []).includes(docTagFilter))
                .map((doc) => {
                const isImage = doc.mimeType.startsWith('image/');
                const isPdf = doc.mimeType === 'application/pdf';
                const canPreview = isImage || isPdf;
                return (
                  <li key={doc.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          {isImage ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          )}
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
                        {canPreview && (
                          <button
                            title="Preview"
                            onClick={() => {
                              documentsApi.getDownloadUrl(id!, doc.id).then((r) => {
                                setPreviewMime(doc.mimeType);
                                setPreviewUrl(r.data.downloadUrl);
                              });
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                        )}
                        <button
                          onClick={() => downloadDocument(doc.id)}
                          disabled={isDownloading}
                          className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        {user?.role !== 'client' && (
                          <button
                            title="Edit tags"
                            onClick={() => {
                              setEditDocId(editDocId === doc.id ? null : doc.id);
                              setEditDocTagInput((doc.tags ?? []).join(', '));
                            }}
                            className={`${editDocId === doc.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L9.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => { if (confirm(`Delete "${doc.fileName}"?`)) deleteDocument(doc.id); }}
                            className="text-red-400 hover:text-red-600"
                            title="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tags display */}
                    {(doc.tags ?? []).length > 0 && editDocId !== doc.id && (
                      <div className="flex flex-wrap gap-1 pl-11">
                        {(doc.tags ?? []).map((tag) => (
                          <span key={tag} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inline tag editor */}
                    {editDocId === doc.id && (
                      <div className="pl-11 flex items-center gap-2">
                        <input
                          type="text"
                          value={editDocTagInput}
                          onChange={(e) => setEditDocTagInput(e.target.value)}
                          placeholder="Tags (comma separated)"
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const tags = editDocTagInput.split(',').map((t) => t.trim()).filter(Boolean);
                              updateDocument({ docId: doc.id, data: { tags } }, { onSuccess: () => setEditDocId(null) });
                            }
                            if (e.key === 'Escape') setEditDocId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            const tags = editDocTagInput.split(',').map((t) => t.trim()).filter(Boolean);
                            updateDocument({ docId: doc.id, data: { tags } }, { onSuccess: () => setEditDocId(null) });
                          }}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditDocId(null)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
                      </div>
                    )}
                  </li>
                );
              })}
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
                <NoteCard key={note.id} note={note} userId={user?.id} isAdmin={isAdmin} onDelete={(id) => setDeleteNoteId(id)} />
              ))}
            </ul>
          )}
          </div>
        </div>
        </div>

        {/* Messages */}
        <div className={activeTab !== 'messages' ? 'hidden' : undefined}>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ height: '60vh' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Messages</h3>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-8">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((msg: MessageDto) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <p className="text-xs text-slate-400">
                        {msg.sender?.name ?? 'Unknown'} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${isOwn ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="px-6 py-4 border-t border-slate-100">
              <form
                className="flex items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = messageInput.trim();
                  if (!trimmed) return;
                  sendMessage({ content: trimmed }, { onSuccess: () => setMessageInput('') });
                }}
              >
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const trimmed = messageInput.trim();
                      if (!trimmed) return;
                      sendMessage({ content: trimmed }, { onSuccess: () => setMessageInput('') });
                    }
                  }}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isMessageSending || !messageInput.trim()}
                  className="rounded-lg bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
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
                {showAddDR ? <><X size={14} className="inline mr-1" />Cancel</> : '+ Request document'}
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
                            className="text-slate-400 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X size={16} />
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

    {/* ─── Timeline tab ─────────────────────────────────────────────────────── */}
    {activeTab === 'timeline' && (() => {
      type TimelineEvent =
        | { kind: 'hearing'; at: string; label: string; detail?: string }
        | { kind: 'status'; at: string; label: string; actor?: string }
        | { kind: 'note'; at: string; label: string; published: boolean }
        | { kind: 'document'; at: string; label: string }
        | { kind: 'docrequest'; at: string; label: string }
        | { kind: 'notification'; at: string; label: string };

      const evts: TimelineEvent[] = [];

      // Hearings
      (events ?? []).forEach((e: ScheduledEventDto) => {
        evts.push({ kind: 'hearing', at: e.scheduledAt, label: `Hearing scheduled: ${new Date(e.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, detail: e.judgeNotes ?? undefined });
      });

      // Audit log: status changes
      (auditLogs ?? []).forEach((log: AuditLogDto) => {
        if (log.action === 'update' && log.diff?.after?.statusKey) {
          evts.push({ kind: 'status', at: log.createdAt, label: `Status changed to "${log.diff.after.statusKey}"`, actor: log.actor?.name });
        } else if (log.action === 'create') {
          evts.push({ kind: 'status', at: log.createdAt, label: `Case created`, actor: log.actor?.name });
        } else if (log.action === 'close') {
          evts.push({ kind: 'status', at: log.createdAt, label: `Case closed`, actor: log.actor?.name });
        }
      });

      // Notes
      (notes ?? []).forEach((n: NoteDto) => {
        evts.push({ kind: 'note', at: n.createdAt, label: `Note added${n.isPublished ? ' (published)' : ''}`, published: n.isPublished });
      });

      // Documents
      (documents ?? []).forEach((d) => {
        evts.push({ kind: 'document', at: d.createdAt, label: `Document uploaded: ${d.fileName}` });
      });

      // Document requests
      (documentRequests ?? []).forEach((dr) => {
        evts.push({ kind: 'docrequest', at: dr.createdAt, label: `Document requested: ${dr.description.slice(0, 60)}${dr.description.length > 60 ? '…' : ''}` });
      });

      // Notification logs
      (notifLogs ?? []).forEach((nl: NotificationLogDto) => {
        evts.push({ kind: 'notification', at: nl.createdAt, label: `Notification sent (${nl.channel})` });
      });

      evts.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      const kindMeta: Record<TimelineEvent['kind'], { color: string; icon: React.ReactElement }> = {
        hearing: { color: 'bg-violet-100 text-violet-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
        status: { color: 'bg-indigo-100 text-indigo-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg> },
        note: { color: 'bg-amber-100 text-amber-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> },
        document: { color: 'bg-emerald-100 text-emerald-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
        docrequest: { color: 'bg-orange-100 text-orange-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" /></svg> },
        notification: { color: 'bg-sky-100 text-sky-700', icon: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg> },
      };

      return (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Case Timeline</h3>
              <p className="mt-0.5 text-xs text-slate-500">All events for this case, newest first</p>
            </div>
            <div className="px-6 py-4">
              {evts.length === 0 && <p className="text-sm text-slate-400">No events yet.</p>}
              <ol className="relative border-l border-slate-200 ml-3 space-y-0">
                {evts.map((evt, i) => {
                  const meta = kindMeta[evt.kind];
                  return (
                    <li key={i} className="mb-6 ml-5">
                      <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${meta.color}`}>
                        {meta.icon}
                      </span>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{evt.label}</p>
                          {'actor' in evt && evt.actor && (
                            <p className="mt-0.5 text-xs text-slate-500">by {evt.actor}</p>
                          )}
                          {'detail' in evt && evt.detail && (
                            <p className="mt-0.5 text-xs text-slate-500 italic">{evt.detail}</p>
                          )}
                        </div>
                        <time className="shrink-0 text-xs text-slate-400 mt-0.5">
                          {new Date(evt.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(evt.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      );
    })()}

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
    </>
  );
}
