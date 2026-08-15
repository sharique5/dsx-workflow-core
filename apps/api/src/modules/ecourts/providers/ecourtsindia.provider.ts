import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EcourtsProvider } from './ecourts-provider.interface';
import type {
  EcourtsApiEnvelope,
  EcourtsCaseDetail,
  EcourtsSearchParams,
  EcourtsSearchResult,
} from '../ecourts.types';

/**
 * eCourtsIndia partner API implementation.
 * Docs: https://ecourtsindia.com/api/docs — base + Bearer key come from env
 * (ECOURTS_API_BASE_URL, ECOURTS_API_TOKEN). All calls are server-to-server.
 */
@Injectable()
export class EcourtsIndiaProvider implements EcourtsProvider, OnModuleInit {
  private readonly logger = new Logger(EcourtsIndiaProvider.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('ECOURTS_API_BASE_URL') ??
      'https://webapi.ecourtsindia.com/api'
    ).replace(/\/+$/, '');
    this.token = this.config.get<string>('ECOURTS_API_TOKEN') ?? '';
  }

  onModuleInit(): void {
    if (!this.token) {
      this.logger.warn(
        'ECOURTS_API_TOKEN is not set — eCourts endpoints will fail until it is configured.',
      );
    }
  }

  async getCaseByCnr(cnr: string): Promise<EcourtsCaseDetail> {
    const env = await this.request<EcourtsApiEnvelope<EcourtsCaseDetail>>(
      'GET',
      `/partner/case/${encodeURIComponent(cnr)}`,
    );
    return env.data;
  }

  async search(params: EcourtsSearchParams): Promise<EcourtsSearchResult> {
    const qs = this.buildSearchQuery(params);
    const env = await this.request<EcourtsApiEnvelope<EcourtsSearchResult>>(
      'GET',
      `/partner/search?${qs.toString()}`,
    );
    return env.data;
  }

  async getCapabilities(): Promise<unknown> {
    const env = await this.request<EcourtsApiEnvelope<unknown>>(
      'GET',
      '/partner/search/capabilities',
    );
    return env.data;
  }

  async getEnums(): Promise<unknown> {
    const env = await this.request<EcourtsApiEnvelope<unknown>>(
      'GET',
      '/partner/enums',
    );
    return env.data;
  }

  async refreshCase(cnr: string): Promise<unknown> {
    return this.request<unknown>(
      'POST',
      `/partner/case/${encodeURIComponent(cnr)}/refresh`,
    );
  }

  private buildSearchQuery(params: EcourtsSearchParams): URLSearchParams {
    const qs = new URLSearchParams();
    if (params.query) qs.set('query', params.query);
    if (params.filingDateFrom) qs.set('filingDateFrom', params.filingDateFrom);
    if (params.filingDateTo) qs.set('filingDateTo', params.filingDateTo);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));

    // Repeatable multi-value params.
    const appendAll = (key: string, values?: string[]) =>
      values?.forEach((v) => v && qs.append(key, v));
    appendAll('advocates', params.advocates);
    appendAll('litigants', params.litigants);
    appendAll('courtCodes', params.courtCodes);
    appendAll('caseTypes', params.caseTypes);
    appendAll('caseStatuses', params.caseStatuses);
    appendAll('actsAndSections', params.actsAndSections);
    return qs;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      this.logger.error(
        `eCourts request failed: ${method} ${path}`,
        err as Error,
      );
      throw new ServiceUnavailableException('eCourts service is unreachable');
    }

    if (!res.ok) {
      throw this.mapError(res.status, method, path);
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new BadGatewayException('eCourts returned an invalid response');
    }
  }

  private mapError(
    status: number,
    method: string,
    path: string,
  ): HttpException {
    this.logger.warn(`eCourts ${status} on ${method} ${path}`);
    switch (status) {
      case 404:
        return new NotFoundException('Case not found on eCourts');
      case 401:
      case 403:
        return new ServiceUnavailableException(
          'eCourts credentials rejected — check ECOURTS_API_TOKEN',
        );
      case 429:
        return new ServiceUnavailableException(
          'eCourts rate limit reached — try again shortly',
        );
      default:
        return new BadGatewayException('eCourts request failed');
    }
  }
}
