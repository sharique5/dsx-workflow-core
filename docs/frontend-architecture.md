# Frontend Architecture — Disionix

## Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **Server State:** TanStack Query (React Query) — API calls, caching, invalidation
- **UI State:** Zustand — auth state, tenant config, UI toggles
- **Component Library:** Shadcn/UI (Radix UI + Tailwind CSS)
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form + Zod (validation)
- **HTTP Client:** Axios (interceptors for auth token + error handling)
- **File Uploads:** react-dropzone
- **SEO:** react-helmet-async (meta tags on public entry pages only)

---

## Core Architecture Principle: Vocabulary Layer

The UI never hard-codes legal terms in component logic. All labels come from a `useVocabulary()` hook that reads from the tenant's `industry_config`.

```
src/config/vocabulary.ts   ← Default legal config (fallback)
useVocabulary() hook       ← Reads from Zustand (populated on login)
```

Components reference:
```tsx
const { matter_label, scheduled_event_label } = useVocabulary()
// Renders "Case" or "Appointment" depending on tenant
```

---

## Project Structure
```
src/
  app/
    App.tsx               # Root provider setup
    router.tsx            # All route definitions
    providers.tsx         # QueryClient, Zustand, Toasts

  modules/
    auth/
      pages/LoginPage.tsx
      pages/OTPPage.tsx
      hooks/useAuth.ts
      api/auth.api.ts

    dashboard/
      pages/DashboardPage.tsx  # Lawyer home

    matters/              # UI says "Cases"
      pages/MatterListPage.tsx
      pages/MatterDetailPage.tsx
      pages/CreateMatterPage.tsx
      components/MatterCard.tsx
      components/MatterStatusBadge.tsx
      hooks/useMatters.ts
      api/matters.api.ts

    scheduled-events/     # UI says "Hearings"
      components/HearingHistory.tsx
      components/AddHearingForm.tsx
      api/scheduled-events.api.ts

    notes/
      components/NotesList.tsx
      components/NoteEditor.tsx
      api/notes.api.ts

    documents/
      components/DocumentList.tsx
      components/DocumentUpload.tsx
      api/documents.api.ts

    document-requests/
      components/DocumentRequestList.tsx
      components/CreateDocumentRequest.tsx
      api/document-requests.api.ts

    fees/
      components/FeeSummary.tsx
      components/FeeForm.tsx
      api/fees.api.ts

    clients/
      pages/ClientListPage.tsx
      components/ClientInviteButton.tsx
      api/clients.api.ts

    notifications/
      components/NotificationComposer.tsx  # Custom message trigger
      api/notifications.api.ts

    audit/
      components/AuditTimeline.tsx
      api/audit.api.ts

    client-portal/          # Separate module, different layout
      pages/PortalCasePage.tsx
      pages/PortalHearingsPage.tsx
      pages/PortalFeesPage.tsx
      pages/PortalDocumentRequestsPage.tsx

    settings/
      pages/SettingsPage.tsx

  shared/
    components/
      ui/                 # Shadcn re-exports
      layout/
        AppShell.tsx      # Sidebar + header (lawyer/staff)
        PortalShell.tsx   # Client portal layout
      PageHeader.tsx
      DataTable.tsx
      ConfirmDialog.tsx
      FileUploadZone.tsx

    hooks/
      useVocabulary.ts
      useTenantConfig.ts
      useCurrentUser.ts

    utils/
      api.ts              # Axios instance + interceptors
      formatDate.ts
      formatCurrency.ts

    types/
      api.types.ts        # Mirrors backend response shapes
      auth.types.ts

  config/
    vocabulary.ts         # Default legal vocabulary config
```

---

## Routing Structure

### Lawyer / Staff Routes (protected, role-guarded)
```
/login
/verify-otp
/dashboard
/cases                    → MatterListPage
/cases/new                → CreateMatterPage
/cases/:id                → MatterDetailPage
/cases/:id/hearings
/cases/:id/notes
/cases/:id/documents
/cases/:id/fees
/cases/:id/requests
/clients
/clients/:id
/notifications
/settings
```

### Client Portal Routes (separate layout, separate guard)
```
/portal/login
/portal/verify-otp
/portal/cases
/portal/cases/:id
/portal/cases/:id/hearings
/portal/cases/:id/fees
/portal/cases/:id/requests
```

---

## Auth Flow
- JWT stored in `httpOnly` cookie (not localStorage — XSS protection)
- Axios interceptor attaches token automatically
- On 401 → redirect to login, clear auth state
- Role checked on every protected route via `<RoleGuard>` wrapper

---

## State Management

| Concern | Tool |
|--------|------|
| Auth user + token | Zustand |
| Tenant vocabulary config | Zustand (set on login) |
| API data (cases, hearings, etc.) | TanStack Query |
| Form state | React Hook Form |
| Toast/notifications | Shadcn Toast |

---

## Design Principles
- Mobile-first layouts (clients will be on phones)
- Dropdown-first inputs (minimal typing for lawyer)
- Update action < 10 seconds (case status change = max 2 clicks)
- Low cognitive load — no feature bloat in MVP screens

---

## Environment Config
```
VITE_API_BASE_URL
VITE_APP_ENV
```

---

## Key Conventions
- API module per feature (`matters.api.ts`) — no raw axios calls in components
- All API types defined in `api.types.ts` — never use `any`
- TanStack Query keys: `['matters', tenantId]`, `['matter', matterId]`
- All dates displayed in locale format, stored/sent as UTC ISO 8601
- File uploads validated client-side (type + size) before upload
