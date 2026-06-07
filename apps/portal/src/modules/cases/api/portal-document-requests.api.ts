import { api } from '../../../shared/utils/api';
import type { DocumentRequestDto } from '@dsx/shared';

export const portalDocumentRequestsApi = {
  list: (matterId: string) =>
    api.get<DocumentRequestDto[]>(`/matters/${matterId}/document-requests`),

  upload: (matterId: string, drId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<DocumentRequestDto>(
      `/matters/${matterId}/document-requests/${drId}/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  getDownloadUrl: (matterId: string, drId: string) =>
    api.get<{ downloadUrl: string; fileName: string }>(
      `/matters/${matterId}/document-requests/${drId}/download`,
    ),

  markReceived: (matterId: string, drId: string) =>
    api.patch<DocumentRequestDto>(`/matters/${matterId}/document-requests/${drId}/receive`),
};
