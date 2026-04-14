import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/staff.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private staffService: StaffService) {}

  /** GET /api/v1/staff */
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.staffService.findAll(user);
  }

  /** POST /api/v1/staff */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    return this.staffService.create(dto, user);
  }

  /** PATCH /api/v1/staff/:id/deactivate */
  @Patch(':id/deactivate')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.staffService.deactivate(id, user);
  }

  /** PATCH /api/v1/staff/:id/reactivate */
  @Patch(':id/reactivate')
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.staffService.reactivate(id, user);
  }
}
