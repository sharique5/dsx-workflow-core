import { api } from '../../../shared/utils/api';
import type { ScheduledEventDto, CreateScheduledEventDto, UpdateScheduledEventDto } from '@dsx/shared';

export const scheduledEventsApi = {
  list: (matterId: string) =>
    api.get<ScheduledEventDto[]>(`/matters/${matterId}/events`),

  create: (matterId: string, data: CreateScheduledEventDto) =>
    api.post<ScheduledEventDto>(`/matters/${matterId}/events`, data),

  update: (matterId: string, id: string, data: UpdateScheduledEventDto) =>
    api.patch<ScheduledEventDto>(`/matters/${matterId}/events/${id}`, data),

  remove: (matterId: string, id: string) =>
    api.delete(`/matters/${matterId}/events/${id}`),
};
