import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sparkles } from 'lucide-react';
import { usePortalAuthStore } from '../../store/auth.store';
import { authApi } from '../../modules/auth/api/auth.api';
import { AiChatPanel } from '../../modules/ai/components/AiChatPanel';
import { useBrand } from '../../app/brand.context';

export function PortalShell() {
  const { user, clearAuth } = usePortalAuthStore();
  const { firmName } = useBrand();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    void authApi.logout().catch(() => null);
    clearAuth();
    window.location.href = '/login';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight">{firmName}</span>
          </div>

          {/* Avatar button + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center hover:bg-indigo-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <span className="text-xs font-semibold text-indigo-700">{initials}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30">
                {user?.name && (
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs text-slate-400 leading-none mb-0.5">Signed in as</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400">{firmName} &middot; Client Portal</p>
      </footer>

      {/* AI chat floating button */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 transition-transform hover:scale-105 hover:bg-indigo-700 focus:outline-none focus:ring-indigo-300"
        aria-label="Open case assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {chatOpen && <AiChatPanel onClose={() => setChatOpen(false)} />}

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
