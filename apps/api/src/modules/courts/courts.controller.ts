import { Controller, Get, Query } from '@nestjs/common';
import { CourtsService } from './courts.service';

/** Public reference data — no auth required */
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  /** GET /api/v1/courts/states */
  @Get('states')
  getStates() {
    return this.courtsService.getStates();
  }

  /** GET /api/v1/courts/districts?stateId=2 */
  @Get('districts')
  getDistricts(@Query('stateId') stateId: string) {
    return this.courtsService.getDistricts(stateId ?? '');
  }

  /** GET /api/v1/courts/complexes?stateId=2&districtId=5 */
  @Get('complexes')
  getComplexes(
    @Query('stateId') stateId: string,
    @Query('districtId') districtId: string,
  ) {
    return this.courtsService.getComplexes(stateId ?? '', districtId ?? '');
  }
}
