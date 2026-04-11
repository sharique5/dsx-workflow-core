# Plan: Disionix – Legal Workflow & Intelligence Platform

## TL;DR
Multi-tenant SaaS for lawyers. WhatsApp-first. Phase-wise build starting with MVP (case management + client portal + manual notifications). React + Node.js + PostgreSQL + S3. Each lawyer = isolated tenant.

---

## Resolved Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Onboarding | Manual backend provisioning for first lawyer (admin) account |
| 2 | Client invitation | Client record auto-created on case creation. Portal invite sent only when lawyer explicitly triggers "Invite Client". Invite-only default; auto-invite per-lawyer toggle later. |
| 3 | WhatsApp provider | Placeholder — decide after pricing evaluation |
| 4 | Auth/OTP provider | Custom solution. Email/Phone + OTP. Provider decided later based on pricing. |
| 5 | Hearing reminder timing | Configurable per lawyer per case |
| 6 | Staff permissions | Staff: create case, update case details, configure reminders, request documents. Admin (Lawyer): all staff permissions + configure pricing, close case, structure fee templates |
| 7 | Court case number | Store separately from internal UUID. Follow lawyer's court reference format |
| 8 | Hearing history | Full history per case. Notes: lawyer-only by default, publishable to client |
| 9 | Audit trail | Visible to lawyer + staff only. Not client-facing |
| 10 | Notification opt-out | Case reminders = mandatory. Marketing/non-essential = optional opt-out |
| 11 | SaaS billing model | Not needed during product development |
| 12 | Data privacy/compliance | Deferred — not in first launch |
| 13 | Landing page | Out of scope — separate application |

---

## System Architecture

### Stack
- **Frontend:** React 18 + TypeScript (web-first, mobile responsive)
- **Backend:** Node.js + TypeScript + NestJS (REST API, Docker container)
- **Database:** Azure PostgreSQL Flexible Server B1ms (credits) → Neon (post-credits)
- **Redis:** Azure Cache for Redis Basic C0 (credits) → Upstash (post-credits)
- **File Storage:** Azure Blob Storage LRS (credits) → Cloudflare R2 (post-credits)
- **Email:** Resend (free tier, 3k/month — external, no migration needed)
- **Notifications:** WhatsApp TBD (always external)
- **Compute:** Azure VM B2s + Docker Compose (credits) → Hetzner CX22 (post-credits)
- **Frontend hosting:** Azure Static Web Apps (free tier) → Cloudflare Pages (free)
- **Multi-tenancy:** Each lawyer = tenant. tenant_id on every table.

### Portability Principle
All dependencies accessed via env vars only. No provider SDK imported directly into business logic — always through a service wrapper. Migration = .env swap + 1 database dump/restore + rclone file sync.

### Abstraction contracts
| Dependency | Env var | Swap to migrate |
|-----------|---------|----------------|
| PostgreSQL | `DATABASE_URL` | Change connection string |
| Redis | `REDIS_URL` | Change connection string |
| Storage | `STORAGE_PROVIDER` + provider vars | Change 2–4 env vars |
| Email | `RESEND_API_KEY` | Change API key |
| Compute | `.env` + `docker-compose.yml` | New VM, same files |

### Provider migration map
| Service | Now (Azure credits) | Future (post-credits) | Migration effort |
|---------|-------------------|----------------------|-----------------|
| Compute | Azure VM B2s | Hetzner CX22 (€3.79/mo) | docker-compose up on new VM |
| PostgreSQL | Azure Flexible Server | Neon ($0→$19/mo) | pg_dump + restore (~30 min) |
| Redis | Azure Cache for Redis | Upstash ($0) | Change REDIS_URL |
| Files | Azure Blob | Cloudflare R2 ($0) | rclone sync (~30 min) |
| Email | Resend | Same | No change |
| Frontend | Azure Static Web Apps | Cloudflare Pages | Redeploy static build |

### Est. monthly cost (Azure credits phase)
~$59–68/month (absorbed by credits)

### Core Architecture Principle: Generic Model, Specific UI
- DB/backend uses generic entity names: `matters`, `scheduled_events`, `entity_metadata`
- UI always renders legal-specific vocabulary: "Case", "Hearing", "Judge", "Court"
- Vocabulary mapping driven by tenant's industry config (stored in DB)
- Phase 6: industry-switching config layer — zero schema changes needed
- Generic abstractions never leak into lawyer-facing or client-facing UI

