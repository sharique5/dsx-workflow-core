/**
 * Raw response shapes from the eCourtsIndia partner API
 * (https://webapi.ecourtsindia.com/api/partner/*). Only the fields the
 * integration consumes are typed; unknown extras are preserved via rawSnapshot.
 */

export interface EcourtsApiEnvelope<T> {
  data: T;
  meta?: { request_id?: string };
}

export interface EcourtsCaseHistoryEntry {
  judge?: string;
  businessOnDate?: string;
  hearingDate?: string;
  purposeOfListing?: string;
}

export interface EcourtsJudgmentOrder {
  orderDate?: string;
  orderType?: string;
  orderUrl?: string;
}

export interface EcourtsCaseData {
  cnr: string;
  cnrCourtCode?: string;
  courtComplexCode?: string;
  cnrCaseNumber?: string;
  cnrYear?: string;
  caseType?: string;
  caseTypeRaw?: string;
  caseStatus?: string;
  filingNumber?: string;
  filingDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  firstHearingDate?: string;
  nextHearingDate?: string;
  decisionDate?: string;
  caseDurationDays?: number;
  filingToFirstHearingDays?: number;
  judges?: string[];
  petitioners?: string[];
  petitionerAdvocates?: string[];
  respondents?: string[];
  respondentAdvocates?: string[];
  caseCategoryFacetPath?: string | string[];
  hasOrders?: boolean;
  hasJudgments?: boolean;
  orderCount?: number;
  interimOrderCount?: number;
  judgmentCount?: number;
  hearingCount?: number;
  iaCount?: number;
  historyOfCaseHearings?: EcourtsCaseHistoryEntry[];
  judgmentOrders?: EcourtsJudgmentOrder[];
}

export interface EcourtsEntityInfo {
  cnr?: string;
  nextDateOfHearing?: string;
  lastDateOfHearing?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface EcourtsCaseDetail {
  courtCaseData: EcourtsCaseData;
  entityInfo?: EcourtsEntityInfo;
  files?: { files: unknown[] };
  descriptions?: {
    enumFields?: string[];
    enumLookup?: Record<string, Record<string, string>>;
  };
  caseAiAnalysis?: unknown;
}

export interface EcourtsSearchResultItem {
  cnr: string;
  caseType?: string;
  caseStatus?: string;
  filingDate?: string;
  nextHearingDate?: string;
  judges?: string[];
  petitioners?: string[];
  respondents?: string[];
  petitionerAdvocates?: string[];
  respondentAdvocates?: string[];
  actsAndSections?: string[];
  courtCode?: string;
  judicialSection?: string;
  aiKeywords?: string[];
  registrationNumber?: string;
  registrationDate?: string;
  decisionDate?: string;
  caseCategory?: string;
  benchType?: string;
}

export interface EcourtsSearchResult {
  results: EcourtsSearchResultItem[];
  totalHits: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  facets?: unknown;
  enumDescriptions?: unknown;
}

/** Normalized search parameters accepted by the provider. */
export interface EcourtsSearchParams {
  query?: string;
  advocates?: string[];
  litigants?: string[];
  courtCodes?: string[];
  caseTypes?: string[];
  caseStatuses?: string[];
  actsAndSections?: string[];
  filingDateFrom?: string;
  filingDateTo?: string;
  page?: number;
  pageSize?: number;
}
