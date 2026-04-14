import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters/:matterId/audit')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  /** GET /api/v1/matters/:matterId/audit */
  @Get()
  findByMatter(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditLogsService.findByMatter(matterId, user);
  }
}
