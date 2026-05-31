import { api } from '../../../shared/utils/api';
import type { DocumentRequestDto } from '@dsx/shared';

export const portalDocumentRequestsApi = {
  list: (matterId: string) =>
    api.get<DocumentRequestDto[]>(`/matters/${matterId}/document-requests`),

  markReceived: (matterId: string, drId: string) =>
    api.patch<DocumentRequestDto>(`/matters/${matterId}/document-requests/${drId}/receive`),
};
