import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { EmailModule } from './shared/email/email.module';
import { StorageModule } from './shared/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { MattersModule } from './modules/matters/matters.module';
import { ScheduledEventsModule } from './modules/scheduled-events/scheduled-events.module';
import { NotesModule } from './modules/notes/notes.module';

@Module({
  imports: [
    // Configuration — loads .env automatically
    ConfigModule.forRoot({ isGlobal: true }),

    // Shared infrastructure (all global)
    DatabaseModule,
    RedisModule,
    EmailModule,
    StorageModule,

    // Feature modules
    AuthModule,
    MattersModule,
    ScheduledEventsModule,
    NotesModule,
    // Phase 2+ modules will be added here:
    // NotesModule,
    // DocumentsModule,
    // DocumentRequestsModule,
    // FeesModule,
    // NotificationsModule,
    // AuditModule,
    // UsersModule,
  ],
})
export class AppModule {}
