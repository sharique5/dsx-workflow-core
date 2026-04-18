import { api } from '../../../shared/utils/api';
import type { FeeDto, CreateFeeDto, LogPaymentDto } from '@dsx/shared';

export const feesApi = {
  list: (matterId: string) =>
    api.get<FeeDto[]>(`/matters/${matterId}/fees`),

  create: (matterId: string, data: CreateFeeDto) =>
    api.post<FeeDto>(`/matters/${matterId}/fees`, data),

  logPayment: (matterId: string, feeId: string, data: LogPaymentDto) =>
    api.post<FeeDto>(`/matters/${matterId}/fees/${feeId}/payment`, data),
};
