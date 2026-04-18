import { api } from '../../../shared/utils/api';
import type { NoteDto, CreateNoteDto, UpdateNoteDto } from '@dsx/shared';

export const notesApi = {
  list: (matterId: string) =>
    api.get<NoteDto[]>(`/matters/${matterId}/notes`),

  create: (matterId: string, data: CreateNoteDto) =>
    api.post<NoteDto>(`/matters/${matterId}/notes`, data),

  update: (matterId: string, id: string, data: UpdateNoteDto) =>
    api.patch<NoteDto>(`/matters/${matterId}/notes/${id}`, data),

  remove: (matterId: string, id: string) =>
    api.delete(`/matters/${matterId}/notes/${id}`),
};
