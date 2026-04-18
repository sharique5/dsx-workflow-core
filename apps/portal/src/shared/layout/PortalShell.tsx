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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-gray-900 text-sm">Disionix</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
