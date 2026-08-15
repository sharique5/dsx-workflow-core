import { api } from '../../../shared/utils/api';

/** Live case detail from eCourts (raw provider shape, only fields we use). */
export interface EcourtsCaseData {
  cnr: string;
  caseNumber?: string;
  caseType?: string;
  caseTypeRaw?: string;
  caseStatus?: string;
  filingNumber?: string;
  registrationNumber?: string;
  nextHearingDate?: string;
  state?: string;
  district?: string;
  courtName?: string;
  purpose?: string;
  judges?: string[];
  petitioners?: string[];
  respondents?: string[];
  petitionerAdvocates?: string[];
  respondentAdvocates?: string[];
}

export interface EcourtsCaseDetail {
  courtCaseData: EcourtsCaseData;
  entityInfo?: { nextDateOfHearing?: string; lastDateOfHearing?: string };
}

export interface EcourtsSearchItem {
  cnr: string;
  caseType?: string;
  caseStatus?: string;
  filingDate?: string;
  nextHearingDate?: string;
  petitioners?: string[];
  respondents?: string[];
  petitionerAdvocates?: string[];
  courtCode?: string;
}

export interface EcourtsSearchResult {
  results: EcourtsSearchItem[];
  totalHits: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface EcourtsSearchParams {
  query?: string;
  advocates?: string[];
  courtCodes?: string[];
  caseTypes?: string[];
  caseStatuses?: string[];
  filingDateFrom?: string;
  filingDateTo?: string;
  page?: number;
  pageSize?: number;
}

export const ecourtsApi = {
  lookupCnr: (cnr: string) =>
    api.get<EcourtsCaseDetail>(`/ecourts/cnr/${encodeURIComponent(cnr)}`),

  search: (params: EcourtsSearchParams) =>
    api.get<EcourtsSearchResult>('/ecourts/search', { params }),

  enums: () => api.get('/ecourts/enums'),

  linkCase: (cnr: string, matterId?: string) =>
    api.post('/ecourts/cases/link', { cnr, matterId }),
};
