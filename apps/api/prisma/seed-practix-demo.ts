/**
 * Practix demo data seed — adds realistic Indian law firm data
 * to the Practix tenant for demo / testing purposes.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register prisma/seed-practix-demo.ts
 *
 * Safe to run multiple times — idempotent (checks before inserting).
 */

import { PrismaClient, UserRole, PortalInviteStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { name: 'Practix' } });
  if (!tenant) {
    console.error('[Demo Seed] Practix tenant not found. Run db:seed first.');
    process.exit(1);
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: UserRole.admin },
  });
  if (!adminUser) {
    console.error('[Demo Seed] Practix admin user not found.');
    process.exit(1);
  }

  console.log(`[Demo Seed] Seeding demo data into tenant: ${tenant.id}`);

  // ── Staff ────────────────────────────────────────────────────────────────

  const staffEmail = 'priya.kapoor@practix-demo.in';
  let staff = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: staffEmail } });
  if (!staff) {
    staff = await prisma.user.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: 'Priya Kapoor',
        email: staffEmail,
        role: UserRole.staff,
        isActive: true,
        portalInviteStatus: PortalInviteStatus.not_invited,
      },
    });
    console.log('[Demo Seed] Created staff: Priya Kapoor');
  } else {
    console.log('[Demo Seed] Staff Priya Kapoor already exists — skipping.');
  }

  // ── Clients ───────────────────────────────────────────────────────────────

  const clientsData = [
    { name: 'Rajesh Kumar Verma', email: 'rajesh.verma@gmail.com',       phone: null },
    { name: 'Sunita Pramod Patel', email: 'sunita.patel@outlook.com',    phone: null },
    { name: 'Abdul Farooq Khan',   email: 'farooq.khan@gmail.com',       phone: null },
  ];

  const clients: Record<string, typeof adminUser> = {};
  for (const c of clientsData) {
    let client = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: c.email } });
    if (!client) {
      client = await prisma.user.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: UserRole.client,
          isActive: true,
          portalInviteStatus: PortalInviteStatus.not_invited,
        },
      });
      console.log(`[Demo Seed] Created client: ${c.name}`);
    } else {
      console.log(`[Demo Seed] Client ${c.name} already exists — skipping.`);
    }
    clients[c.name] = client;
  }

  const verma   = clients['Rajesh Kumar Verma'];
  const patel   = clients['Sunita Pramod Patel'];
  const farooq  = clients['Abdul Farooq Khan'];

  // ── Matters (Cases) ───────────────────────────────────────────────────────

  const mattersData = [
    {
      internalRef: 'PX-2024-001',
      externalRef: 'CRA/1234/2024',
      title: 'Verma vs State of Maharashtra — Criminal Appeal',
      participantId: verma.id,
      assignedToId: adminUser.id,
      statusKey: 'in_progress',
      metadata: { judge: 'Hon. Justice R.K. Sharma', court: 'Bombay High Court' },
    },
    {
      internalRef: 'PX-2023-002',
      externalRef: 'CS/5678/2023',
      title: 'Patel vs Patel — Property Partition Suit',
      participantId: patel.id,
      assignedToId: staff.id,
      statusKey: 'hearing_scheduled',
      metadata: { judge: 'Civil Judge Sr. Division', court: 'City Civil Court, Mumbai' },
    },
    {
      internalRef: 'PX-2024-003',
      externalRef: 'IT/432/2024',
      title: 'Khan vs MegaTech Solutions — Wrongful Termination',
      participantId: farooq.id,
      assignedToId: adminUser.id,
      statusKey: 'filed',
      metadata: { judge: '', court: 'Industrial Tribunal, Mumbai' },
    },
    {
      internalRef: 'PX-2024-004',
      externalRef: 'SC/891/2024',
      title: 'Verma Estate — Succession Certificate Application',
      participantId: verma.id,
      assignedToId: staff.id,
      statusKey: 'in_progress',
      metadata: { judge: 'District Judge', court: 'District Court, Pune' },
    },
    {
      internalRef: 'PX-2022-005',
      externalRef: 'RCS/221/2022',
      title: 'Farooq vs Union Bank — Loan Recovery Dispute',
      participantId: farooq.id,
      assignedToId: adminUser.id,
      statusKey: 'closed',
      metadata: { judge: 'Hon. Justice V.S. Rao', court: 'Debt Recovery Tribunal, Mumbai' },
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matters: any[] = [];
  for (const m of mattersData) {
    let matter = await prisma.matter.findFirst({ where: { tenantId: tenant.id, internalRef: m.internalRef } });
    if (!matter) {
      matter = await prisma.matter.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          internalRef: m.internalRef,
          externalRef: m.externalRef,
          title: m.title,
          participantId: m.participantId,
          assignedToId: m.assignedToId,
          statusKey: m.statusKey,
          metadata: m.metadata,
          createdBy: adminUser.id,
          createdAt: daysAgo(Math.floor(Math.random() * 120) + 30),
        },
      });
      console.log(`[Demo Seed] Created matter: ${m.internalRef}`);
    } else {
      console.log(`[Demo Seed] Matter ${m.internalRef} already exists — skipping.`);
    }
    matters.push(matter);
  }

  const [caseVerma, casePatel, caseFarooq, caseEstate, caseClosed] = matters;

  // ── Scheduled Events (Hearings) ───────────────────────────────────────────

  const hearingsData = [
    // Case 1 — Verma Criminal Appeal
    {
      matterId: caseVerma.id,
      scheduledAt: daysAgo(45),
      outcomeNotes: 'Arguments heard. Next date for rejoinder.',
      judgeNotes: 'Prosecution to file additional documents by next date.',
      lawyerNotes: 'Strong points raised on IPC 420 elements. Opposing counsel unprepared.',
    },
    {
      matterId: caseVerma.id,
      scheduledAt: daysAgo(15),
      outcomeNotes: 'Rejoinder filed. Judgment reserved.',
      judgeNotes: 'Order to be pronounced on next date.',
      lawyerNotes: 'Very positive — judge asked pointed questions to prosecution.',
    },
    {
      matterId: caseVerma.id,
      scheduledAt: daysFromNow(18),
      outcomeNotes: null,
      judgeNotes: null,
      lawyerNotes: 'Judgment date. Client to be present.',
    },
    // Case 2 — Patel Property
    {
      matterId: casePatel.id,
      scheduledAt: daysAgo(60),
      outcomeNotes: 'Plaint admitted. Summons issued to defendants.',
      judgeNotes: 'Case admitted for regular hearing.',
      lawyerNotes: 'Smooth admission. All documents in order.',
    },
    {
      matterId: casePatel.id,
      scheduledAt: daysFromNow(7),
      outcomeNotes: null,
      judgeNotes: null,
      lawyerNotes: 'First hearing after defendants appear. Prepare for written statement.',
    },
    // Case 3 — Khan Labour
    {
      matterId: caseFarooq.id,
      scheduledAt: daysFromNow(25),
      outcomeNotes: null,
      judgeNotes: null,
      lawyerNotes: 'First hearing. File written submissions before date.',
    },
    // Case 4 — Succession
    {
      matterId: caseEstate.id,
      scheduledAt: daysAgo(20),
      outcomeNotes: 'Notice issued to all interested parties. Publication ordered.',
      judgeNotes: 'Objection period: 30 days from newspaper publication.',
      lawyerNotes: 'Newspaper publication done. Awaiting objection period to expire.',
    },
    {
      matterId: caseEstate.id,
      scheduledAt: daysFromNow(12),
      outcomeNotes: null,
      judgeNotes: null,
      lawyerNotes: 'Objection period expired. Apply for certificate if no objections.',
    },
  ];

  for (const h of hearingsData) {
    const existing = await prisma.scheduledEvent.findFirst({
      where: { matterId: h.matterId, scheduledAt: h.scheduledAt },
    });
    if (!existing) {
      await prisma.scheduledEvent.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          matterId: h.matterId,
          scheduledAt: h.scheduledAt,
          outcomeNotes: h.outcomeNotes,
          judgeNotes: h.judgeNotes,
          lawyerNotes: h.lawyerNotes,
          createdBy: adminUser.id,
        },
      });
    }
  }
  console.log('[Demo Seed] Hearings seeded.');

  // ── Notes ─────────────────────────────────────────────────────────────────

  const notesData = [
    {
      matterId: caseVerma.id,
      content: 'Client confirmed alibi witnesses are willing to testify. Need to file witness list by next date.',
      isPublished: false,
    },
    {
      matterId: caseVerma.id,
      content: 'Judgment is expected to be in our favour based on the weakness of the prosecution evidence. Client has been informed.',
      isPublished: true,
    },
    {
      matterId: casePatel.id,
      content: 'Client to arrange original sale deed from 1987 — crucial for establishing her share of inherited property.',
      isPublished: false,
    },
    {
      matterId: casePatel.id,
      content: 'Next hearing scheduled. Please bring all original property documents as discussed.',
      isPublished: true,
    },
    {
      matterId: caseFarooq.id,
      content: 'Obtained employment records from HR. Termination letter lacks valid cause — strong case for reinstatement.',
      isPublished: false,
    },
    {
      matterId: caseEstate.id,
      content: 'No objections received during the 30-day publication window. Proceeding to certificate stage.',
      isPublished: true,
    },
  ];

  for (const n of notesData) {
    const existing = await prisma.note.findFirst({
      where: { matterId: n.matterId, content: n.content },
    });
    if (!existing) {
      await prisma.note.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          matterId: n.matterId,
          content: n.content,
          isPublished: n.isPublished,
          createdBy: adminUser.id,
        },
      });
    }
  }
  console.log('[Demo Seed] Notes seeded.');

  // ── Fees ──────────────────────────────────────────────────────────────────

  const feesData = [
    { matterId: caseVerma.id,  type: 'one_time' as const,   total: 75000,  paid: 50000 },
    { matterId: caseVerma.id,  type: 'per_hearing' as const, total: 15000, paid: 30000 },
    { matterId: casePatel.id,  type: 'one_time' as const,   total: 50000,  paid: 25000 },
    { matterId: caseFarooq.id, type: 'one_time' as const,   total: 40000,  paid: 10000 },
    { matterId: caseEstate.id, type: 'one_time' as const,   total: 25000,  paid: 25000 },
  ];

  for (const f of feesData) {
    const existing = await prisma.fee.findFirst({
      where: { matterId: f.matterId, type: f.type },
    });
    if (!existing) {
      await prisma.fee.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          matterId: f.matterId,
          type: f.type,
          totalAmount: f.total,
          paidAmount: f.paid,
          paymentHistory: f.paid > 0
            ? [{ amount: f.paid, paidAt: daysAgo(10).toISOString(), note: 'Initial payment received' }]
            : [],
        },
      });
    }
  }
  console.log('[Demo Seed] Fees seeded.');

  // ── Document Requests ─────────────────────────────────────────────────────

  const docRequestsData = [
    {
      matterId: caseVerma.id,
      description: 'Certified copy of FIR from police station',
      status: 'received' as const,
    },
    {
      matterId: casePatel.id,
      description: 'Original sale deed dated 12 March 1987',
      status: 'pending' as const,
    },
    {
      matterId: casePatel.id,
      description: 'Property tax receipts for last 3 years',
      status: 'pending' as const,
    },
    {
      matterId: caseFarooq.id,
      description: 'Employment contract and appointment letter',
      status: 'received' as const,
    },
    {
      matterId: caseFarooq.id,
      description: 'Last 6 months pay slips',
      status: 'pending' as const,
    },
    {
      matterId: caseEstate.id,
      description: 'Death certificate of the deceased (original)',
      status: 'received' as const,
    },
  ];

  for (const dr of docRequestsData) {
    const existing = await prisma.documentRequest.findFirst({
      where: { matterId: dr.matterId, description: dr.description },
    });
    if (!existing) {
      await prisma.documentRequest.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          matterId: dr.matterId,
          description: dr.description,
          requestedBy: adminUser.id,
          status: dr.status,
        },
      });
    }
  }
  console.log('[Demo Seed] Document requests seeded.');

  console.log('\n[Demo Seed] ✓ Practix demo data ready.');
  console.log('  5 cases | 8 hearings | 6 notes | 5 fees | 6 document requests');
  console.log('  Clients: Rajesh Verma, Sunita Patel, Abdul Farooq');
}

main()
  .catch((e) => {
    console.error('[Demo Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
