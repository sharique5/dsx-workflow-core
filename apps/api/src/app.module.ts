import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { EmailModule } from './shared/email/email.module';
import { WhatsAppModule } from './shared/whatsapp/whatsapp.module';
import { SmsModule } from './shared/sms/sms.module';
import { StorageModule } from './shared/storage/storage.module';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { MattersModule } from './modules/matters/matters.module';
import { ScheduledEventsModule } from './modules/scheduled-events/scheduled-events.module';
import { NotesModule } from './modules/notes/notes.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { StaffModule } from './modules/staff/staff.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DocumentRequestsModule } from './modules/document-requests/document-requests.module';
import { FeesModule } from './modules/fees/fees.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CourtsModule } from './modules/courts/courts.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    // Configuration — loads .env automatically
    ConfigModule.forRoot({ isGlobal: true }),

    // Shared infrastructure (all global)
    DatabaseModule,
    RedisModule,
    EmailModule,
    WhatsAppModule,
    SmsModule,
    StorageModule,

    // Feature modules
    AuthModule,
    MattersModule,
    ScheduledEventsModule,
    NotesModule,
    AuditLogsModule,
    StaffModule,
    ClientsModule,
    DocumentRequestsModule,
    FeesModule,
    DocumentsModule,
    NotificationsModule,
    CourtsModule,
    MessagesModule,
    // Phase 3+ modules will be added here:
    // DocumentsModule,
    // FeesModule (already added),
    // NotificationsModule,
    // UsersModule,
  ],
  providers: [
    // Auto-logs all POST/PATCH/DELETE mutations globally
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
