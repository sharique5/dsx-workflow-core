import { api } from '../../../shared/utils/api';
import type { AuditLogDto } from '@dsx/shared';

export const auditLogsApi = {
  list: (matterId: string) =>
    api.get<AuditLogDto[]>(`/matters/${matterId}/audit`),
};
