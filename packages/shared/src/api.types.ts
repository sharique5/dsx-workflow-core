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
  participant?: Pick<UserDto, 'id' | 'name' | 'email' | 'phone' | 'portalInviteStatus'>;
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
  courtLink: string | null;
  judgeNotes: string | null;
  lawyerNotes: string | null;
  createdBy: string;
  creator?: { id: string; name: string };
  createdAt: string;
}

export interface CreateScheduledEventDto {
  scheduledAt: string;
  outcomeNotes?: string;
  courtLink?: string;
  judgeNotes?: string;
  lawyerNotes?: string;
}

export interface UpdateScheduledEventDto {
  scheduledAt?: string;
  outcomeNotes?: string;
  courtLink?: string;
  judgeNotes?: string;
  lawyerNotes?: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface UpcomingHearingDto {
  id: string;
  matterId: string;
  matterTitle: string;
  matterRef: string;
  scheduledAt: string;
}

export interface DashboardStatsDto {
  totalMatters: number;
  openMatters: number;
  closedMatters: number;
  upcomingHearings: UpcomingHearingDto[];
}

export interface ClientNextHearingDto {
  id: string;
  matterId: string;
  matterTitle: string;
  matterRef: string;
  scheduledAt: string;
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
  description: string | null;
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
  description: string;
  dueDate?: string;
}

export interface UpdateDocumentRequestDto {
  status?: DocumentRequestStatus;
}

// ─── Fee ─────────────────────────────────────────────────────────────────────

export type FeeType = 'one_time' | 'periodic' | 'per_hearing' | 'per_consultation';
export type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CreateFeeDto {
  type: FeeType;
  billingCycle?: BillingCycle;
  totalAmount: number;
}

export interface LogPaymentDto {
  amount: number;
  note?: string;
  paidAt?: string;
}

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
  billingCycle: BillingCycle | null;
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
export type NotificationTriggerType =
  | 'status_change'
  | 'hearing_added'
  | 'fee_due'
  | 'reminder'
  | 'custom';

export interface NotificationTemplateDto {
  id: string;
  tenantId: string | null;
  triggerType: NotificationTriggerType;
  channel: NotificationChannel;
  templateBody: string;
  isSystem: boolean;
  createdAt: string;
}

export interface SendNotificationDto {
  matterId: string;
  recipientId: string;
  channel: NotificationChannel;
  templateId?: string;
  customMessage?: string;
}

export interface NotificationLogDto {
  id: string;
  tenantId: string;
  matterId: string | null;
  matter?: { id: string; internalRef: string; title: string } | null;
  recipientId: string;
  recipient?: { id: string; name: string; email: string | null };
  channel: NotificationChannel;
  templateId: string | null;
  template?: { id: string; triggerType: NotificationTriggerType; channel: NotificationChannel } | null;
  customMessage: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

export interface ReminderDto {
  id: string;
  tenantId: string;
  matterId: string;
  scheduledEventId: string;
  scheduledEvent?: { id: string; scheduledAt: string };
  remindAt: string;
  message: string | null;
  isSent: boolean;
  createdAt: string;
}

export interface CreateReminderDto {
  scheduledEventId: string;
  remindAt: string;
  message?: string;
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
