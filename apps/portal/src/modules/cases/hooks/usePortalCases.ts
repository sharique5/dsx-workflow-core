import { useQuery } from '@tanstack/react-query';
import { portalCasesApi } from '../api/portal-cases.api';

export const PORTAL_MATTERS_KEY = ['portal', 'matters'] as const;
export const portalMatterKey = (id: string) => ['portal', 'matters', id] as const;
export const portalMatterEventsKey = (id: string) =>
  ['portal', 'matters', id, 'events'] as const;
export const portalMatterNotesKey = (id: string) =>
  ['portal', 'matters', id, 'notes'] as const;

export function usePortalCases() {
  return useQuery({
    queryKey: PORTAL_MATTERS_KEY,
    queryFn: () => portalCasesApi.list().then((r) => r.data),
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
