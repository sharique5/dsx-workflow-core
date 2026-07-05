import {
  Controller, Get, Patch, Post,
  Headers, Body, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantService } from './tenant.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  /**
   * GET /api/v1/tenant/brand
   * Public — no auth required.
   */
  @Get('brand')
  getBrand(@Headers('x-tenant-domain') domain: string) {
    return this.tenantService.getBrandingByDomain(domain ?? '');
  }

  /**
   * PATCH /api/v1/tenant/brand
   * Admin only — updates visual branding fields (colours, tagline, external logoUrl).
   * Domain fields are NOT exposed here (ops-only).
   */
  @Patch('brand')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  updateBrand(
    @Body() dto: UpdateBrandingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantService.updateBranding(dto, user);
  }

  /**
   * POST /api/v1/tenant/brand/logo
   * Admin only — upload a logo image (JPEG/PNG/WebP/SVG, max 2 MB).
   * Stores in blob storage; returns updated branding config with fresh signed URL.
   */
  @Post('brand/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantService.uploadLogo(file, user);
  }
}
