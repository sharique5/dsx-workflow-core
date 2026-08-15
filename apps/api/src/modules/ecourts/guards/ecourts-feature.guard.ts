import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';

interface IndustryConfig {
  features?: { ecourts?: boolean };
}

/**
 * Gates eCourts endpoints to legal tenants that have the feature switched on.
 * Enabled when tenant.industry === 'legal' AND industryConfig.features.ecourts === true.
 * Must run after JwtAuthGuard (relies on request.user).
 */
@Injectable()
export class EcourtsFeatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { industry: true, industryConfig: true },
    });

    const config = (tenant?.industryConfig ?? {}) as IndustryConfig;
    const enabled =
      tenant?.industry === 'legal' && config.features?.ecourts === true;

    if (!enabled) {
      throw new ForbiddenException(
        'eCourts integration is not enabled for this tenant',
      );
    }
    return true;
  }
}
