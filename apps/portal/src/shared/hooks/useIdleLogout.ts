import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePortalAuthStore } from '../../store/auth.store';
import { authApi } from '../../modules/auth/api/auth.api';

const IDLE_MS = 20 * 60 * 1000; // 20 minutes

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * Silently logs the client out after 20 minutes of inactivity.
 * Only runs when the user is authenticated.
 */
export function useIdleLogout() {
  const isAuthenticated = usePortalAuthStore((s) => s.isAuthenticated);
  const clearAuth = usePortalAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const logout = async () => {
      try {
        await authApi.logout();
      } catch {
        // ignore — still clear local state
      }
      clearAuth();
      navigate('/login', { replace: true });
      toast.info('Your session expired. Please sign in again.');
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, IDLE_MS);
    };

    // Start the timer
    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [isAuthenticated, clearAuth, navigate]);
}
