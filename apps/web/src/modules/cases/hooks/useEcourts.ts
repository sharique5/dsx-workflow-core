import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ecourtsApi,
  type EcourtsCaseDetail,
  type EcourtsSearchParams,
  type EcourtsSearchResult,
} from '../api/ecourts.api';

/** Live CNR lookup — triggered on demand from the case form. */
export function useEcourtsLookup() {
  return useMutation<EcourtsCaseDetail, unknown, string>({
    mutationFn: (cnr: string) => ecourtsApi.lookupCnr(cnr).then((r) => r.data),
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
