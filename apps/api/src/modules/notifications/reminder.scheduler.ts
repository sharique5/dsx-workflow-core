import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(private notificationsService: NotificationsService) {}

  /** Runs every 5 minutes — checks for due reminders and sends them */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReminders() {
    this.logger.debug('Checking due reminders...');
    await this.notificationsService.processDueReminders();
  }
}
