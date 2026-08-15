import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ecourtsApi,
  type EcourtsCaseDetail,
  type EcourtsSearchParams,
  type EcourtsSearchResult,
  type LinkedCourtCase,
} from '../api/ecourts.api';

/** Live CNR lookup — triggered on demand from the case form. */
export function useEcourtsLookup() {
  return useMutation<EcourtsCaseDetail, unknown, string>({
    mutationFn: (cnr: string) => ecourtsApi.lookupCnr(cnr).then((r) => r.data),
  });
}

/** Queue a scrape for a CNR that isn't in eCourts yet. */
export function useQueueEcourtsRefresh() {
  return useMutation({
    mutationFn: (cnr: string) => ecourtsApi.queueRefreshCnr(cnr).then((r) => r.data),
  });
}

/** Search cases by party/advocate/court/date filters. */
export function useEcourtsSearch(params: EcourtsSearchParams, enabled = false) {
  return useQuery<EcourtsSearchResult>({
    queryKey: ['ecourts', 'search', params],
    queryFn: () => ecourtsApi.search(params).then((r) => r.data),
    enabled,
  });
}

/** Persist an eCourts case (optionally linked to a matter). */
export function useLinkEcourtsCase() {
  return useMutation({
    mutationFn: ({ cnr, matterId }: { cnr: string; matterId?: string }) =>
      ecourtsApi.linkCase(cnr, matterId).then((r) => r.data),
  });
}

export const ecourtsCaseKey = (matterId: string) =>
  ['ecourts', 'matter-case', matterId] as const;

/** The persisted eCourts case linked to a matter (null if none). */
export function useEcourtsCaseForMatter(matterId: string) {
  return useQuery<LinkedCourtCase | null>({
    queryKey: ecourtsCaseKey(matterId),
    queryFn: () => ecourtsApi.getByMatter(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

/** Re-pull a persisted case from eCourts and refresh its cache entry. */
export function useRefreshEcourtsCase(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ecourtsApi.refresh(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecourtsCaseKey(matterId) });
    },
  });
}
