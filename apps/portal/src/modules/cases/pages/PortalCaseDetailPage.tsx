import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  usePortalCase,
  usePortalCaseEvents,
  usePortalCaseNotes,
  usePortalCaseDocumentRequests,
  usePortalCaseFees,
  usePortalCaseDocuments,
  usePortalDocumentDownloadUrl,
  usePortalUploadDocument,
  usePortalMessages,
  usePortalSendMessage,
  usePortalMarkMessagesRead,
  usePortalMessagesUnreadCount,
} from '../hooks/usePortalCases';
import type { MessageDto } from '@dsx/shared';

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

type Tab = 'overview' | 'hearings' | 'notes' | 'documents' | 'fees' | 'messages';

interface TabDef { id: Tab; label: string; icon: ReactNode; badge?: number }

const TABS: TabDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    id: 'hearings',
    label: 'Hearings',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  },
  {
    id: 'fees',
    label: 'Fees',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const MESSAGES_TAB: TabDef = {
  id: 'messages',
  label: 'Messages',
  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
};

interface SidebarNavProps {
  title: string;
  internalRef: string;
  statusKey: string;
  isClosed: boolean;
  activeTab: Tab;
  tabs: TabDef[];
  onNavigate: (tab: Tab) => void;
}

function SidebarNav({ title, internalRef, statusKey, isClosed, activeTab, tabs, onNavigate }: SidebarNavProps) {
  return (
    <>
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Current matter</p>
        <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-3">{title}</p>
        <code className="mt-2 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 inline-block">{internalRef}</code>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
            isClosed ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-slate-400' : 'bg-indigo-500'}`} />
            {formatStatusKey(statusKey)}
          </span>
        </div>
      </div>
      <nav className="p-3 space-y-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className={`shrink-0 ${activeTab === tab.id ? 'text-indigo-200' : 'text-slate-400'}`}>
              {tab.icon}
            </span>
            <span className="flex-1">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-white text-indigo-600 px-1.5 py-0.5 text-xs font-bold min-w-[1.25rem]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

export function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const { data: matter, isLoading } = usePortalCase(id!);
  const { data: events = [] } = usePortalCaseEvents(id!);
  const { data: notes = [] } = usePortalCaseNotes(id!);
  const { data: documentRequests = [] } = usePortalCaseDocumentRequests(id!);
  const { data: fees = [] } = usePortalCaseFees(id!);
  const { data: documents = [] } = usePortalCaseDocuments(id!);
  const { mutate: downloadDocument } = usePortalDocumentDownloadUrl(id!);
  const { mutate: uploadDocument, isPending: isUploading } = usePortalUploadDocument(id!);

  const { data: messages = [] } = usePortalMessages(id!);
  const { mutate: sendMessage, isPending: isSending } = usePortalSendMessage(id!);
  const { mutate: markRead } = usePortalMarkMessagesRead(id!);
  const { data: unreadData } = usePortalMessagesUnreadCount(id!);
  const unreadCount = unreadData?.unread ?? 0;
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markRead();
    }
  }, [activeTab, messages.length]);

  const allTabs: TabDef[] = [
    ...TABS,
    { ...MESSAGES_TAB, badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  function handleDownload(docId: string) {
    setDownloadingIds((prev) => new Set(prev).add(docId));
    downloadDocument(docId, {
      onSettled: () => {
        setDownloadingIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      },
    });
  }

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

  const goToTab = (tab: Tab) => { setActiveTab(tab); setNavOpen(false); };

  return (
    <div className="flex flex-col">
      {/* Sticky breadcrumb + hamburger */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="h-12 px-4 flex items-center gap-2 max-w-5xl mx-auto">
          <Link
            to="/cases"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            Cases
          </Link>
          <svg className="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
          <span className="text-xs text-slate-700 font-medium truncate min-w-0 flex-1">{matter.title}</span>
          <span className="md:hidden shrink-0 text-xs text-slate-400">{TABS.find((t) => t.id === activeTab)?.label}</span>
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="md:hidden ml-1 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      <div
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 transition-opacity duration-300 md:hidden ${
          navOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile slide-in drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out md:hidden ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900">Nair &amp; Associates</span>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            title={matter.title}
            internalRef={matter.internalRef}
            statusKey={matter.statusKey}
            isClosed={isClosed}
            activeTab={activeTab}
            tabs={allTabs}
            onNavigate={goToTab}
          />
        </div>
      </div>

      {/* Page body */}
      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 xl:w-64 shrink-0 sticky top-[6.5rem] self-start h-[calc(100svh-6.5rem)] border-r border-slate-200 overflow-y-auto bg-white">
          <SidebarNav
            title={matter.title}
            internalRef={matter.internalRef}
            statusKey={matter.statusKey}
            isClosed={isClosed}
            activeTab={activeTab}
            tabs={allTabs}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        </aside>

        {/* Tab content */}
        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 max-w-xl">
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-snug">{matter.title}</h1>
                <p className="mt-1 text-xs font-mono text-slate-400">{matter.internalRef}{matter.externalRef ? ` · ${matter.externalRef}` : ''}</p>
              </div>

              {nextHearing ? (
                <div className="rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
                  <div className="bg-indigo-600 px-5 py-3 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Next Hearing</span>
                  </div>
                  <div className="bg-white px-5 py-4">
                    <p className="text-base font-bold text-slate-900">{formatDateTime(nextHearing.scheduledAt)}</p>
                    {nextHearing.outcomeNotes && <p className="mt-1 text-sm text-slate-500">{nextHearing.outcomeNotes}</p>}
                    <button
                      onClick={() => goToTab('hearings')}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      View all hearings
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <p className="text-sm text-slate-400">No upcoming hearings scheduled.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { tab: 'hearings' as Tab, label: 'Hearings', count: events.length, sub: `${events.filter((e) => new Date(e.scheduledAt) > now).length} upcoming` },
                    { tab: 'notes' as Tab, label: 'Notes', count: notes.length, sub: 'from your lawyer' },
                    { tab: 'documents' as Tab, label: 'Documents', count: documentRequests.length, sub: `${documentRequests.filter((d) => d.status !== 'received').length} pending` },
                    { tab: 'fees' as Tab, label: 'Fees', count: fees.length, sub: `${fees.filter((f) => f.dueAmount > 0).length} with balance` },
                  ]
                ).map(({ tab, label, count, sub }) => (
                  <button
                    key={tab}
                    onClick={() => goToTab(tab)}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all duration-150"
                  >
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HEARINGS */}
          {activeTab === 'hearings' && (
            <div className="max-w-xl">
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-900">Hearing History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{events.length} {events.length === 1 ? 'hearing' : 'hearings'} on record</p>
              </div>
              {events.length === 0 ? (
                <EmptyState message="No hearings recorded yet." />
              ) : (
                <div className="space-y-3">
                  {[...sortedEvents].reverse().map((e) => {
                    const isPast = new Date(e.scheduledAt) <= now;
                    return (
                      <div key={e.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPast ? 'border-slate-200' : 'border-indigo-100'}`}>
                        {!isPast && <div className="h-0.5 bg-indigo-600" />}
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{formatDateTime(e.scheduledAt)}</p>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {isPast ? 'Done' : 'Upcoming'}
                            </span>
                          </div>
                          {e.outcomeNotes && <p className="mt-2 text-xs text-slate-500 leading-relaxed">{e.outcomeNotes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {activeTab === 'notes' && (
            <div className="max-w-xl">
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-900">Notes from your lawyer</h2>
                <p className="text-xs text-slate-400 mt-0.5">{notes.length} {notes.length === 1 ? 'note' : 'notes'} shared</p>
              </div>
              {notes.length === 0 ? (
                <EmptyState message="No notes have been shared yet." />
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="h-0.5 bg-indigo-600" />
                      <div className="px-5 py-4">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                        <p className="mt-3 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="max-w-xl space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Documents</h2>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Document Requests</p>
                  <span className="bg-slate-100 text-slate-600 rounded-full text-xs font-semibold px-2 py-0.5">{documentRequests.length}</span>
                </div>
                <div className="p-5">
                  {documentRequests.length === 0 ? (
                    <EmptyState message="No document requests." />
                  ) : (
                    <ul className="divide-y divide-slate-100 -my-1">
                      {documentRequests.map((dr) => (
                        <li key={dr.id} className="py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800">{dr.description}</p>
                              {dr.dueDate && <p className="mt-0.5 text-xs text-slate-400">Due: {formatDate(dr.dueDate)}</p>}
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              dr.status === 'received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {dr.status === 'received' ? 'Received' : 'Pending'}
                            </span>
                          </div>
                          {dr.status !== 'received' && (
                            <label className="mt-2 inline-flex items-center gap-1.5 cursor-pointer bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {isUploading ? 'Uploading…' : 'Upload'}
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadDocument({ file, drId: dr.id });
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Files</p>
                  <span className="bg-slate-100 text-slate-600 rounded-full text-xs font-semibold px-2 py-0.5">{documents.length}</span>
                </div>
                <div className="p-5">
                  {documents.length === 0 ? (
                    <EmptyState message="No files on record." />
                  ) : (
                    <ul className="divide-y divide-slate-100 -my-1">
                      {documents.map((doc) => (
                        <li key={doc.id} className="py-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                              <p className="text-xs text-slate-400">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadingIds.has(doc.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {downloadingIds.has(doc.id) ? (
                              <>
                                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                                </svg>
                                Getting link…
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FEES */}
          {activeTab === 'fees' && (
            <div className="max-w-xl">
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-900">Fees &amp; Payments</h2>
                <p className="text-xs text-slate-400 mt-0.5">{fees.length} {fees.length === 1 ? 'item' : 'items'}</p>
              </div>
              {fees.length === 0 ? (
                <EmptyState message="No fees on file." />
              ) : (
                <div className="space-y-4">
                  {fees.map((fee) => (
                    <div key={fee.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900 capitalize">{fee.type.replace(/-/g, ' ')}</p>
                        {fee.dueAmount > 0 ? (
                          <span className="shrink-0 rounded-full px-3 py-0.5 text-xs font-bold border bg-red-50 text-red-600 border-red-100">
                            {'\u20B9'}{fee.dueAmount.toLocaleString('en-IN')} due
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-600 border-emerald-100">
                            Cleared
                          </span>
                        )}
                      </div>
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[
                            { label: 'Total', amount: fee.totalAmount, cls: 'text-slate-900' },
                            { label: 'Paid', amount: fee.paidAmount, cls: 'text-emerald-600' },
                            { label: 'Due', amount: fee.dueAmount, cls: fee.dueAmount > 0 ? 'text-red-600' : 'text-slate-400' },
                          ].map(({ label, amount, cls }) => (
                            <div key={label} className="text-center bg-slate-50 rounded-xl border border-slate-100 px-2 py-3">
                              <p className="text-xs text-slate-400 mb-1">{label}</p>
                              <p className={`text-sm font-semibold ${cls}`}>{'\u20B9'}{amount.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                        </div>
                        {fee.paymentHistory.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment History</p>
                            <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                              {fee.paymentHistory.map((p, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                                  <span className="text-slate-500">{formatDate(p.paidAt)}{p.note ? ` · ${p.note}` : ''}</span>
                                  <span className="font-semibold text-slate-700">{'\u20B9'}{p.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ height: '65vh' }}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center mt-10">No messages yet. Send a message to your lawyer below.</p>
                ) : (
                  messages.map((msg: MessageDto) => {
                    const isOwn = msg.sender?.role === 'client';
                    return (
                      <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                        <p className="text-xs text-slate-400">
                          {isOwn ? 'You' : (msg.sender?.name ?? 'Your Lawyer')} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

              <div className="px-5 py-4 border-t border-slate-100">
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
                    placeholder="Type a message… (Enter to send)"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageInput.trim()}
                    className="rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
