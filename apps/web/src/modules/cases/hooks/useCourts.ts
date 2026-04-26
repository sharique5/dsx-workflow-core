import { useQuery } from '@tanstack/react-query';
import { courtsApi } from '../api/courts.api';

export function useStates() {
  return useQuery({
    queryKey: ['courts', 'states'],
    queryFn: () => courtsApi.states().then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useDistricts(stateId: string) {
  return useQuery({
    queryKey: ['courts', 'districts', stateId],
    queryFn: () => courtsApi.districts(stateId).then((r) => r.data),
    enabled: !!stateId,
    staleTime: Infinity,
  });
}

export function useComplexes(stateId: string, districtId: string) {
  return useQuery({
    queryKey: ['courts', 'complexes', stateId, districtId],
    queryFn: () => courtsApi.complexes(stateId, districtId).then((r) => r.data),
    enabled: !!stateId && !!districtId,
    staleTime: Infinity,
  });
}
