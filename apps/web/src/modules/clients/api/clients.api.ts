import { api } from '../../../shared/utils/api';
import type { UserDto, CreateClientDto, UpdateClientDto } from '@dsx/shared';

export const clientsApi = {
  list: () => api.get<UserDto[]>('/clients'),

  get: (id: string) => api.get<UserDto>(`/clients/${id}`),

  create: (data: CreateClientDto) => api.post<UserDto>('/clients', data),

  update: (id: string, data: UpdateClientDto) =>
    api.patch<UserDto>(`/clients/${id}`, data),
};
