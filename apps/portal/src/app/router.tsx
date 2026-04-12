import { createBrowserRouter } from 'react-router-dom';
import { PortalLoginPage } from '../modules/auth/pages/PortalLoginPage';
import { PortalOTPPage } from '../modules/auth/pages/PortalOTPPage';
import { ProtectedPortalRoute } from '../modules/auth/components/ProtectedPortalRoute';

export const router = createBrowserRouter([
  { path: '/login', element: <PortalLoginPage /> },
  { path: '/verify-otp', element: <PortalOTPPage /> },
  {
    element: <ProtectedPortalRoute />,
    children: [
      // Phase 3+ portal routes:
      // { path: '/cases', lazy: () => import(...) },
      // { path: '/cases/:id', lazy: () => import(...) },
    ],
  },
  { path: '/', element: <PortalLoginPage /> },
  { path: '*', element: <PortalLoginPage /> },
]);
