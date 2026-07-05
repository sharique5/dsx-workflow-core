import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { IStorageService } from '../../shared/storage/storage.interface';

const LOGO_FOLDER = 'tenant-logos';
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const LOGO_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const LOGO_URL_TTL_SECONDS = 24 * 60 * 60; // 24 h — frontend caches per session

export interface BrandingConfig {
  firmName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
}

const PRACTIX_DEFAULT: BrandingConfig = {
  firmName: 'Practix',
  logoUrl: null,
  primaryColor: '#4f46e5',
  secondaryColor: '#e0e7ff',
  tagline: 'Practix by Disionix — Intelligent Operations for Professional Firms',
};

/** Shape stored in DB — includes internal fields not exposed in API responses. */
interface StoredBrandingConfig {
  firmName?: string;
  logoUrl?: string | null;
  logoStorageKey?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    @Inject('STORAGE_SERVICE') private storage: IStorageService,
  ) {}

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

    const config = tenant.brandingConfig as StoredBrandingConfig | null;

    return {
      firmName:       config?.firmName       ?? tenant.name,
      logoUrl:        await this.resolveLogoUrl(config),
      primaryColor:   config?.primaryColor   ?? PRACTIX_DEFAULT.primaryColor,
      secondaryColor: config?.secondaryColor ?? PRACTIX_DEFAULT.secondaryColor,
      tagline:        config?.tagline        ?? PRACTIX_DEFAULT.tagline,
    };
  }

  /**
   * Update visual branding for the caller's own tenant.
   * Domain fields (webDomain, portalDomain) are intentionally excluded —
   * those are ops-only and must be changed via DB.
   */
  async updateBranding(
    dto: UpdateBrandingDto,
    user: AuthenticatedUser,
  ): Promise<BrandingConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, brandingConfig: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = (tenant.brandingConfig as StoredBrandingConfig) ?? {};

    // If logoUrl is explicitly being set to null, also clear any stored file key
    const logoStorageKey =
      dto.logoUrl === null ? null : existing.logoStorageKey ?? null;

    const merged: StoredBrandingConfig = {
      firmName:       dto.firmName       ?? existing.firmName       ?? tenant.name,
      logoUrl:        Object.prototype.hasOwnProperty.call(dto, 'logoUrl')
                        ? (dto.logoUrl ?? null)
                        : (existing.logoUrl ?? null),
      logoStorageKey,
      primaryColor:   dto.primaryColor   ?? existing.primaryColor   ?? PRACTIX_DEFAULT.primaryColor,
      secondaryColor: dto.secondaryColor ?? existing.secondaryColor ?? PRACTIX_DEFAULT.secondaryColor,
      tagline:        dto.tagline        ?? existing.tagline        ?? PRACTIX_DEFAULT.tagline,
    };

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { brandingConfig: merged as object },
    });

    return {
      firmName:       merged.firmName!,
      logoUrl:        await this.resolveLogoUrl(merged),
      primaryColor:   merged.primaryColor!,
      secondaryColor: merged.secondaryColor!,
      tagline:        merged.tagline!,
    };
  }

  /**
   * Upload a logo image, store it, and update brandingConfig.logoStorageKey.
   * Returns the full updated branding config (with a fresh signed URL).
   */
  async uploadLogo(
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<BrandingConfig> {
    if (!LOGO_ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Logo must be a JPEG, PNG, WebP, or SVG image.',
      );
    }
    if (file.size > LOGO_MAX_BYTES) {
      throw new BadRequestException('Logo must be 2 MB or smaller.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, brandingConfig: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = (tenant.brandingConfig as StoredBrandingConfig) ?? {};

    // Delete previous uploaded logo if one exists
    if (existing.logoStorageKey) {
      await this.storage.delete(existing.logoStorageKey).catch(() => null);
    }

    const { storageKey } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      LOGO_FOLDER,
    );

    const updated: StoredBrandingConfig = { ...existing, logoStorageKey: storageKey, logoUrl: null };

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { brandingConfig: updated as object },
    });

    return {
      firmName:       updated.firmName       ?? tenant.name,
      logoUrl:        await this.resolveLogoUrl(updated),
      primaryColor:   updated.primaryColor   ?? PRACTIX_DEFAULT.primaryColor,
      secondaryColor: updated.secondaryColor ?? PRACTIX_DEFAULT.secondaryColor,
      tagline:        updated.tagline        ?? PRACTIX_DEFAULT.tagline,
    };
  }

  /** Resolve a logo URL from stored config: signed URL > external URL > null. */
  private async resolveLogoUrl(config: StoredBrandingConfig | null): Promise<string | null> {
    if (config?.logoStorageKey) {
      return this.storage.getSignedUrl(config.logoStorageKey, LOGO_URL_TTL_SECONDS);
    }
    return config?.logoUrl ?? null;
  }
}
