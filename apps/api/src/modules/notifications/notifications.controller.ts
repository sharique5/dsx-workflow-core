import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto, CreateReminderDto } from './dto/notifications.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /** GET /api/v1/notifications/templates */
  @Get('templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listTemplates(user);
  }

  /** POST /api/v1/notifications/send */
  @Post('send')
  send(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.send(dto, user);
  }

  /** GET /api/v1/notifications/logs?matterId=... */
  @Get('logs')
  listLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('matterId') matterId?: string,
  ) {
    return this.notificationsService.listLogs(user, matterId);
  }

  /** GET /api/v1/notifications/reminders/:matterId */
  @Get('reminders/:matterId')
  listReminders(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.listReminders(matterId, user);
  }

  /** POST /api/v1/notifications/reminders/:matterId */
  @Post('reminders/:matterId')
  createReminder(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateReminderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.createReminder(matterId, dto, user);
  }

  /** DELETE /api/v1/notifications/reminders/:matterId/:reminderId */
  @Delete('reminders/:matterId/:reminderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteReminder(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.deleteReminder(reminderId, user);
  }
}
