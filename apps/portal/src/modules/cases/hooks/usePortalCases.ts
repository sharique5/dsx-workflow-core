import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { portalCasesApi } from '../api/portal-cases.api';
import { portalDocumentRequestsApi } from '../api/portal-document-requests.api';
import { portalFeesApi } from '../api/portal-fees.api';
import { portalDocumentsApi } from '../api/portal-documents.api';
import { portalMessagesApi } from '../api/portal-messages.api';
import type { CreateMessageDto } from '@dsx/shared';

export const PORTAL_MATTERS_KEY = ['portal', 'matters'] as const;
export const portalMatterKey = (id: string) => ['portal', 'matters', id] as const;
export const portalMatterEventsKey = (id: string) =>
  ['portal', 'matters', id, 'events'] as const;
export const portalMatterNotesKey = (id: string) =>
  ['portal', 'matters', id, 'notes'] as const;
export const portalMatterDRKey = (id: string) =>
  ['portal', 'matters', id, 'document-requests'] as const;
export const portalMatterFeesKey = (id: string) =>
  ['portal', 'matters', id, 'fees'] as const;
export const portalMatterDocsKey = (id: string) =>
  ['portal', 'matters', id, 'documents'] as const;

export const portalNextHearingKey = ['portal', 'next-hearing'] as const;

export function usePortalNextHearing() {
  return useQuery({
    queryKey: portalNextHearingKey,
    queryFn: () => portalCasesApi.getNextHearing().then((r) => r.data),
    staleTime: 60_000,
  });
}

export function usePortalCases() {
  return useQuery({
    queryKey: PORTAL_MATTERS_KEY,
    queryFn: () => portalCasesApi.list().then((r) => r.data.data),
  });
}

export function usePortalCase(id: string) {
  return useQuery({
    queryKey: portalMatterKey(id),
    queryFn: () => portalCasesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function usePortalCaseEvents(matterId: string) {
  return useQuery({
    queryKey: portalMatterEventsKey(matterId),
    queryFn: () => portalCasesApi.getEvents(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseNotes(matterId: string) {
  return useQuery({
    queryKey: portalMatterNotesKey(matterId),
    queryFn: () => portalCasesApi.getNotes(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseDocumentRequests(matterId: string) {
  return useQuery({
    queryKey: portalMatterDRKey(matterId),
    queryFn: () => portalDocumentRequestsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseFees(matterId: string) {
  return useQuery({
    queryKey: portalMatterFeesKey(matterId),
    queryFn: () => portalFeesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseDocuments(matterId: string) {
  return useQuery({
    queryKey: portalMatterDocsKey(matterId),
    queryFn: () => portalDocumentsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalDocumentDownloadUrl(matterId: string) {
  return useMutation({
    mutationFn: (docId: string) =>
      portalDocumentsApi
        .getDownloadUrl(matterId, docId)
        .then((r) => r.data.downloadUrl),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Download started', { description: 'Your file is opening in a new tab.' });
    },
    onError: () => {
      toast.error('Download failed', { description: 'Could not get the download link. Please try again.' });
    },
  });
}

export function usePortalUploadDocumentRequest(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, drId }: { file: File; drId: string }) =>
      portalDocumentRequestsApi.upload(matterId, drId, file).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterDRKey(matterId) });
      toast.success('Document uploaded successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Upload failed');
    },
  });
}

export function usePortalDocumentRequestDownloadUrl(matterId: string, drId: string) {
  return useMutation({
    mutationFn: () =>
      portalDocumentRequestsApi.getDownloadUrl(matterId, drId).then((r) => r.data),
    onError: () => toast.error('Could not get download link'),
  });
}

const portalMatterMessagesKey = (id: string) =>
  ['portal', 'matters', id, 'messages'] as const;
const portalMatterMessagesUnreadKey = (id: string) =>
  ['portal', 'matters', id, 'messages', 'unread'] as const;

export function usePortalMessages(matterId: string) {
  return useQuery({
    queryKey: portalMatterMessagesKey(matterId),
    queryFn: () => portalMessagesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function usePortalMessagesUnreadCount(matterId: string) {
  return useQuery({
    queryKey: portalMatterMessagesUnreadKey(matterId),
    queryFn: () => portalMessagesApi.unreadCount(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function usePortalSendMessage(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMessageDto) =>
      portalMessagesApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterMessagesKey(matterId) });
    },
    onError: () => toast.error('Failed to send message'),
  });
}

export function usePortalMarkMessagesRead(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => portalMessagesApi.markRead(matterId).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterMessagesUnreadKey(matterId) });
    },
  });
}
