import { Outlet } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/auth.store';
import { authApi } from '../../modules/auth/api/auth.api';

export function PortalShell() {
  const { user, clearAuth } = usePortalAuthStore();

  const handleLogout = () => {
    void authApi.logout().catch(() => null);
    clearAuth();
    window.location.href = '/login';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight">Nair &amp; Associates</span>
          </div>

          <div className="flex items-center gap-3">
            {user?.name && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-indigo-700">{initials}</span>
                </div>
                <span className="hidden sm:block text-xs font-medium text-slate-600">{user.name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400">Nair &amp; Associates &middot; Client Portal</p>
      </footer>
    </div>
  );
}
