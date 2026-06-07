/**
 * Hard reset script — truncates ALL data from the database.
 *
 * Use this before re-seeding in development/staging environments.
 * NEVER run against production.
 *
 * Usage:
 *   npm run db:reset          (from apps/api)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  console.error('[Reset] Refusing to run in production environment.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.warn('\n[Reset] ⚠️  Wiping ALL data from the database…\n');

  // Delete in dependency order (children before parents)
  const steps: { label: string; fn: () => Promise<{ count: number }> }[] = [
    { label: 'audit_logs',            fn: () => prisma.auditLog.deleteMany() },
    { label: 'notification_logs',     fn: () => prisma.notificationLog.deleteMany() },
    { label: 'reminders',             fn: () => prisma.reminder.deleteMany() },
    { label: 'messages',              fn: () => prisma.message.deleteMany() },
    { label: 'document_requests',     fn: () => prisma.documentRequest.deleteMany() },
    { label: 'documents',             fn: () => prisma.document.deleteMany() },
    { label: 'notes',                 fn: () => prisma.note.deleteMany() },
    { label: 'scheduled_events',      fn: () => prisma.scheduledEvent.deleteMany() },
    { label: 'fees',                  fn: () => prisma.fee.deleteMany() },
    { label: 'notification_templates',fn: () => prisma.notificationTemplate.deleteMany() },
    { label: 'matters',               fn: () => prisma.matter.deleteMany() },
    { label: 'users',                 fn: () => prisma.user.deleteMany() },
    { label: 'tenants',               fn: () => prisma.tenant.deleteMany() },
  ];

  for (const step of steps) {
    const result = await step.fn();
    console.warn(`  Deleted ${String(result.count).padStart(4)} rows from ${step.label}`);
  }

  console.warn('\n[Reset] Done. Run npm run db:seed to provision a fresh tenant.\n');
}

main()
  .catch((e) => {
    console.error('[Reset] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
