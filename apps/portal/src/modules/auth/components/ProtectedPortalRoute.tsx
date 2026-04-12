import { Navigate, Outlet } from 'react-router-dom';
import { usePortalAuthStore } from '../../../store/auth.store';

export function ProtectedPortalRoute() {
  const isAuthenticated = usePortalAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
