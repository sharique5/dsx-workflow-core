import { api } from '../../../shared/utils/api';
import type { DocumentRequestDto, CreateDocumentRequestDto } from '@dsx/shared';

export const documentRequestsApi = {
  list: (matterId: string) =>
    api.get<DocumentRequestDto[]>(`/matters/${matterId}/document-requests`),

  create: (matterId: string, data: CreateDocumentRequestDto) =>
    api.post<DocumentRequestDto>(`/matters/${matterId}/document-requests`, data),

  markReceived: (matterId: string, id: string) =>
    api.patch<DocumentRequestDto>(
      `/matters/${matterId}/document-requests/${id}/receive`,
    ),
};
