import { api } from '../../../shared/utils/api';
import type { MatterDto, CreateMatterDto, UpdateMatterDto } from '@dsx/shared';

export const mattersApi = {
  list: () =>
    api.get<MatterDto[]>('/matters'),

  get: (id: string) =>
    api.get<MatterDto>(`/matters/${id}`),

  create: (data: CreateMatterDto) =>
    api.post<MatterDto>('/matters', data),

  update: (id: string, data: UpdateMatterDto) =>
    api.patch<MatterDto>(`/matters/${id}`, data),

  close: (id: string) =>
    api.patch<MatterDto>(`/matters/${id}/close`),

  remove: (id: string) =>
    api.delete(`/matters/${id}`),
};
