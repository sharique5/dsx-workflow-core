# Disionix – Platform Architecture & Implementation Plan
**Version:** 2.0 | **Date:** April 11, 2026 | **Status:** Approved for Development

---

## 1. Product Overview

**Disionix** is a multi-tenant SaaS platform for lawyers and small law firms to manage cases, communicate with clients, and build toward AI-powered legal intelligence.

**Repo name:** `disionix`

### Vision
| Horizon | Focus |
|---------|-------|
| Short term | Case management + client communication |
| Mid term | Automation + workflow efficiency |
| Long term | Legal intelligence + AI-assisted decision making |

### Target Users
- **Primary:** Independent lawyers, small to mid-size law firms
- **Secondary:** Legal staff / juniors, Clients

### Goals
- Reduce inbound client calls by ≥50%
- Enable <10 second case updates
- >80% staff adoption
- Real-time client visibility

---

## 2. All Decisions Log

| # | Topic | Decision |
|---|-------|----------|
| 1 | Onboarding | Manual backend provisioning for first lawyer (admin) account |
| 2 | Client invitation | Client record auto-created on case creation. Portal invite sent only when lawyer explicitly triggers "Invite Client". Default = invite-only. Auto-invite per-lawyer toggle in Phase 2. |
| 3 | WhatsApp provider | Placeholder — research ongoing. Meta Business API direct preferred long-term (first 1k conversations/month free). |
| 4 | Auth/OTP | Custom JWT + OTP. Email or Phone. Provider (e.g. Resend for email OTP) decided based on pricing. |
| 5 | Hearing reminders | Configurable per lawyer, per case |
| 6 | Staff permissions | Staff: create/update case, configure reminders, request documents. Admin: all staff actions + close case, configure fees, invite clients |
| 7 | Court case number | Stored separately from internal UUID. Lawyer's court reference format. |
| 8 | Hearing history | Full history per case. Notes: lawyer-only by default, publishable to client. |
| 9 | Audit trail | Visible to lawyer + staff only. Not client-facing. |
| 10 | Notification opt-out | Case reminders = mandatory. Marketing/non-essential = optional opt-out. |
| 11 | SaaS billing | Not needed during product development |
| 12 | Data privacy/compliance | Deferred — not in first launch |
| 13 | Landing page | Out of scope — separate application |
| 14 | Document upload | Lawyer + staff only. Client upload deferred to Phase 3. |
| 15 | Notification templates | System-defined for triggers + lawyer can send free-text custom notifications manually |
| 16 | Multiple staff | N staff per tenant from day one. MVP: tenant-wide case access. Phase 2: case-level assignment toggle. |
| 17 | Generic model | DB/backend uses generic entity names. UI always renders legal-specific vocabulary. |
| 18 | UX approach | Build directly with Shadcn/UI — no Figma dependency for MVP. |
| 19 | Frontend framework | React 18 + TypeScript (SPA). Not Next.js — NestJS handles all backend; no SSR needed for private SaaS. |
| 20 | SEO | react-helmet-async for meta tags on public entry pages. No SSR needed. |
| 21 | Hosting (credits) | Full Azure stack under credits (~$60–68/month). Portable via Docker — migrate with .env swap + pg_dump + rclone. |
| 22 | Hosting (post-credits) | Hetzner CX22 (€3.79/mo) + Neon + Upstash + Cloudflare R2. ~€4–23/month. |
| 23 | Compute | Azure VM B2s + Docker Compose. VM is stateless — all data in external services. |
| 24 | Database | Azure PostgreSQL Flexible Server B1ms (credits) → Neon post-credits. Prisma ORM. |
| 25 | Redis | Azure Cache for Redis Basic C0 (credits) → Upstash free tier post-credits. |
| 26 | File storage | Azure Blob Storage (credits) → Cloudflare R2 post-credits. Abstracted via StorageService + STORAGE_PROVIDER env var. |
| 27 | Email | Resend (free tier — 3,000/month). External, no migration needed. |
| 28 | Frontend hosting | Azure Static Web Apps (free tier) → Cloudflare Pages post-credits. |
| 29 | Custom domain | Squarespace domain → CNAME to Azure Static Web Apps. SSL managed by Azure (free). |
| 30 | AI features | All deferred to Phase 4+. Three features: internal assistant, client chatbot, WhatsApp AI agent. |
| 31 | Frontend deployment | Two separate React apps in monorepo. `team.abc.in` (lawyer/staff) + `clients.abc.in` (client portal). Shared `packages/shared` for types + utilities. |

