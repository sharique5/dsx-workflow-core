import { api } from '../../../shared/utils/api';
import type { DocumentDto } from '@dsx/shared';

export const portalDocumentsApi = {
  list: (matterId: string) =>
    api.get<DocumentDto[]>(`/matters/${matterId}/documents`),

  getDownloadUrl: (matterId: string, docId: string) =>
    api.get<{ downloadUrl: string }>(
      `/matters/${matterId}/documents/${docId}/download`,
    ),
};
