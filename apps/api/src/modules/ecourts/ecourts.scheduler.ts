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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const staleCnrs: string[] = [];
    for (const c of cases) {
      try {
        const detail = await this.ecourts.lookupCase(c.cnr);
        // upsertFromDetail also materializes the next hearing onto the calendar.
        const updated = await this.ecourts.upsertFromDetail(
          c.tenantId,
          c.createdBy,
          detail,
          c.matterId ?? undefined,
        );
        synced++;
        // Active case with no upcoming hearing => provider cache is likely stale.
        if (
          !updated.nextHearingDate ||
          updated.nextHearingDate < startOfToday
        ) {
          staleCnrs.push(c.cnr);
        }
      } catch (err) {
        this.logger.warn(`Sync failed for CNR ${c.cnr}: ${err}`);
      }
      await this.delay(this.requestDelayMs);
    }

    // Queue re-scrapes for stale cases so the next run pulls fresh data.
    if (staleCnrs.length > 0) {
      this.logger.log(
        `Queuing re-scrape for ${staleCnrs.length} stale case(s).`,
      );
      await this.ecourts.queueBulkRefresh(staleCnrs);
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