---

## 3. Core Architecture Principle

> **Generic data model + industry-specific UI vocabulary**

DB and backend use generic entity names. UI always renders legal terminology via `useVocabulary()` hook reading tenant `industry_config`. Enables multi-industry expansion in Phase 6 with zero schema changes.

| DB / Generic | Legal UI Label |
|-------------|---------------|
| matter | Case |
| scheduled_event | Hearing |
| entity_metadata.judge | Judge |
| entity_metadata.court | Court |
| matter_status (config table) | Filed / In Progress / Hearing Scheduled / Adjourned / Closed |
| participant | Client |
| document_request | Document Request |

Generic abstractions **never** leak into lawyer-facing or client-facing UI.

---

## 4. Roles & Permissions Matrix

| Action | Admin (Lawyer) | Staff | Client |
|--------|---------------|-------|--------|
| Create case | ✅ | ✅ | ❌ |
| Update case details | ✅ | ✅ | ❌ |
| Configure reminders | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ❌ |
| Request documents from client | ✅ | ✅ | ❌ |
| View audit trail | ✅ | ✅ | ❌ |
| Close case | ✅ | ❌ | ❌ |
| Configure pricing / fee structure | ✅ | ❌ | ❌ |
| Invite client to portal | ✅ | ❌ | ❌ |
| View case status | ✅ | ✅ | ✅ |
| View hearing history | ✅ | ✅ | ✅ |
| View published notes | ✅ | ✅ | ✅ |
| View unpublished notes | ✅ | ✅ | ❌ |
| View fee summary | ✅ | ✅ | ✅ (read-only) |

---

## 5. Infrastructure

### Current (Azure Credits) — ~$60–68/month

| Service | Azure Product | Est. Monthly |
|---------|--------------|-------------|
| Compute | Azure VM B2s (Docker Compose) | ~$30–35 |
| Database | Azure PostgreSQL Flexible Server B1ms | ~$12–15 |
| Redis | Azure Cache for Redis Basic C0 | ~$16 |
| File Storage | Azure Blob Storage LRS | ~$1–2 |
| Frontend | Azure Static Web Apps | $0 |
| Email | Resend free (3k/month) | $0 |
| WhatsApp | TBD | TBD |

### Post-Credits — ~€4–23/month

| Service | Provider | Monthly |
|---------|----------|---------|
| Compute | Hetzner CX22 (2 vCPU, 4GB RAM) | €3.79 |
| Database | Neon free → Launch | $0 → $19 |
| Redis | Upstash free | $0 |
| File Storage | Cloudflare R2 (10GB free, zero egress) | $0 |
| Frontend | Cloudflare Pages | $0 |
| Email | Resend free | $0 |

### Portability Principle
VM is stateless. All persistent data lives in external services. Migration steps when credits expire:

| Step | Action | Time |
|------|--------|------|
| 1 | Provision Hetzner VM + Docker Compose | 15 min |
| 2 | `pg_dump` Azure PG → restore to Neon | 15–30 min |
| 3 | `rclone sync azure:files r2:files` | 10–30 min |
| 4 | Update 6 env vars in `.env` | 5 min |
| 5 | DNS A record → new IP | 2 min |
| **Total** | | **~1–1.5 hours** |

### Provider Abstraction Map (env vars)
```
DATABASE_URL=postgresql://...           # swap connection string only
REDIS_URL=rediss://...                  # swap connection string only
STORAGE_PROVIDER=azure                  # change to 'r2' post-credits
AZURE_STORAGE_ACCOUNT=...
AZURE_STORAGE_KEY=...
AZURE_STORAGE_CONTAINER=disionix-files
# R2 equivalent (future):
# R2_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY / R2_BUCKET
RESEND_API_KEY=...                      # unchanged
WHATSAPP_PROVIDER_URL=...              # TBD
WHATSAPP_API_KEY=...                   # TBD
JWT_SECRET=...
JWT_EXPIRY=...
```

### Portability Rules (enforced during development)
- Never write files to VM disk — always via `StorageService`
- Never import `@azure/storage-blob` directly in business logic — only in `StorageService`
- Never import Redis client directly — only in `RedisService`
- No hardcoded connection strings — always `process.env.*`
- PostgreSQL always external (never in docker-compose in production)
- `docker-compose.yml` is the single source of truth for the container stack

