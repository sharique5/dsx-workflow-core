import { api } from '../../../shared/utils/api';

export interface CourtOption {
  id: string;
  name: string;
}

export const courtsApi = {
  states: () => api.get<CourtOption[]>('/courts/states'),
  districts: (stateId: string) =>
    api.get<CourtOption[]>(`/courts/districts?stateId=${stateId}`),
  complexes: (stateId: string, districtId: string) =>
    api.get<CourtOption[]>(`/courts/complexes?stateId=${stateId}&districtId=${districtId}`),
};
