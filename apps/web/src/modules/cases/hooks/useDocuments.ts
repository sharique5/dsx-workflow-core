import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';

const docsKey = (matterId: string) =>
  ['matters', matterId, 'documents'] as const;

export function useDocuments(matterId: string) {
  return useQuery({
    queryKey: docsKey(matterId),
    queryFn: () => documentsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useUploadDocument(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      documentsApi.upload(matterId, file).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docsKey(matterId) }),
  });
}

export function useDocumentDownloadUrl(matterId: string) {
  return useMutation({
    mutationFn: (docId: string) =>
      documentsApi.getDownloadUrl(matterId, docId).then((r) => r.data.downloadUrl),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
}

export function useDeleteDocument(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      documentsApi.remove(matterId, docId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: docsKey(matterId) }),
  });
}
