import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentRequestsApi } from '../api/documentRequests.api';
import type { CreateDocumentRequestDto } from '@dsx/shared';

export const drKey = (matterId: string) =>
  ['matters', matterId, 'document-requests'] as const;

export function useDocumentRequests(matterId: string) {
  return useQuery({
    queryKey: drKey(matterId),
    queryFn: () => documentRequestsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useCreateDocumentRequest(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentRequestDto) =>
      documentRequestsApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: drKey(matterId) });
      toast.success('Document request created');
    },
    onError: () => toast.error('Failed to create document request'),
  });
}

export function useMarkDocumentRequestReceived(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      documentRequestsApi.markReceived(matterId, id).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: drKey(matterId) });
      toast.success('Marked as received');
    },
    onError: () => toast.error('Failed to update document request'),
  });
}