---

## 6. Backend Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | NestJS |
| API Style | REST (`/api/v1/`) |
| ORM | Prisma |
| Database | PostgreSQL (JSONB support) |
| Cache | Redis (OTP, session state) |
| File Storage | Azure Blob → Cloudflare R2 (via StorageService abstraction) |
| Email | Resend |
| Auth | Custom JWT + OTP |
| WhatsApp | Placeholder service (provider TBD) |
| Containerisation | Docker + docker-compose |

### Multi-Tenancy
- Every table has `tenant_id` (UUID FK)
- `TenantGuard` injects + validates `tenant_id` from JWT on every request
- Tenant resolved from JWT only — never from URL path (prevents spoofing)
- Shared infrastructure, data isolated per tenant

### Project Structure
```
src/
  modules/
    auth/
    tenants/
    users/
    matters/              # "Cases" in legal UI
    scheduled-events/     # "Hearings" in legal UI
    notes/
    documents/
    document-requests/
    fees/
    notifications/
    audit/
  shared/
    guards/               # TenantGuard, RolesGuard
    interceptors/         # AuditInterceptor (auto-log on every mutation)
    decorators/           # @Roles(), @CurrentUser()
    database/             # PrismaService
    storage/              # StorageService (Azure Blob / R2 / S3)
    redis/                # RedisService
    email/                # EmailService (Resend)
  config/
  main.ts
```

### API Conventions
- Base URL: `/api/v1/`
- Auth: `Authorization: Bearer <jwt>` (httpOnly cookie on frontend)
- Pagination: `?page=1&limit=20`
- Soft deletes on `matters` and `users` — never hard delete
- All timestamps: UTC ISO 8601
- File access: signed URLs only (15 min expiry) — never direct storage URLs

### File Upload Rules
- Max size: **10MB** per file
- Allowed types: PDF, JPG, PNG, DOCX
- Flow: Request → API validates → StorageService uploads → `storage_key` stored in DB

---

## 7. Database Schema

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | varchar | Firm/individual name |
| industry | varchar | 'legal' default, extensible |
| industry_config | JSONB | Vocabulary + status mappings |
| created_at | timestamptz | |

industry_config example (legal):
```json
{
  "matter_label": "Case",
  "matter_plural": "Cases",
  "scheduled_event_label": "Hearing",
  "participant_label": "Client",
  "metadata_fields": { "judge": "Judge", "court": "Court" },
  "statuses": [
    { "key": "filed", "label": "Filed", "is_terminal": false },
    { "key": "in_progress", "label": "In Progress", "is_terminal": false },
    { "key": "hearing_scheduled", "label": "Hearing Scheduled", "is_terminal": false },
    { "key": "adjourned", "label": "Adjourned", "is_terminal": false },
    { "key": "closed", "label": "Closed", "is_terminal": true }
  ]
}
```

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| name | varchar | |
| email | varchar | nullable |
| phone | varchar | nullable |
| role | enum | admin / staff / client |
| is_active | bool | |
| portal_invite_status | enum | not_invited / invited / active |
| created_at / updated_at | timestamptz | |

