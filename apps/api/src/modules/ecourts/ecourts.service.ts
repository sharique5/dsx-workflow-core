import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import {
  ECOURTS_PROVIDER,
  type EcourtsProvider,
} from './providers/ecourts-provider.interface';
import type { EcourtsCaseDetail } from './ecourts.types';
import { LinkCaseDto, SearchCasesDto } from './dto/ecourts.dto';

@Injectable()
export class EcourtsService {
  private readonly logger = new Logger(EcourtsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ECOURTS_PROVIDER) private readonly provider: EcourtsProvider,
  ) {}

  search(dto: SearchCasesDto) {
    return this.provider.search(dto);
  }

  getCapabilities() {
    return this.provider.getCapabilities();
  }

  getEnums() {
    return this.provider.getEnums();
  }

  /** Live lookup by CNR — does not persist. */
  lookupCase(cnr: string) {
    return this.provider.getCaseByCnr(cnr);
  }

  /** Fetch from eCourts and persist (or update) a tenant-scoped CourtCase. */
  async linkCase(user: AuthenticatedUser, dto: LinkCaseDto) {
    if (dto.matterId) {
      const matter = await this.prisma.matter.findFirst({
        where: { id: dto.matterId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!matter) {
        throw new NotFoundException('Matter not found');
      }
    }

    const detail = await this.provider.getCaseByCnr(dto.cnr);
    return this.upsertFromDetail(user.tenantId, user.id, detail, dto.matterId);
  }

  async listLinkedCases(user: AuthenticatedUser) {
    return this.prisma.courtCase.findMany({
      where: { tenantId: user.tenantId },
      include: { orders: true, matter: { select: { id: true, title: true } } },
      orderBy: { nextHearingDate: 'asc' },
    });
  }

  async getLinkedCase(user: AuthenticatedUser, id: string) {
    const courtCase = await this.prisma.courtCase.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { orders: true, matter: { select: { id: true, title: true } } },
    });
    if (!courtCase) {
      throw new NotFoundException('Linked case not found');
    }
    return courtCase;
  }

  /** The persisted eCourts case linked to a matter, or null if none. */
  getCaseByMatter(user: AuthenticatedUser, matterId: string) {
    return this.prisma.courtCase.findFirst({
      where: { tenantId: user.tenantId, matterId },
      include: { orders: { orderBy: { orderDate: 'desc' } } },
    });
  }

  /** Re-fetch a persisted case from eCourts and update the stored snapshot. */
  async refreshCase(user: AuthenticatedUser, id: string) {
    const existing = await this.getLinkedCase(user, id);
    await this.provider.refreshCase(existing.cnr).catch((err) => {
      // Refresh is best-effort — the queue may lag; we still pull latest.
      this.logger.warn(
        `refreshCase(${existing.cnr}) queue call failed: ${err}`,
      );
    });
    const detail = await this.provider.getCaseByCnr(existing.cnr);
    return this.upsertFromDetail(
      user.tenantId,
      existing.createdBy,
      detail,
      existing.matterId ?? undefined,
    );
  }

  /**
   * Upsert a CourtCase (+ its orders) from an eCourts case detail payload.
   * Shared by linkCase, refreshCase, and the sync scheduler.
   */
  async upsertFromDetail(
    tenantId: string,
    createdBy: string,
    detail: EcourtsCaseDetail,
    matterId?: string,
  ) {
    const c = detail.courtCaseData;
    const base = {
      tenantId,
      cnr: c.cnr,
      caseType: c.caseType ?? null,
      caseTypeRaw: c.caseTypeRaw ?? null,
      caseStatus: c.caseStatus ?? null,
      courtCode: c.cnrCourtCode ?? null,
      courtComplexCode: c.courtComplexCode ?? null,
      filingNumber: c.filingNumber ?? null,
      filingDate: parseDate(c.filingDate),
      registrationNumber: c.registrationNumber ?? null,
      registrationDate: parseDate(c.registrationDate),
      firstHearingDate: parseDate(c.firstHearingDate),
      nextHearingDate: parseDate(c.nextHearingDate),
      decisionDate: parseDate(c.decisionDate),
      petitioners: c.petitioners ?? [],
      respondents: c.respondents ?? [],
      petitionerAdvocates: c.petitionerAdvocates ?? [],
      respondentAdvocates: c.respondentAdvocates ?? [],
      judges: c.judges ?? [],
      orderCount: c.orderCount ?? 0,
      hearingCount: c.hearingCount ?? 0,
      judgmentCount: c.judgmentCount ?? 0,
      rawSnapshot: detail as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    } satisfies Prisma.CourtCaseUncheckedUpdateInput;

    const courtCase = await this.prisma.courtCase.upsert({
      where: { tenantId_cnr: { tenantId, cnr: c.cnr } },
      create: { ...base, createdBy, matterId: matterId ?? null },
      // Only (re)link a matter when one is supplied; never unlink on refresh.
      update: { ...base, ...(matterId ? { matterId } : {}) },
    });

    await this.syncOrders(courtCase.id, detail);

    return this.prisma.courtCase.findUniqueOrThrow({
      where: { id: courtCase.id },
      include: { orders: true, matter: { select: { id: true, title: true } } },
    });
  }

  private async syncOrders(courtCaseId: string, detail: EcourtsCaseDetail) {
    const orders = detail.courtCaseData.judgmentOrders ?? [];
    for (const o of orders) {
      const filename = o.orderUrl;
      if (!filename) continue;
      await this.prisma.caseOrder.upsert({
        where: { courtCaseId_filename: { courtCaseId, filename } },
        create: {
          courtCaseId,
          filename,
          orderType: o.orderType ?? null,
          orderDate: parseDate(o.orderDate),
        },
        update: {
          orderType: o.orderType ?? null,
          orderDate: parseDate(o.orderDate),
        },
      });
    }
  }
}

/** Parse an eCourts date string (YYYY-MM-DD or ISO) to a Date, or null. */
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
