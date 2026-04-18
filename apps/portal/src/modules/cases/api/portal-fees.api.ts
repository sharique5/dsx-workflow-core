import { api } from '../../../shared/utils/api';
import type { FeeDto } from '@dsx/shared';

export const portalFeesApi = {
  list: (matterId: string) => api.get<FeeDto[]>(`/matters/${matterId}/fees`),
};
