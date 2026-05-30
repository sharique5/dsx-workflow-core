import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../modules/auth/api/auth.api';

const WARN_AFTER_MS = 45 * 60 * 1000;   // 45 min idle → show warning
const LOGOUT_AFTER_MS = 5 * 60 * 1000;  // 5 min after warning → force logout

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

export function useSessionWarning() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWarningRef = useRef(false);

  const performLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuth();
    navigate('/login', { replace: true });
    toast.info('You were signed out due to inactivity.');
  }, [clearAuth, navigate]);

  const triggerWarning = useCallback(() => {
    isWarningRef.current = true;
    setShowWarning(true);
    setSecondsLeft(5 * 60);

    // Countdown display
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Hard logout after 5 more minutes
    logoutTimerRef.current = setTimeout(async () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setShowWarning(false);
      await performLogout();
    }, LOGOUT_AFTER_MS);
  }, [performLogout]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    isWarningRef.current = false;
    setSecondsLeft(5 * 60);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    // Restart the idle timer
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = setTimeout(triggerWarning, WARN_AFTER_MS);
  }, [triggerWarning]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      // Don't reset when warning is showing — user must actively click "Stay signed in"
      if (isWarningRef.current) return;
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      warnTimerRef.current = setTimeout(triggerWarning, WARN_AFTER_MS);
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [isAuthenticated, triggerWarning]);

  return { showWarning, secondsLeft, extendSession, performLogout };
}
