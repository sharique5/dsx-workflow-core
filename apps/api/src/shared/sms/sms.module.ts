import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [WhatsAppModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
