import { Navigate, Outlet } from 'react-router-dom';
import { usePortalAuthStore } from '../../../store/auth.store';
import { useIdleLogout } from '../../../shared/hooks/useIdleLogout';

export function ProtectedPortalRoute() {
  const isAuthenticated = usePortalAuthStore((s) => s.isAuthenticated);
  useIdleLogout();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
