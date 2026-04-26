import { useMutation, useQuery } from '@tanstack/react-query';
import { portalCasesApi } from '../api/portal-cases.api';
import { portalDocumentRequestsApi } from '../api/portal-document-requests.api';
import { portalFeesApi } from '../api/portal-fees.api';
import { portalDocumentsApi } from '../api/portal-documents.api';

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
    },
  });
}
