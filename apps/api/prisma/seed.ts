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
const TENANT_NAME    = process.env.SEED_FIRM_NAME;
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME;
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PHONE    = process.env.SEED_ADMIN_PHONE    ?? null;
const WEB_DOMAIN     = process.env.SEED_WEB_DOMAIN     ?? null; // e.g. team.nairandassociates.com
const PORTAL_DOMAIN  = process.env.SEED_PORTAL_DOMAIN  ?? null; // e.g. portal.nairandassociates.com
const PRIMARY_COLOR  = process.env.SEED_PRIMARY_COLOR  ?? '#4f46e5';
const LOGO_URL       = process.env.SEED_LOGO_URL       ?? null;
const TAGLINE        = process.env.SEED_TAGLINE        ?? 'Legal workflow, simplified.'

async function main() {
  if (!TENANT_NAME || !ADMIN_NAME || !ADMIN_EMAIL) {
    console.error('[Seed] Missing required env vars: SEED_FIRM_NAME, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL');
    process.exit(1);
  }

  // Guard: prevent duplicate tenant with same name
  const existing = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
  if (existing) {
    console.warn(`[Seed] Tenant "${TENANT_NAME}" already exists (id: ${existing.id}) — skipping.`);
  } else {
    const tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: TENANT_NAME,
        industry: 'legal',
        industryConfig: LEGAL_INDUSTRY_CONFIG,
        brandingConfig: {
          firmName: TENANT_NAME,
          logoUrl: LOGO_URL,
          primaryColor: PRIMARY_COLOR,
          tagline: TAGLINE,
        },
        webDomain: WEB_DOMAIN,
        portalDomain: PORTAL_DOMAIN,
      },
    });

    console.warn(`[Seed] Tenant created: ${tenant.id}`);

    const admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: ADMIN_NAME!,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        role: UserRole.admin,
        isActive: true,
        portalInviteStatus: PortalInviteStatus.not_invited,
      },
    });

    console.warn(`[Seed] Admin user created: ${admin.email ?? admin.phone}`);

    // ─── System notification templates ─────────────────────────────────────
    const existingTemplates = await prisma.notificationTemplate.count({ where: { isSystem: true } });
    if (existingTemplates === 0) {
      await prisma.notificationTemplate.createMany({
        data: [
          {
            id: randomUUID(),
            tenantId: null,
            triggerType: 'hearing_added',
            channel: 'email',
            templateBody:
              'Hi {{recipient_name}}, a new hearing has been scheduled for your case "{{matter_title}}" ({{matter_ref}}). Please check your portal for details.',
            isSystem: true,
          },
          {
            id: randomUUID(),
            tenantId: null,
            triggerType: 'status_change',
            channel: 'email',
            templateBody:
              'Hi {{recipient_name}}, the status of your case "{{matter_title}}" ({{matter_ref}}) has been updated. Please check your portal for the latest details.',
            isSystem: true,
          },
          {
            id: randomUUID(),
            tenantId: null,
            triggerType: 'fee_due',
            channel: 'email',
            templateBody:
              'Hi {{recipient_name}}, a fee payment is due for your case "{{matter_title}}" ({{matter_ref}}). Please contact your legal team for payment details.',
            isSystem: true,
          },
          {
            id: randomUUID(),
            tenantId: null,
            triggerType: 'reminder',
            channel: 'email',
            templateBody:
              'Hi {{recipient_name}}, this is a reminder about your case "{{matter_title}}" ({{matter_ref}}). Please check your portal for upcoming hearing dates.',
            isSystem: true,
          },
          {
            id: randomUUID(),
            tenantId: null,
            triggerType: 'custom',
            channel: 'email',
            templateBody:
              'Hi {{recipient_name}}, you have a message regarding your case "{{matter_title}}" ({{matter_ref}}).',
            isSystem: true,
          },
        ],
      });
      console.warn('[Seed] System notification templates seeded.');
    } else {
      console.warn('[Seed] System notification templates already exist — skipping.');
    }

    console.warn('\n[Seed] Done. Login with:');
    console.warn(`  POST /api/v1/auth/request-otp`);
    console.warn(`  { "identifier": "${ADMIN_EMAIL}" }\n`);
  }

  // ─── Practix demo tenant — always runs, idempotent ────────────────────
  await seedPractixDemo();
}

async function seedPractixDemo() {
  const existing = await prisma.tenant.findFirst({ where: { name: 'Practix' } });
  if (existing) {
    console.warn('[Seed] Practix demo tenant already exists — skipping.');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      id: randomUUID(),
      name: 'Practix',
      industry: 'legal',
      industryConfig: LEGAL_INDUSTRY_CONFIG,
      brandingConfig: {
        firmName: 'Practix',
        logoUrl: null,
        primaryColor: '#4f46e5',
        tagline: 'Practix by Disionix — Intelligent Operations for Professional Firms',
      },
      webDomain: 'practix-ops.disionix.com',
      portalDomain: 'practix.disionix.com',
    },
  });

  await prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: 'Practix Admin',
      email: 'contact@disionix.com',
      role: UserRole.admin,
      isActive: true,
      portalInviteStatus: PortalInviteStatus.not_invited,
    },
  });

  console.warn(`[Seed] Practix demo tenant created (id: ${tenant.id})`);
  console.warn(`[Seed] Demo login: { "identifier": "contact@disionix.com" }`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
