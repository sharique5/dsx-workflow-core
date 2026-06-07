import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiLawyerService } from './ai-lawyer.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [AiController],
  providers: [AiService, AiLawyerService],
})
export class AiModule {}
