import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { FeesService } from './fees.service';
import { CreateFeeDto, LogPaymentDto } from './dto/fee.dto';

@UseGuards(JwtAuthGuard)
@Controller('matters/:matterId/fees')
export class FeesController {
  constructor(private feesService: FeesService) {}

  @Get()
  findAll(
    @Param('matterId') matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feesService.findAll(matterId, user);
  }

  @Post()
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feesService.create(matterId, dto, user);
  }

  @Post(':feeId/payment')
  logPayment(
    @Param('matterId') matterId: string,
    @Param('feeId') feeId: string,
    @Body() dto: LogPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feesService.logPayment(matterId, feeId, dto, user);
  }
}
