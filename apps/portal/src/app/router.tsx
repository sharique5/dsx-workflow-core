import { createBrowserRouter } from 'react-router-dom';
import { PortalLoginPage } from '../modules/auth/pages/PortalLoginPage';
import { PortalOTPPage } from '../modules/auth/pages/PortalOTPPage';
import { AcceptInvitePage } from '../modules/auth/pages/AcceptInvitePage';
import { ProtectedPortalRoute } from '../modules/auth/components/ProtectedPortalRoute';
import { PortalShell } from '../shared/layout/PortalShell';
import { PortalCasesPage } from '../modules/cases/pages/PortalCasesPage';
import { PortalCaseDetailPage } from '../modules/cases/pages/PortalCaseDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <PortalLoginPage /> },
  { path: '/verify-otp', element: <PortalOTPPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    element: <ProtectedPortalRoute />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: '/cases', element: <PortalCasesPage /> },
          { path: '/cases/:id', element: <PortalCaseDetailPage /> },
        ],
      },
    ],
  },
  { path: '/', element: <PortalLoginPage /> },
  { path: '*', element: <PortalLoginPage /> },
]);
