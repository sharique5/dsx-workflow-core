import type {
  EcourtsCaseDetail,
  EcourtsSearchParams,
  EcourtsSearchResult,
} from '../ecourts.types';

/** DI token for the active eCourts data provider. */
export const ECOURTS_PROVIDER = 'ECOURTS_PROVIDER';

/**
 * Vendor-agnostic contract for an eCourts data source. Swapping vendors means
 * providing a new implementation bound to ECOURTS_PROVIDER — no callers change.
 */
export interface EcourtsProvider {
  /** Full case record by CNR (Case Number Record). */
  getCaseByCnr(cnr: string): Promise<EcourtsCaseDetail>;

  /** Search cases by party/advocate/court/date filters. */
  search(params: EcourtsSearchParams): Promise<EcourtsSearchResult>;

  /** Machine-readable catalog of searchable/sortable fields and limits. */
  getCapabilities(): Promise<unknown>;

  /** Live enum reference (case types, statuses, etc.). */
  getEnums(): Promise<unknown>;

  /** Queue a re-scrape of a case from the official eCourts servers. */
  refreshCase(cnr: string): Promise<unknown>;
}
