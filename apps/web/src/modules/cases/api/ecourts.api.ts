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
  decisionDate?: string;
  disposalType?: string;
  nextHearingDate?: string;
  state?: string;
  stateCode?: string;
  district?: string;
  districtCode?: string;
  courtName?: string;
  purpose?: string;
  judges?: string[];
  petitioners?: string[];
  respondents?: string[];
  petitionerAdvocates?: string[];
  respondentAdvocates?: string[];
  historyOfCaseHearings?: {
    judge?: string;
    hearingDate?: string;
    businessOnDate?: string;
  }[];
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
  stateCode?: string;
  districtCode?: string;
  filingDateFrom?: string;
  filingDateTo?: string;
  page?: number;
  pageSize?: number;
}

/** A persisted (linked) eCourts case as stored on our side. */
export interface CaseOrderDto {
  id: string;
  orderDate: string | null;
  orderType: string | null;
  filename: string;
}

export interface HearingHistoryEntry {
  businessOnDate?: string;
  hearingDate?: string;
  purposeOfListing?: string;
  judge?: string;
}

interface RawSnapshot {
  courtCaseData?: { historyOfCaseHearings?: HearingHistoryEntry[] };
}

export interface LinkedCourtCase {
  id: string;
  cnr: string;
  caseType: string | null;
  caseStatus: string | null;
  courtCode: string | null;
  filingNumber: string | null;
  registrationNumber: string | null;
  firstHearingDate: string | null;
  nextHearingDate: string | null;
  decisionDate: string | null;
  petitioners: string[];
  respondents: string[];
  judges: string[];
  orderCount: number;
  hearingCount: number;
  judgmentCount: number;
  lastSyncedAt: string | null;
  orders: CaseOrderDto[];
  rawSnapshot?: RawSnapshot;
}

export const ecourtsApi = {
  lookupCnr: (cnr: string) =>
    api.get<EcourtsCaseDetail>(`/ecourts/cnr/${encodeURIComponent(cnr)}`),

  search: (params: EcourtsSearchParams) =>
    api.get<EcourtsSearchResult>('/ecourts/search', { params }),

  enums: () => api.get('/ecourts/enums'),

  caseTypes: () =>
    api.get<{ code: string; description: string }[]>('/ecourts/case-types'),

  linkCase: (cnr: string, matterId?: string) =>
    api.post('/ecourts/cases/link', { cnr, matterId }),

  getByMatter: (matterId: string) =>
    api.get<LinkedCourtCase | null>(`/ecourts/matters/${matterId}/case`),

  refresh: (id: string) => api.post<LinkedCourtCase>(`/ecourts/cases/${id}/refresh`),

  queueRefreshCnr: (cnr: string) =>
    api.post<{ data: { status: string; message: string; estimatedTime?: string } }>(
      `/ecourts/cnr/${encodeURIComponent(cnr)}/refresh`,
    ),

  orderPdf: (id: string, filename: string) =>
    api.get<Blob>(`/ecourts/cases/${id}/orders/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    }),
};
