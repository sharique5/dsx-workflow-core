import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

export interface BrandingConfig {
  firmName: string;
  logoUrl: string | null;
  primaryColor: string;
  tagline: string;
}

const PRACTIX_DEFAULT: BrandingConfig = {
  firmName: 'Practix',
  logoUrl: null,
  primaryColor: '#4f46e5',
  tagline: 'Legal workflow, simplified.',
};

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve branding config for a given hostname.
   * Checks webDomain and portalDomain on the Tenant table.
   * Falls back to Practix defaults if no tenant matches.
   */
  async getBrandingByDomain(domain: string): Promise<BrandingConfig> {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ webDomain: domain }, { portalDomain: domain }],
      },
      select: { name: true, brandingConfig: true },
    });

    if (!tenant) return PRACTIX_DEFAULT;

    const config = tenant.brandingConfig as Partial<BrandingConfig> | null;

    return {
      firmName: config?.firmName ?? tenant.name,
      logoUrl: config?.logoUrl ?? null,
      primaryColor: config?.primaryColor ?? PRACTIX_DEFAULT.primaryColor,
      tagline: config?.tagline ?? PRACTIX_DEFAULT.tagline,
    };
  }
}
