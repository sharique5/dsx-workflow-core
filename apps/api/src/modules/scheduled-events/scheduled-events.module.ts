import { Module } from '@nestjs/common';
import { ScheduledEventsController } from './scheduled-events.controller';
import { ScheduledEventsService } from './scheduled-events.service';

@Module({
  controllers: [ScheduledEventsController],
  providers: [ScheduledEventsService],
})
export class ScheduledEventsModule {}
