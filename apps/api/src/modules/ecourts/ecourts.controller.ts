import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { EcourtsFeatureGuard } from './guards/ecourts-feature.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { EcourtsService } from './ecourts.service';
import { LinkCaseDto, SearchCasesDto } from './dto/ecourts.dto';

/** All routes require auth AND a legal tenant with the eCourts feature enabled. */
@Controller('ecourts')
@UseGuards(JwtAuthGuard, EcourtsFeatureGuard)
export class EcourtsController {
  constructor(private readonly ecourts: EcourtsService) {}

  /** GET /api/v1/ecourts/search */
  @Get('search')
  search(@Query() query: SearchCasesDto) {
    return this.ecourts.search(query);
  }

  /** GET /api/v1/ecourts/capabilities */
  @Get('capabilities')
  capabilities() {
    return this.ecourts.getCapabilities();
  }

  /** GET /api/v1/ecourts/enums */
  @Get('enums')
  enums() {
    return this.ecourts.getEnums();
  }

  /** GET /api/v1/ecourts/cases — tenant's persisted (linked) cases */
  @Get('cases')
  listLinked(@CurrentUser() user: AuthenticatedUser) {
    return this.ecourts.listLinkedCases(user);
  }

  /** GET /api/v1/ecourts/cases/:id — a persisted linked case */
  @Get('cases/:id')
  getLinked(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ecourts.getLinkedCase(user, id);
  }

  /** GET /api/v1/ecourts/matters/:matterId/case — linked case for a matter (or null) */
  @Get('matters/:matterId/case')
  getByMatter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matterId') matterId: string,
  ) {
    return this.ecourts.getCaseByMatter(user, matterId);
  }

  /** POST /api/v1/ecourts/cases/:id/refresh — re-pull from eCourts */
  @Post('cases/:id/refresh')
  refresh(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ecourts.refreshCase(user, id);
  }

  /** POST /api/v1/ecourts/cases/link — persist a case (optionally to a matter) */
  @Post('cases/link')
  link(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkCaseDto) {
    return this.ecourts.linkCase(user, dto);
  }

  /** GET /api/v1/ecourts/cnr/:cnr — live lookup (not persisted) */
  @Get('cnr/:cnr')
  lookup(@Param('cnr') cnr: string) {
    return this.ecourts.lookupCase(cnr);
  }
}
