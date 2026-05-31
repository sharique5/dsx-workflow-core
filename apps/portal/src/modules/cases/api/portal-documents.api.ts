import { api } from '../../../shared/utils/api';
import type { DocumentDto } from '@dsx/shared';

export const portalDocumentsApi = {
  list: (matterId: string) =>
    api.get<DocumentDto[]>(`/matters/${matterId}/documents`),

  getDownloadUrl: (matterId: string, docId: string) =>
    api.get<{ downloadUrl: string }>(
      `/matters/${matterId}/documents/${docId}/download`,
    ),

  upload: (matterId: string, file: File, description?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    return api.post<DocumentDto>(`/matters/${matterId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
