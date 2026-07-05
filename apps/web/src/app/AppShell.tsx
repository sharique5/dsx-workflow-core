import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../modules/auth/hooks/useAuth';
import { useVocabulary } from '../shared/hooks/useVocabulary';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';
import { AiLawyerChatPanel } from '../modules/ai/components/AiLawyerChatPanel';
import { useBrand } from './brand.context';
import { BrandLogo } from '../shared/components/BrandLogo';

// ─── Icons (inline SVG to avoid deps) ────────────────────────────────────────

function IconBriefcase() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-slate-700/60 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
        ].join(' ')
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({
  vocab,
  user,
  onNavClick,
}: {
  vocab: ReturnType<typeof useVocabulary>;
  user: { name: string; role: string } | null;
  onNavClick?: () => void;
}) {
  const navigate = useNavigate();
  const { mutate: logout } = useLogout();
  const { firmName } = useBrand();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-full">
      {/* Logo / wordmark */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <BrandLogo size="md" />
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{firmName}</p>
          <p className="text-xs text-slate-400 leading-tight">Legal Workflow</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/dashboard" icon={<IconDashboard />} label="Dashboard" onClick={onNavClick} />
        <NavItem to="/cases" icon={<IconBriefcase />} label={vocab.matter_plural} onClick={onNavClick} />
        {user?.role === 'admin' && (
          <NavItem to="/staff" icon={<IconTeam />} label="Team" onClick={onNavClick} />
        )}
        {user?.role === 'admin' && (
          <NavItem to="/clients" icon={<IconClients />} label="Clients" onClick={onNavClick} />
        )}
        {user?.role === 'admin' && (
          <NavItem to="/notifications" icon={<IconBell />} label="Notifications" onClick={onNavClick} />
        )}
        <NavItem to="/settings" icon={<IconSettings />} label="Settings" onClick={onNavClick} />
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-300">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => logout(undefined, { onSuccess: () => navigate('/login') })}
            className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-400/10"
            title="Sign out"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const vocab = useVocabulary();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const sidebarWidth = 'w-60';

  return (
    <div className="flex h-full bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside className={`hidden lg:flex flex-col ${sidebarWidth} flex-shrink-0 bg-slate-900`}>
        <SidebarContent vocab={vocab} user={user} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`relative flex flex-col ${sidebarWidth} bg-slate-900 z-50`}>
            <SidebarContent
              vocab={vocab}
              user={user}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar (mobile only menu toggle) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
          <span className="text-sm font-semibold text-slate-800">{firmName}</span>
        </header>

        {/* Desktop breadcrumb bar */}
        <div className="hidden lg:flex items-center h-12 px-6 border-b border-slate-100 bg-white flex-shrink-0">
          <Breadcrumbs />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* AI research floating button */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-700 text-white shadow-lg ring-4 ring-indigo-100 transition-transform hover:scale-105 hover:bg-indigo-800 focus:outline-none focus:ring-indigo-300"
        aria-label="Open legal research assistant"
        title="AI Legal Research Assistant"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </button>

      {chatOpen && <AiLawyerChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}
