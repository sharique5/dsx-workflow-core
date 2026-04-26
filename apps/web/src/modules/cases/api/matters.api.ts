import { api } from '../../../shared/utils/api';
import type { MatterDto, CreateMatterDto, UpdateMatterDto, PaginatedResponse, DashboardStatsDto } from '@dsx/shared';

export const mattersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<MatterDto>>('/matters', { params }),

  get: (id: string) =>
    api.get<MatterDto>(`/matters/${id}`),

  getDashboardStats: () =>
    api.get<DashboardStatsDto>('/matters/dashboard-stats'),

  create: (data: CreateMatterDto) =>
    api.post<MatterDto>('/matters', data),

  update: (id: string, data: UpdateMatterDto) =>
    api.patch<MatterDto>(`/matters/${id}`, data),

  close: (id: string) =>
    api.patch<MatterDto>(`/matters/${id}/close`),

  remove: (id: string) =>
    api.delete(`/matters/${id}`),
};
