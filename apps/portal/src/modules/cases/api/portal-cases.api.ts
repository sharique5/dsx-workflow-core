import { api } from '../../../shared/utils/api';
import type { MatterDto, PaginatedResponse, ScheduledEventDto, NoteDto, ClientNextHearingDto } from '@dsx/shared';

export const portalCasesApi = {
  list: () => api.get<PaginatedResponse<MatterDto>>('/matters'),

  get: (id: string) => api.get<MatterDto>(`/matters/${id}`),

  getNextHearing: () => api.get<ClientNextHearingDto | null>('/matters/client-next-hearing'),

  getEvents: (matterId: string) =>
    api.get<ScheduledEventDto[]>(`/matters/${matterId}/events`),

  getNotes: (matterId: string) =>
    api.get<NoteDto[]>(`/matters/${matterId}/notes`),
};
