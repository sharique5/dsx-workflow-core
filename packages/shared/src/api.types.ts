// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RequestOtpDto {
  identifier: string; // email or phone
}

export interface VerifyOtpDto {
  identifier: string;
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'staff' | 'client';
export type PortalInviteStatus = 'not_invited' | 'invited' | 'active';

export interface UserDto {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  portalInviteStatus: PortalInviteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  name: string;
  email: string;
  phone?: string;
  role: 'staff' | 'admin';
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
}

// POST /clients/:id/invite — no body needed, returns updated UserDto

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface StatusConfig {
  key: string;
  label: string;
  isTerminal: boolean;
}

export interface IndustryConfig {
  matter_label: string;
  matter_plural: string;
  scheduled_event_label: string;
  participant_label: string;
  metadata_fields: Record<string, string>;
  statuses: StatusConfig[];
}

export interface TenantDto {
  id: string;
  name: string;
  industry: string;
  industryConfig: IndustryConfig;
  createdAt: string;
}

// ─── Matter (Case) ──────────────────────────────────────────────────────────

export interface MatterDto {
  id: string;
  tenantId: string;
  internalRef: string;
  externalRef: string | null;
  title: string;
  participantId: string | null;
  participant?: UserDto;
  creator?: { id: string; name: string };
  statusKey: string;
  metadata: Record<string, string>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateMatterDto {
  title: string;
  internalRef: string;
  externalRef?: string;
  participantId?: string;
  statusKey: string;
  metadata?: Record<string, string>;
}

export interface UpdateMatterDto {
  title?: string;
  externalRef?: string;
  participantId?: string;
  statusKey?: string;
  metadata?: Record<string, string>;
}

// ─── Scheduled Event (Hearing) ───────────────────────────────────────────────

export interface ScheduledEventDto {
  id: string;
  tenantId: string;
  matterId: string;
  scheduledAt: string;
  outcomeNotes: string | null;
  createdBy: string;
  creator?: { id: string; name: string };
  createdAt: string;
}

export interface CreateScheduledEventDto {
  scheduledAt: string;
  outcomeNotes?: string;
}

export interface UpdateScheduledEventDto {
  scheduledAt?: string;
  outcomeNotes?: string;
}

// ─── Note ────────────────────────────────────────────────────────────────────

export interface NoteDto {
  id: string;
  tenantId: string;
  matterId: string;
  content: string;
  isPublished: boolean;
  createdBy: string;
  creator?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  content: string;
  isPublished?: boolean;
}

export interface UpdateNoteDto {
  content?: string;
  isPublished?: boolean;
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface DocumentDto {
  id: string;
  tenantId: string;
  matterId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  downloadUrl?: string; // signed URL — ephemeral
}

// ─── Document Request ────────────────────────────────────────────────────────

export type DocumentRequestStatus = 'pending' | 'received';

export interface DocumentRequestDto {
  id: string;
  tenantId: string;
  matterId: string;
  description: string;
  requestedBy: string;
  status: DocumentRequestStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface CreateDocumentRequestDto {
  matterId: string;
  description: string;
  dueDate?: string;
}

// ─── Fee ─────────────────────────────────────────────────────────────────────

export type FeeType = 'one-time' | 'periodic' | 'per-hearing' | 'per-consultation';

export interface PaymentRecord {
  amount: number;
  paidAt: string;
  note?: string;
}

export interface FeeDto {
  id: string;
  tenantId: string;
  matterId: string;
  type: FeeType;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentHistory: PaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogDto {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actor?: Pick<UserDto, 'id' | 'name' | 'role'>;
  diff: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  createdAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationLogDto {
  id: string;
  tenantId: string;
  matterId: string | null;
  recipientId: string;
  channel: NotificationChannel;
  templateId: string | null;
  customMessage: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
