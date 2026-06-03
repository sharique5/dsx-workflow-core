import { api } from '../../../shared/utils/api';
import type { DocumentDto, UpdateDocumentDto } from '@dsx/shared';

export const documentsApi = {
  list: (matterId: string) =>
    api.get<DocumentDto[]>(`/matters/${matterId}/documents`),

  upload: (matterId: string, file: File, description?: string, tags?: string[]) => {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    if (tags && tags.length > 0) form.append('tags', tags.join(','));
    return api.post<DocumentDto>(`/matters/${matterId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (matterId: string, docId: string, data: UpdateDocumentDto) =>
    api.patch<DocumentDto>(`/matters/${matterId}/documents/${docId}`, data),

  getDownloadUrl: (matterId: string, docId: string) =>
    api.get<{ downloadUrl: string }>(
      `/matters/${matterId}/documents/${docId}/download`,
    ),

  remove: (matterId: string, docId: string) =>
    api.delete<{ success: boolean }>(
      `/matters/${matterId}/documents/${docId}`,
    ),
};
