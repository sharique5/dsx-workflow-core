import { Controller, Get, Headers } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  /**
   * GET /api/v1/tenant/brand
   *
   * Public endpoint — no auth required.
   * Frontend calls this on boot with X-Tenant-Domain: window.location.hostname
   * to retrieve the correct firm name, logo, and color scheme.
   */
  @Get('brand')
  getBrand(@Headers('x-tenant-domain') domain: string) {
    // Fall back to empty string → service returns Practix defaults
    return this.tenantService.getBrandingByDomain(domain ?? '');
  }
}
