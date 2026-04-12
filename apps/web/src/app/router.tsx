import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../modules/auth/components/ProtectedRoute';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { OTPPage } from '../modules/auth/pages/OTPPage';

// Lazy load dashboard + feature pages to keep initial bundle small
// React Router's lazy() expects { Component } — NOT { default }
const DashboardPage = () => import('../modules/dashboard/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage }));

export const router = createBrowserRouter([
  // ─── Public routes ────────────────────────────────────────────────────────
  { path: '/login', element: <LoginPage /> },
  { path: '/verify-otp', element: <OTPPage /> },

  // ─── Protected routes ─────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        lazy: DashboardPage,
      },
      // Phase 2+ routes:
      // { path: '/cases', lazy: ... },
      // { path: '/cases/new', lazy: ... },
      // { path: '/cases/:id', lazy: ... },
      // { path: '/clients', lazy: ... },
      // { path: '/notifications', lazy: ... },
      // { path: '/settings', lazy: ... },
    ],
  },

  // Default redirect
  { path: '/', element: <LoginPage /> },
  { path: '*', element: <LoginPage /> },
]);
