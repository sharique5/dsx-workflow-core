/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../modules/auth/components/ProtectedRoute';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { OTPPage } from '../modules/auth/pages/OTPPage';
import { AppShell } from './AppShell';

// Lazy load dashboard + feature pages to keep initial bundle small
// React Router's lazy() expects { Component } — NOT { default }
const DashboardPage = () => import('../modules/dashboard/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage }));
const CasesPage = () => import('../modules/cases/pages/CasesPage').then((m) => ({ Component: m.CasesPage }));
const CreateCasePage = () => import('../modules/cases/pages/CreateCasePage').then((m) => ({ Component: m.CreateCasePage }));
const CaseDetailPage = () => import('../modules/cases/pages/CaseDetailPage').then((m) => ({ Component: m.CaseDetailPage }));
const StaffPage = () => import('../modules/staff/pages/StaffPage').then((m) => ({ Component: m.StaffPage }));
const NotificationsPage = () => import('../modules/notifications/pages/NotificationsPage').then((m) => ({ Component: m.NotificationsPage }));

export const router = createBrowserRouter([
  // ─── Public routes ────────────────────────────────────────────────────────
  { path: '/login', element: <LoginPage /> },
  { path: '/verify-otp', element: <OTPPage /> },

  // ─── Protected routes (wrapped in AppShell) ───────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', lazy: DashboardPage },
          { path: '/cases', lazy: CasesPage },
          { path: '/cases/new', lazy: CreateCasePage },
          { path: '/cases/:id', lazy: CaseDetailPage },
          { path: '/staff', lazy: StaffPage },
          { path: '/notifications', lazy: NotificationsPage },
        ],
      },
    ],
  },

  // Default redirect
  { path: '/', element: <LoginPage /> },
  { path: '*', element: <LoginPage /> },
]);

