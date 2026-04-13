import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../api/auditLogs.api';

export function useAuditLogs(matterId: string) {
  return useQuery({
    queryKey: ['matters', matterId, 'audit'],
    queryFn: () => auditLogsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}
