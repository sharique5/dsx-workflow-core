# Backend Architecture — Disionix

## Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS (modules, DI, guards, interceptors — ideal for multi-tenant RBAC)
- **API Style:** REST
- **Database:** PostgreSQL + Prisma ORM (type-safe, migration-friendly)
- **File Storage:** Azure Blob Storage (initial). Abstracted via StorageService — swappable to S3/R2 via env var.
- **Notifications:** Placeholder service (email via SMTP, WhatsApp TBD)
- **Auth:** Custom JWT + OTP (provider TBD)
- **Cache/Sessions:** Redis (OTP storage, session state)
- **Containerisation:** Docker + docker-compose (local dev). Deploy to Azure App Service (containers).

---

## Multi-Tenancy Model
- Every table has `tenant_id` (UUID FK)
- All queries scoped via NestJS guard that injects `tenant_id` from JWT
- No row-level security at DB — enforced at application layer via guard
- Shared infrastructure, isolated data

---

## Core Architecture Principle
- DB uses generic entity names
- UI vocabulary mapped from tenant config (industry_config JSONB in tenants table)
- Legal config: `matter → Case`, `scheduled_event → Hearing`, etc.

---

## Project Structure
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
    interceptors/         # AuditInterceptor
    decorators/           # @Roles(), @CurrentUser()
    database/             # PrismaService
    storage/              # S3Service
  config/
  main.ts
```

---

## Database Schema

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | varchar | Firm/individual name |
| industry | varchar | 'legal' (default), extensible |
| industry_config | JSONB | Vocabulary + status mappings |
| created_at | timestamptz | |

**industry_config example (legal):**
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
| created_at | timestamptz | |
| updated_at | timestamptz | |

### matters
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| internal_ref | varchar | Auto-generated (e.g. MAT-0001) |
| external_ref | varchar | Court case number (lawyer's format) |
| title | varchar | |
| participant_id | UUID FK → users | The client |
| status_key | varchar | Matches key in industry_config.statuses |
| metadata | JSONB | judge, court, custom fields |
| created_by | UUID FK → users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

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
| created_at | timestamptz | |
| updated_at | timestamptz | |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | |
| matter_id | UUID FK | |
| file_name | varchar | Original file name |
| s3_key | varchar | Storage path |
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
| payment_history | JSONB | Array of {amount, paid_at, note} |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### notification_templates
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tenant_id | UUID FK | nullable = system-wide |
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
| sent_at | timestamptz | nullable |
| created_at | timestamptz | |

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
| entity_type | varchar | matter / note / document / fee / user / etc. |
| entity_id | UUID | |
| action | varchar | created / updated / deleted / status_changed |
| actor_id | UUID FK → users | |
| diff | JSONB | What changed (before/after) |
| created_at | timestamptz | |

---

## RBAC Guards

```
@Roles('admin')           → Admin only
@Roles('admin', 'staff')  → Admin + Staff
@Roles('client')          → Client portal
TenantGuard               → Always injects + validates tenant_id from JWT
```

---

## API Conventions
- Base URL: `/api/v1/`
- Auth header: `Authorization: Bearer <jwt>`
- Tenant resolved from JWT (not URL path — avoids tenant spoofing)
- Pagination: `?page=1&limit=20`
- Soft deletes on matters, users (never hard delete)
- All timestamps in UTC ISO 8601

---

## File Upload
- Max size: 10MB per file
- Allowed types: PDF, JPG, PNG, DOCX
- Upload flow: client → API (validates) → S3 pre-signed URL or direct proxy upload → store s3_key in DB
- Files never served directly from S3 — signed URLs generated on demand (15 min expiry)

---

## Environment Config
```
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_EXPIRY
S3_BUCKET
S3_REGION
S3_ACCESS_KEY
S3_SECRET_KEY
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
WHATSAPP_PROVIDER_URL (placeholder)
WHATSAPP_API_KEY (placeholder)
```
