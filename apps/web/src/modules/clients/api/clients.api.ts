import { api } from '../../../shared/utils/api';
import type { UserDto, CreateClientDto, UpdateClientDto, PaginatedResponse } from '@dsx/shared';

export const clientsApi = {
  list: (page = 1, limit = 25) =>
    api.get<PaginatedResponse<UserDto>>('/clients', { params: { page, limit } }),

  get: (id: string) => api.get<UserDto>(`/clients/${id}`),

  create: (data: CreateClientDto) => api.post<UserDto>('/clients', data),

  update: (id: string, data: UpdateClientDto) =>
    api.patch<UserDto>(`/clients/${id}`, data),

  invite: (id: string) => api.post<UserDto>(`/clients/${id}/invite`),
};
