import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { EmailModule } from '../../shared/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
