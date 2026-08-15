import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/database/prisma.service';
import { EcourtsService } from './ecourts.service';

interface IndustryConfig {
  features?: { ecourts?: boolean };
}

/**
 * Daily refresh of persisted court cases for enabled legal tenants:
 * pulls the latest case snapshot + orders and, for cases linked to a matter,
 * materializes the next hearing as a ScheduledEvent. Runs sequentially with a
 * small delay to respect the provider rate limits (100/min).
 */
@Injectable()
export class EcourtsSyncScheduler {
  private readonly logger = new Logger(EcourtsSyncScheduler.name);
  private readonly requestDelayMs = 750;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ecourts: EcourtsService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'ecourts-daily-sync' })
  async runDailySync(): Promise<void> {
    if (!this.config.get<string>('ECOURTS_API_TOKEN')) return;
    if (this.running) {
      this.logger.warn('Sync already in progress — skipping this run.');
      return;
    }
    this.running = true;
    try {
      await this.syncEnabledTenants();
    } finally {
      this.running = false;
    }
  }

  private async syncEnabledTenants(): Promise<void> {
    const tenantIds = await this.enabledTenantIds();
    if (tenantIds.length === 0) return;

    // Only active cases (not yet decided) to conserve API quota.
    const cases = await this.prisma.courtCase.findMany({
      where: { tenantId: { in: tenantIds }, decisionDate: null },
      select: {
        id: true,
        cnr: true,
        tenantId: true,
        matterId: true,
        createdBy: true,
      },
    });

    this.logger.log(
      `eCourts sync: ${cases.length} active case(s) across ${tenantIds.length} tenant(s).`,
    );

    let synced = 0;
    for (const c of cases) {
      try {
        const detail = await this.ecourts.lookupCase(c.cnr);
        const updated = await this.ecourts.upsertFromDetail(
          c.tenantId,
          c.createdBy,
          detail,
          c.matterId ?? undefined,
        );
        if (c.matterId && updated.nextHearingDate) {
          await this.ensureHearingEvent(
            c.tenantId,
            c.matterId,
            c.createdBy,
            updated.nextHearingDate,
          );
        }
        synced++;
      } catch (err) {
        this.logger.warn(`Sync failed for CNR ${c.cnr}: ${err}`);
      }
      await this.delay(this.requestDelayMs);
    }
    this.logger.log(
      `eCourts sync complete: ${synced}/${cases.length} updated.`,
    );
  }

  private async enabledTenantIds(): Promise<string[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { industry: 'legal' },
      select: { id: true, industryConfig: true },
    });
    return tenants
      .filter(
        (t) => (t.industryConfig as IndustryConfig)?.features?.ecourts === true,
      )
      .map((t) => t.id);
  }

  /** Create a ScheduledEvent for the next hearing if one doesn't already exist. */
  private async ensureHearingEvent(
    tenantId: string,
    matterId: string,
    createdBy: string,
    scheduledAt: Date,
  ): Promise<void> {
    const existing = await this.prisma.scheduledEvent.findFirst({
      where: { tenantId, matterId, scheduledAt },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.scheduledEvent.create({
      data: { tenantId, matterId, scheduledAt, createdBy },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
