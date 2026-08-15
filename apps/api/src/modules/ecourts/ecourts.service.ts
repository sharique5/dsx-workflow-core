import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import {
  ECOURTS_PROVIDER,
  type EcourtsProvider,
} from './providers/ecourts-provider.interface';
import type { EcourtsCaseData, EcourtsCaseDetail } from './ecourts.types';
import { LinkCaseDto, SearchCasesDto } from './dto/ecourts.dto';

interface StatusEntry {
  key: string;
  isTerminal?: boolean;
}

@Injectable()
export class EcourtsService {
  private readonly logger = new Logger(EcourtsService.name);
  private caseTypesCache: {
    at: number;
    data: Array<{ code: string; description: string }>;
  } | null = null;

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

  /** The canonical eCourts case-type list (code → description), cached in-memory. */
  async getCaseTypes(): Promise<Array<{ code: string; description: string }>> {
    const ttl = 24 * 60 * 60 * 1000;
    if (this.caseTypesCache && Date.now() - this.caseTypesCache.at < ttl) {
      return this.caseTypesCache.data;
    }
    const enums = (await this.provider.getEnums()) as {
      enums?: { caseType?: Array<{ code: string; description: string }> };
    };
    const data = enums?.enums?.caseType ?? [];
    this.caseTypesCache = { at: Date.now(), data };
    return data;
  }

  /** Live lookup by CNR — does not persist. */
  lookupCase(cnr: string) {
    return this.provider.getCaseByCnr(cnr);
  }

  /** Queue a scrape for a CNR that isn't in eCourts yet (returns 202 QUEUED). */
  queueRefreshByCnr(cnr: string) {
    if (!/^[A-Za-z0-9]{16}$/.test(cnr)) {
      throw new BadRequestException('Invalid CNR');
    }
    return this.provider.refreshCase(cnr);
  }

  /** Queue re-scrapes for many CNRs (chunked to the provider's 50-per-call limit). */
  async queueBulkRefresh(cnrs: string[]): Promise<void> {
    const unique = [
      ...new Set(cnrs.filter((c) => /^[A-Za-z0-9]{16}$/.test(c))),
    ];
    for (let i = 0; i < unique.length; i += 50) {
      await this.provider
        .bulkRefresh(unique.slice(i, i + 50))
        .catch((err) => this.logger.warn(`bulkRefresh failed: ${err}`));
    }
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
    const linked = await this.upsertFromDetail(
      user.tenantId,
      user.id,
      detail,
      dto.matterId,
    );
    // Kick off a background re-scrape so a stale first snapshot self-freshens (~10 min).
    void this.provider
      .refreshCase(dto.cnr)
      .catch((err) =>
        this.logger.warn(`link re-scrape queue failed for ${dto.cnr}: ${err}`),
      );
    return linked;
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

  /** Stream an order PDF for a persisted case — only known order filenames allowed. */
  async getOrderPdf(user: AuthenticatedUser, id: string, filename: string) {
    const courtCase = await this.prisma.courtCase.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { orders: { select: { filename: true } } },
    });
    if (!courtCase) {
      throw new NotFoundException('Linked case not found');
    }
    const allowed = courtCase.orders.some((o) => o.filename === filename);
    if (!allowed) {
      throw new NotFoundException('Order not found for this case');
    }
    return this.provider.getOrderPdf(courtCase.cnr, filename);
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

    // Materialize eCourts hearings (past history + upcoming) into the Hearings tab.
    if (courtCase.matterId) {
      await this.syncHearings(
        tenantId,
        courtCase.matterId,
        courtCase.createdBy,
        detail,
        base.nextHearingDate,
      );
      await this.maybeCloseDisposedMatter(tenantId, courtCase.matterId, c);
    }

    return this.prisma.courtCase.findUniqueOrThrow({
      where: { id: courtCase.id },
      include: { orders: true, matter: { select: { id: true, title: true } } },
    });
  }

  /** Materialize eCourts hearings (history + next) into ScheduledEvents (idempotent). */
  private async syncHearings(
    tenantId: string,
    matterId: string,
    createdBy: string,
    detail: EcourtsCaseDetail,
    nextHearing: Date | null,
  ): Promise<void> {
    const existing = await this.prisma.scheduledEvent.findMany({
      where: { matterId },
      select: { scheduledAt: true },
    });
    const seen = new Set(existing.map((e) => e.scheduledAt.toISOString()));

    const rows: Prisma.ScheduledEventCreateManyInput[] = [];
    const add = (
      d: Date | null,
      outcome?: string | null,
      judge?: string | null,
    ) => {
      if (!d) return;
      const key = d.toISOString();
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        tenantId,
        matterId,
        createdBy,
        scheduledAt: d,
        outcomeNotes: outcome?.trim() || null,
        judgeNotes: judge?.trim() || null,
      });
    };

    const meaningful = (s?: string | null) => {
      const t = (s ?? '').trim();
      return t && t !== '--' ? t : '';
    };

    // Prefer businessOnDateEntries (has the daily proceeding text); fall back to history.
    const entries = detail.courtCaseData.businessOnDateEntries ?? [];
    if (entries.length > 0) {
      for (const e of entries) {
        const outcome = meaningful(e.business) || meaningful(e.nextPurpose);
        add(parseDate(e.date), outcome, e.courtOf);
      }
    } else {
      for (const h of detail.courtCaseData.historyOfCaseHearings ?? []) {
        add(
          parseDate(h.businessOnDate ?? h.hearingDate),
          h.purposeOfListing,
          h.judge,
        );
      }
    }
    add(nextHearing); // upcoming hearing, if not already covered by history

    if (rows.length > 0) {
      await this.prisma.scheduledEvent.createMany({ data: rows });
    }
  }

  /**
   * Auto-close a linked matter when eCourts reports the case as disposed.
   * Only transitions into a terminal status — never overrides a manual workflow status.
   */
  private async maybeCloseDisposedMatter(
    tenantId: string,
    matterId: string,
    c: EcourtsCaseData,
  ): Promise<void> {
    const disposed =
      (c.caseStatus ?? '').toUpperCase() === 'DISPOSED' ||
      Boolean(parseDate(c.decisionDate)) ||
      Boolean((c.disposalType ?? '').trim());
    if (!disposed) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industryConfig: true },
    });
    const statuses =
      (tenant?.industryConfig as { statuses?: StatusEntry[] })?.statuses ?? [];
    const closedKey =
      statuses.find((s) => s.key === 'closed')?.key ??
      statuses.find((s) => s.isTerminal)?.key;
    if (!closedKey) return;

    const matter = await this.prisma.matter.findFirst({
      where: { id: matterId, tenantId },
      select: { statusKey: true },
    });
    if (!matter) return;
    const current = statuses.find((s) => s.key === matter.statusKey);
    if (current?.isTerminal) return; // already terminal — respect it

    await this.prisma.matter.update({
      where: { id: matterId },
      data: { statusKey: closedKey },
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
