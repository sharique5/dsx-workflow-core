import { Module } from '@nestjs/common';
import { ScheduledEventsController } from './scheduled-events.controller';
import { ScheduledEventsService } from './scheduled-events.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ScheduledEventsController],
  providers: [ScheduledEventsService],
})
export class ScheduledEventsModule {}
