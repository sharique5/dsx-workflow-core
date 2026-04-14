import { api } from '../../../shared/utils/api';
import type { UserDto, CreateStaffDto } from '@dsx/shared';

export const staffApi = {
  list: () =>
    api.get<UserDto[]>('/staff'),

  create: (data: CreateStaffDto) =>
    api.post<UserDto>('/staff', data),

  deactivate: (id: string) =>
    api.patch<UserDto>(`/staff/${id}/deactivate`),

  reactivate: (id: string) =>
    api.patch<UserDto>(`/staff/${id}/reactivate`),
};
