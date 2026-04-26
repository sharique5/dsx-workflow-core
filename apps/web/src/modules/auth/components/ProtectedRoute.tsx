import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { useSessionWarning } from '../../../shared/hooks/useSessionWarning';
import { SessionWarningDialog } from '../../../shared/components/SessionWarningDialog';

/** Redirects unauthenticated users to /login */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { showWarning, secondsLeft, extendSession, performLogout } = useSessionWarning();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Outlet />
      {showWarning && (
        <SessionWarningDialog
          secondsLeft={secondsLeft}
          onStay={extendSession}
          onLogout={performLogout}
        />
      )}
    </>
  );
}
