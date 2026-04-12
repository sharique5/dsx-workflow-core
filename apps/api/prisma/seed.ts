/**
 * Seed script — provisions the first lawyer (admin) account for a tenant.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register prisma/seed.ts
 *
 * Or via package.json script:
 *   npm run db:seed
 */

import { PrismaClient, UserRole, PortalInviteStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const LEGAL_INDUSTRY_CONFIG = {
  matter_label: 'Case',
  matter_plural: 'Cases',
  scheduled_event_label: 'Hearing',
  participant_label: 'Client',
  metadata_fields: { judge: 'Judge', court: 'Court' },
  statuses: [
    { key: 'filed', label: 'Filed', isTerminal: false },
    { key: 'in_progress', label: 'In Progress', isTerminal: false },
    { key: 'hearing_scheduled', label: 'Hearing Scheduled', isTerminal: false },
    { key: 'adjourned', label: 'Adjourned', isTerminal: false },
    { key: 'closed', label: 'Closed', isTerminal: true },
  ],
};

// ─── Configure these before running ────────────────────────────────────────
const TENANT_NAME = process.env.SEED_FIRM_NAME;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? null;

async function main() {
  if (!TENANT_NAME || !ADMIN_NAME || !ADMIN_EMAIL) {
    console.error('[Seed] Missing required env vars: SEED_FIRM_NAME, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL');
    process.exit(1);
  }

  // Guard: prevent duplicate tenant with same name
  const existing = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
  if (existing) {
    console.warn(`[Seed] Tenant "${TENANT_NAME}" already exists (id: ${existing.id}). Aborting.`);
    process.exit(0);
  }

  console.warn(`\n[Seed] Provisioning tenant: ${TENANT_NAME}`);

  const tenant = await prisma.tenant.create({
    data: {
      id: randomUUID(),
      name: TENANT_NAME,
      industry: 'legal',
      industryConfig: LEGAL_INDUSTRY_CONFIG,
    },
  });

  console.warn(`[Seed] Tenant created: ${tenant.id}`);

  const admin = await prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      role: UserRole.admin,
      isActive: true,
      portalInviteStatus: PortalInviteStatus.not_invited,
    },
  });

  console.warn(`[Seed] Admin user created: ${admin.email ?? admin.phone}`);
  console.warn('\n[Seed] Done. Login with:');
  console.warn(`  POST /api/v1/auth/request-otp`);
  console.warn(`  { "identifier": "${ADMIN_EMAIL}" }\n`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
