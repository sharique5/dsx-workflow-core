import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ScheduledEventsService } from './scheduled-events.service';
import { CreateScheduledEventDto, UpdateScheduledEventDto } from './dto/scheduled-events.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters/:matterId/events')
@UseGuards(JwtAuthGuard)
export class ScheduledEventsController {
  constructor(private scheduledEventsService: ScheduledEventsService) {}

  /** GET /api/v1/matters/:matterId/events */
  @Get()
  findAll(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduledEventsService.findAll(matterId, user);
  }

  /** POST /api/v1/matters/:matterId/events */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateScheduledEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduledEventsService.create(matterId, dto, user);
  }

  /** PATCH /api/v1/matters/:matterId/events/:id */
  @Patch(':id')
  update(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduledEventsService.update(matterId, id, dto, user);
  }

  /** DELETE /api/v1/matters/:matterId/events/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduledEventsService.remove(matterId, id, user);
  }
}