### matters
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| internal_ref | varchar | Auto-generated e.g. MAT-0001 |
| external_ref | varchar | Court case number (lawyer's format) |
| title | varchar | |
| participant_id | UUID FK → users | The client |
| status_key | varchar | Matches key in industry_config.statuses |
| metadata | JSONB | judge, court, custom fields |
| created_by | UUID FK → users | |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

### scheduled_events
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| scheduled_at | timestamptz | |
| outcome_notes | text | nullable |
| created_by | UUID FK → users | |
| created_at | timestamptz | |

### notes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| content | text | |
| is_published | bool | false = lawyer/staff only |
| created_by | UUID FK → users | |
| created_at / updated_at | timestamptz | |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| file_name | varchar | Original file name |
| storage_key | varchar | Provider-agnostic storage path |
| file_size_bytes | int | |
| mime_type | varchar | |
| uploaded_by | UUID FK → users | |
| created_at | timestamptz | |

### document_requests
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| description | text | |
| requested_by | UUID FK → users | |
| status | enum | pending / received |
| due_date | date | nullable |
| created_at | timestamptz | |

### fees
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| type | enum | one-time / periodic / per-hearing / per-consultation |
| total_amount | decimal | |
| paid_amount | decimal | |
| payment_history | JSONB | [{amount, paid_at, note}] |
| created_at / updated_at | timestamptz | |

### notification_templates
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | nullable = system-wide default |
| trigger_type | enum | status_change / hearing_added / fee_due / reminder / custom |
| channel | enum | whatsapp / email |
| template_body | text | {{variable}} placeholders |
| is_system | bool | |
| created_at | timestamptz | |

### notification_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | nullable |
| recipient_id | UUID FK → users | |
| channel | enum | whatsapp / email |
| template_id | UUID FK | nullable |
| custom_message | text | nullable |
| status | enum | pending / sent / delivered / failed |
| sent_at / created_at | timestamptz | |

### reminders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| scheduled_event_id | UUID FK | |
| remind_at | timestamptz | Configurable per lawyer per case |
| is_sent | bool | |
| created_at | timestamptz | |

### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| entity_type | varchar | matter / note / document / fee / user |
| entity_id | UUID | |
| action | varchar | created / updated / deleted / status_changed |
| actor_id | UUID FK → users | |
| diff | JSONB | {before, after} |
| created_at | timestamptz | |

---

## 8. Frontend Architecture

### Monorepo Structure
Two separate React apps + one shared package inside the `disionix` monorepo:

```
disionix/
  apps/
    api/          → NestJS backend          → api.abc.in
    web/          → Lawyer + Staff dashboard → team.abc.in
    portal/       → Client portal            → clients.abc.in
  packages/
    shared/       → api.types.ts, useVocabulary, formatDate, formatCurrency
```

| App | Domain | Users | Hosting |
|-----|--------|-------|---------|
| `apps/web` | `team.abc.in` | Lawyer + Staff | Azure Static Web Apps (free) |
| `apps/portal` | `clients.abc.in` | Clients | Azure Static Web Apps (free) |
| `apps/api` | `api.abc.in` | — | Azure VM B2s (Docker) |

**Why two apps:**
- Security isolation — client bundle can never expose team routes
- Separate deploy cycles — team fix doesn't touch client portal
- Smaller client bundle — no dashboard code loaded for clients
- Future-proof — chatbot and internal AI will diverge significantly

### Shared Package (`packages/shared`)
Single source of truth used by both apps:
- `api.types.ts` — all API response/request types
- `useVocabulary.ts` — industry config vocabulary hook
- `formatDate.ts`, `formatCurrency.ts`
- `api.ts` — Axios instance factory

### Stack (both apps)
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Server State | TanStack Query |
| UI State | Zustand |
| Components | Shadcn/UI (Radix UI + Tailwind CSS) |
| Forms | React Hook Form + Zod |
| HTTP | Axios (interceptors) |
| File Uploads | react-dropzone (`apps/web` only) |
| SEO | react-helmet-async (login/entry pages) |

### Vocabulary Layer
All UI labels come from `useVocabulary()` (in `packages/shared`) reading tenant `industry_config` from Zustand. Legal terms never hard-coded in component logic.

### `apps/web` Structure (team.abc.in)
```
src/
  modules/
    auth/           LoginPage, OTPPage
    dashboard/      DashboardPage
    matters/        MatterListPage, MatterDetailPage, CreateMatterPage
    scheduled-events/  HearingHistory, AddHearingForm
    notes/          NotesList, NoteEditor
    documents/      DocumentList, DocumentUpload
    document-requests/ DocumentRequestList, CreateDocumentRequest
    fees/           FeeSummary, FeeForm
    clients/        ClientListPage, ClientInviteButton
    notifications/  NotificationComposer
    audit/          AuditTimeline
    settings/       SettingsPage
  shared/
    layout/         AppShell.tsx (sidebar + header)
```

**Routes:**
```
/login  /verify-otp  /dashboard
/cases  /cases/new  /cases/:id
/cases/:id/hearings  /cases/:id/notes
/cases/:id/documents  /cases/:id/fees  /cases/:id/requests
/clients  /clients/:id
/notifications  /settings
```

### `apps/portal` Structure (clients.abc.in)
```
src/
  modules/
    auth/           PortalLoginPage, PortalOTPPage
    cases/          PortalCaseListPage, PortalCaseDetailPage
    hearings/       PortalHearingsPage
    fees/           PortalFeesPage
    requests/       PortalDocumentRequestsPage
  shared/
    layout/         PortalShell.tsx (minimal, mobile-first)
```

**Routes:**
```
/login  /verify-otp
/cases  /cases/:id
/cases/:id/hearings  /cases/:id/fees  /cases/:id/requests
```

### State Management (both apps)
| Concern | Tool |
|--------|------|
| Auth user + token | Zustand |
| Tenant vocabulary config | Zustand (populated on login) |
| API data | TanStack Query |
| Form state | React Hook Form |
| Toasts | Shadcn Toast |

### Security
- JWT stored in `httpOnly` cookie — never localStorage (XSS protection)
- Axios interceptor attaches cookie automatically
- On 401 → clear auth state + redirect to login
- `apps/portal` has zero knowledge of team routes — complete bundle separation

### Design Principles
- `apps/portal`: mobile-first (clients on phones), minimal UI
- `apps/web`: desktop-optimised, information dense
- Dropdown-first inputs (minimal typing for lawyers)
- Case status update < 10 seconds (max 2 clicks)

---

## 9. Client Portal Scope (MVP)

| Feature | Available |
|---------|-----------|
| View case status + next hearing | ✅ |
| Full hearing history | ✅ |
| Published notes (lawyer-controlled) | ✅ |
| Fee summary | ✅ (read-only) |
| View document requests | ✅ (read-only) |
| Upload documents | ❌ (Phase 3) |
| WhatsApp / email notifications | ✅ |
| Opt out of hearing reminders | ❌ (mandatory) |
| Opt out of marketing messages | ✅ |

---

## 10. AI & Chat Features (Later Phases)

| Feature | Phase | Notes |
|---------|-------|-------|
| Internal legal AI assistant (lawyer/staff) | Phase 4 | Case summarization, draft suggestions. Highest value, lowest risk. |
| Client portal chatbot | Phase 4 | Scoped to client's own case data — no hallucination risk on structured data |
| WhatsApp AI agent | Phase 4–5 | Most complex — needs conversation state + human handoff logic |

All three depend on structured case data accumulated from Phase 1–2 active usage.

---

## 11. Phase Roadmap

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| 0 | Foundation | Repo, schema, scaffolding, Docker setup, StorageService abstraction |
| 1 (MVP) | Core system | Cases, hearings, notes, client portal, invites, doc requests, fees, manual notifications, audit trail |
| 2 | Automation | Auto WhatsApp triggers, reminder scheduler, fee module, case-level staff assignment toggle |
| 3 | Operational depth | Document upload/management, advanced search, case timeline |
| 4 | AI / Intelligence | Internal assistant, client chatbot, case summarization |
| 5 | Advanced intelligence | Judge insights, case duration prediction, opponent analysis |
| 6 | Platform expansion | PWA/native app, multi-industry vocabulary switch UI |

---

## 12. Implementation Plan — MVP (~32 working days)

Each unit = 1 commit / PR. Backend + Frontend parallelized per feature. Feature flags for in-progress modules.

### Phase 0 — Project Setup (Days 1–3)
| Day | Unit | Deliverable |
|-----|------|------------|
| 1 | Monorepo init + TypeScript + ESLint + Prettier + Git | Dev environment |
| 1 | NestJS scaffold + Prisma + connect to Azure PostgreSQL | API boots, DB connects |
| 1 | Dockerfile + docker-compose.yml (API + Nginx) + StorageService abstraction | Containerised, portable |
| 2 | Prisma schema — core tables (tenants, users, matters) | Migration runs |
| 2 | Prisma schema — all supporting tables | Full schema migrated |
| 3 | React + Vite + Tailwind + Shadcn + React Router + Axios | Frontend boots |
| 3 | Zustand + TanStack Query + AppShell + react-helmet-async | Shell renders, SEO ready |

### Phase 1 — Auth (Days 4–7)
| Day | Unit | Deliverable |
|-----|------|------------|
| 4 | OTP generation + Azure Redis + Resend email | OTP stored + email sent |
| 4 | POST /auth/request-otp + POST /auth/verify-otp → JWT | Auth via Postman |
| 5 | JWT strategy + TenantGuard + RolesGuard | All routes protected |
| 5 | Seed script (first lawyer account manual provision) | Admin account created |
| 6 | Login + OTP pages (lawyer/staff flow) | UI auth end-to-end |
| 6 | /portal/login + /portal/verify-otp (client portal) | Portal auth separate |
| 7 | RoleGuard in React + 401 redirect | Frontend route protection |

### Phase 2 — Case Management (Days 8–14)
| Day | Unit | Deliverable |
|-----|------|------------|
| 8 | Matters CRUD API (GET list, GET detail, POST, PATCH) | Postman-verified |
| 8 | Status workflow + AuditInterceptor (auto-log every mutation) | Changes auto-logged |
| 9 | Cases list page (search + filter by status) | Dashboard usable |
| 9 | Create case form (title, client, court ref, external ref, status, metadata) | New case from UI |
| 10 | Case detail page + Scheduled events API (POST, GET list) | Detail + hearings endpoint |
| 11 | Hearing history component + Add hearing form | Full hearing history visible |
| 12 | Notes API + Notes UI (create, list, publish/unpublish toggle) | Notes functional |
| 13 | Audit trail API (GET per matter, admin+staff only) + timeline component | Change history visible |
| 14 | Staff management — invite staff, list users per tenant | Admin adds staff |

### Phase 3 — Client Management (Days 15–19)
| Day | Unit | Deliverable |
|-----|------|------------|
| 15 | Client record auto-created on case creation | Client in DB |
| 15 | Invite API (token generation + Resend email) | Invite mechanism works |
| 16 | Invite button on case detail (admin only) | Lawyer triggers invite |
| 16 | Client portal — case detail (status, refs, next hearing) | Portal renders |
| 17 | Client portal — hearing history + published notes | Client sees timeline |
| 18 | Document request API + UI (create/list lawyer, view-only portal) | Requests both sides |
| 19 | Fee summary API + UI (lawyer view + portal read-only) | Fees visible end-to-end |

### Phase 4 — Documents (Days 20–22)
| Day | Unit | Deliverable |
|-----|------|------------|
| 20 | StorageService fully wired to Azure Blob + Documents API (upload, signed URL, delete) | File ops working |
| 21 | Document upload UI (drag+drop, type + size validation) | Lawyer/staff upload |
| 22 | Document list + download (signed URL) + tagging | View + download works |

### Phase 5 — Notifications (Days 23–27)
| Day | Unit | Deliverable |
|-----|------|------------|
| 23 | Notification template API + seed system defaults | Templates in DB |
| 23 | Custom notification trigger API + NotificationComposer UI | Lawyer pings clients |
| 24 | Reminder scheduler (NestJS cron — checks reminders table) | Scheduled reminders fire |
| 25 | Reminder config UI (per case, per lawyer) | Lawyer configures timing |
| 25 | Email notifications via Resend fully wired | Real emails send |
| 26 | WhatsApp placeholder service (mock + slot for real provider) | Slot ready |
| 27 | Notification log view (admin — delivery history) | Audit visible |

### Phase 6 — MVP Hardening (Days 28–32)
| Day | Unit | Deliverable |
|-----|------|------------|
| 28 | Global API error handling + Shadcn toast UI | No silent failures |
| 28 | Loading states + empty states on all major pages | UX polish |
| 29 | Mobile responsiveness pass (390px breakpoint) | Mobile-ready |
| 29 | Pagination on cases list, hearing history, audit log | Safe at scale |
| 30 | Soft deletes on matters + users | Safe data deletion |
| 30 | Zod validation on all API endpoints | Input security hardened |
| 31 | Env config review + secrets audit + DNS TTL set to 300s | Migration-ready |
| 31 | Demo seed script (1 lawyer, 2 staff, 5 cases, hearings, notes) | Demo-ready |
| 32 | Full smoke test — lawyer flow + client portal flow end-to-end | MVP sign-off |

**Total: ~32 working days (~6–7 weeks) for complete MVP**

---

## 13. Out of Scope (MVP)
- Lawyer public landing page (separate application)
- SaaS billing / subscription management
- Data privacy / compliance certification
- WhatsApp provider finalization (placeholder slot only — research ongoing)
- Client document upload (Phase 3)
- Case-level staff assignment toggle (Phase 2)
- All AI / chat features (Phase 4+)
- Mobile native app (Phase 6)
- Multi-industry config UI (Phase 6 — data model supports it from Day 1)
- Figma design (building directly with Shadcn)
