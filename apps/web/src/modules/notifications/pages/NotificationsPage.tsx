
import { useNotificationLogs } from '../../cases/hooks/useNotifications';
import type { NotificationLogDto } from '@dsx/shared';

const STATUS_STYLES: Record<string, string> = {
  sent:      'bg-emerald-50 text-emerald-700 border border-emerald-100',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed:    'bg-red-50 text-red-600 border border-red-100',
  pending:   'bg-amber-50 text-amber-700 border border-amber-100',
};

const CHANNEL_ICON = {
  email: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

export function NotificationsPage() {
  const { data: logs = [], isLoading } = useNotificationLogs();

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notification Log</h1>
        <p className="mt-1 text-sm text-slate-500">All notifications sent across all cases.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Loading…
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">No notifications sent yet.</p>
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs as NotificationLogDto[]).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {log.recipient?.name ?? log.recipientId.slice(0, 8)}
                    {log.recipient?.email && (
                      <p className="text-xs text-slate-400 font-normal">{log.recipient.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {log.matter ? (
                      <span className="font-mono text-xs">{log.matter.internalRef}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      {CHANNEL_ICON[log.channel]}
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {log.customMessage ?? (
                      log.template
                        ? `Template: ${log.template.triggerType.replace(/_/g, ' ')}`
                        : '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[log.status] ?? ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
