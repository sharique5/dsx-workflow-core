import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ReminderScheduler } from './reminder.scheduler';
import { EmailModule } from '../../shared/email/email.module';

@Module({
  imports: [ScheduleModule.forRoot(), EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ReminderScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