### Generic → Legal UI Mapping (MVP)
| DB/Generic | Legal UI Label |
|-----------|---------------|
| matter | Case |
| scheduled_event | Hearing |
| entity_metadata.judge | Judge |
| entity_metadata.court | Court |
| matter_status (config table) | Filed / In Progress / Hearing Scheduled / Adjourned / Closed |
| participant | Client |
| document_request | Document Request |

---

## Roles & Permissions Matrix

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

## Core Data Model

### Case
- Internal UUID
- Court Case Number (lawyer's format)
- Title
- Client (linked)
- Court Name
- Judge Name
- Status (Filed / In Progress / Hearing Scheduled / Adjourned / Closed)
- Next Hearing Date
- Assigned Staff
- Created At / Updated At

### Hearing
- Case ID (FK)
- Date
- Outcome / Notes
- Created By

### Note
- Case ID (FK)
- Content
- Author (lawyer/staff)
- is_published (bool — controls client visibility)
- Created At

### Client
- Name
- Phone
- Email
- Portal access status (invited / active / not invited)
- Linked cases

### Document Request
- Case ID (FK)
- Requested By (staff/lawyer)
- Description
- Status (pending / received)
- Due date (optional)

### Fee
- Case ID (FK)
- Type (one-time / periodic / per-hearing / per-consultation)
- Total amount
- Paid amount
- Due amount
- Payment history (array)

### Event / Audit Log
- Entity type + ID
- Action
- Actor (user ID + role)
- Timestamp
- Visible to: lawyer + staff only

---

## Implementation Plan (Small Commits, Daily Integration)

### Approach
- Each unit = 1 commit / PR, independently reviewable
- Backend + Frontend worked in parallel per feature where possible
- Each phase ends with a working, demoable vertical slice
- Feature flags for partially-built modules (show/hide in UI)

---

### Phase 0 — Project Setup (Days 1–3)
| Day | Unit | Deliverable |
|-----|------|------------|
| 1 | Monorepo init + TypeScript config + ESLint + Prettier + Git | Working dev environment |
| 1 | NestJS scaffold + Prisma init + PostgreSQL connection | API server boots |
| 2 | Prisma schema — core tables (tenants, users, matters) | Migration runs |
| 2 | Prisma schema — supporting tables (scheduled_events, notes, documents, document_requests, fees, notification_templates, notification_logs, reminders, audit_logs) | Full schema migrated |
| 3 | React + Vite + Tailwind + Shadcn + React Router + Axios | Frontend boots |
| 3 | Zustand + TanStack Query + AppShell layout skeleton | Shell renders |

### Phase 1 — Auth (Days 4–7)
| Day | Unit | Deliverable |
|-----|------|------------|
| 4 | OTP generation + Redis + email placeholder | OTP stored |
| 4 | POST /auth/request-otp + POST /auth/verify-otp → JWT | Auth works via Postman |
| 5 | JWT strategy + TenantGuard + RolesGuard | Protected routes enforced |
| 5 | Tenant + admin user seeding script | First lawyer account created |
| 6 | Login + OTP page (lawyer/staff) | UI auth end-to-end |
| 6 | Client portal login (/portal/login) | Portal auth separate |
| 7 | RoleGuard in React + 401 redirect | Frontend route protection |

### Phase 2 — Case Management Core (Days 8–14)
| Day | Unit | Deliverable |
|-----|------|------------|
| 8 | Matters CRUD API | Postman-verified |
| 8 | Status workflow + audit log middleware | Changes auto-logged |
| 9 | Cases list page (search + filter) | Dashboard usable |
| 9 | Create case form | New case from UI |
| 10 | Case detail page + Scheduled events API | Detail renders |
| 11 | Hearing history + Add hearing form | Hearings fully functional |
| 12 | Notes API + Notes UI (publish/unpublish) | Notes done |
| 13 | Audit trail API + timeline component | Change history visible |
| 14 | Staff management (invite + list per tenant) | Admin adds staff |

### Phase 3 — Client Management (Days 15–19)
| Day | Unit | Deliverable |
|-----|------|------------|
| 15 | Client record auto-created on case creation | Client in DB on case create |
| 15 | Invite API (token + email/WhatsApp placeholder) | Invite mechanism works |
| 16 | Invite button on case detail (admin only) | Lawyer triggers invite |
| 16 | Client portal — case detail (status, ref, next hearing) | Portal renders |
| 17 | Client portal — hearing history + published notes | Client sees timeline |
| 18 | Document request API + UI (create/list lawyer, view-only portal) | Requests both sides |
| 19 | Fee summary API + UI (lawyer + portal) | Fees visible end-to-end |

### Phase 4 — Documents (Days 20–22)
| Day | Unit | Deliverable |
|-----|------|------------|
| 20 | S3 service + Documents API (upload, signed URL, delete) | File ops working |
| 21 | Document upload UI (drag+drop, type/size validation) | Lawyer/staff upload |
| 22 | Document list + download + tagging | View + download works |

### Phase 5 — Notifications (Days 23–27)
| Day | Unit | Deliverable |
|-----|------|------------|
| 23 | Notification template API (system defaults seeded) | Templates in DB |
| 23 | Manual notification trigger API + composer UI | Lawyer pings clients |
| 24 | Reminder scheduler (cron checks reminders table) | Scheduled reminders fire |
| 25 | Reminder config UI (per case, per lawyer) | Lawyer sets timing |
| 25 | Email via SMTP wired | Real emails send |
| 26 | WhatsApp placeholder service (mock + slot for real provider) | Slot ready |
| 27 | Notification log view (admin sees delivery history) | Audit visible |

### Phase 6 — MVP Hardening (Days 28–32)
| Day | Unit | Deliverable |
|-----|------|------------|
| 28 | Global error handling + toast UI | No silent failures |
| 28 | Loading + empty states all pages | UX polish |
| 29 | Mobile responsiveness pass (390px) | Mobile-ready |
| 29 | Pagination on list pages | Safe at scale |
| 30 | Soft deletes + input validation (Zod) | Security hardened |
| 31 | Env config review + secrets audit + demo seed script | Production-ready config |
| 32 | Full smoke test (lawyer + client flow end-to-end) | MVP sign-off |

**Total: ~32 working days (~6–7 weeks) for complete MVP**

---

## Phase Roadmap

### Phase 0 — Foundation (Done: discovery complete)
- Requirements gathered
- Data model defined
- Scope locked

### Phase 1 — MVP
- Manual backend provisioning for first lawyer
- Auth: Email/Phone + OTP (provider TBD)
- Lawyer dashboard: case list, search, filter
- Case management: create, update, status, court number, hearing dates
- Hearing history per case
- Notes (with published/unpublished toggle)
- Client record creation on case creation
- Client portal: read-only (cases, hearings, published notes, fee summary)
- Client invite flow (manual trigger by lawyer)
- Document request feature (staff/lawyer → client)
- Audit trail (lawyer + staff view)
- Manual WhatsApp notification trigger
- Email notification (fallback)

### Phase 2 — Automation
- Auto WhatsApp notifications (trigger-based)
- Configurable reminder timing per lawyer per case
- Fee module (types, payment tracking, visibility)
- Mandatory reminders / optional marketing opt-out
- Role permissions expansion

### Phase 3 — Operational Depth
- Document upload, tagging, case attachment, preview/download
- Advanced search & filtering
- Case history timeline view

### Phase 4 — AI / Intelligence
- Case summarization
- Smart suggestions
- AI chat for client portal (basic queries)

### Phase 5 — Advanced Intelligence
- Judge insights
- Case duration prediction
- Opponent pattern analysis

### Phase 6 — Platform Expansion
- Mobile app (PWA first, native if needed)
- Multi-industry support

---

## Out of Scope
- Lawyer public landing page (separate application)
- SaaS billing/subscription management
- Data privacy/compliance (deferred post-launch)
- WhatsApp provider finalization (placeholder)
- Auth provider finalization (placeholder)

---

## Open Items — All Resolved

| Item | Decision |
|------|----------|
| Document upload | Client CAN upload documents via portal — portal is no longer fully read-only |
| Notification templates | Both: predefined for system triggers + lawyer can send custom free-text notification manually |
| Multiple staff | Yes, N staff per tenant from day one. MVP: tenant-wide case access (all staff see all cases). Phase 2: case-level staff assignment toggle |
