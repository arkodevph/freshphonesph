import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/auth/password';
import { passwordSchema } from '@freshphones/contracts';
import { generateSchedule } from '../src/records/schedule';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed cannot run in production.');
  const password = passwordSchema.parse(process.env.SEED_PASSWORD);
  const demoPassword = process.env.DEMO_PASSWORD
    ? passwordSchema.parse(process.env.DEMO_PASSWORD)
    : null;
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const passwordHash = await hashPassword(password);
    const owner = await db.user.upsert({
      where: { email: 'owner@freshphones.test' },
      update: {},
      create: { name: 'Alex Reyes', email: 'owner@freshphones.test', role: 'OWNER', passwordHash },
    });
    await db.user.upsert({
      where: { email: 'records@freshphones.test' },
      update: {},
      create: {
        name: 'Sam Santos',
        email: 'records@freshphones.test',
        role: 'RECORDS',
        passwordHash,
      },
    });
    await db.user.upsert({
      where: { email: 'finance@freshphones.test' },
      update: {},
      create: {
        name: 'Jamie Cruz',
        email: 'finance@freshphones.test',
        role: 'FINANCE_OFFICER',
        passwordHash,
      },
    });
    const batch = await db.batch.upsert({
      where: { code: 'FP-2026-001' },
      update: {},
      create: {
        code: 'FP-2026-001',
        contractPrice: '30000.00',
        installmentCount: 6,
        cadence: 'MONTHLY',
        model: 'iPhone 16 · 128 GB',
        status: 'ACTIVE',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-02-28'),
      },
    });
    await db.batch.upsert({
      where: { code: 'FP-2026-002' },
      update: {},
      create: {
        code: 'FP-2026-002',
        contractPrice: '24000.00',
        installmentCount: 6,
        cadence: 'MONTHLY',
        model: 'iPhone 15 · 128 GB',
        status: 'PLANNED',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2027-03-31'),
      },
    });
    const clientId = '00000000-0000-4000-8000-000000000101';
    await db.client.upsert({
      where: { id: clientId },
      update: {},
      create: {
        id: clientId,
        name: 'Taylor Garcia',
        email: 'customer@freshphones.test',
        phone: '+63 900 000 0000',
        joinedAt: new Date('2026-09-01'),
        unitModel: batch.model,
        batchId: batch.id,
        status: 'ACTIVE',
        releaseStatus: 'PROCESSING',
        ...(batch.contractPrice && batch.installmentCount && batch.cadence ? {
          schedule: { create: generateSchedule({ contractPrice: batch.contractPrice.toFixed(2),
            installmentCount: batch.installmentCount, cadence: batch.cadence, startDate: batch.startDate }) },
        } : {}),
      },
    });
    await db.user.upsert({
      where: { email: 'customer@freshphones.test' },
      update: {},
      create: {
        name: 'Taylor Garcia',
        email: 'customer@freshphones.test',
        role: 'CUSTOMER',
        clientId,
        passwordHash,
      },
    });
    if (demoPassword) {
      const demoPasswordHash = await hashPassword(demoPassword);
      const demoClientId = '00000000-0000-4000-8000-000000000102';
      await db.client.upsert({
        where: { id: demoClientId },
        update: {},
        create: {
          id: demoClientId,
          name: 'Demo Customer',
          email: 'demo.customer@freshphones.test',
          phone: '+63 900 000 0001',
          joinedAt: new Date('2026-09-01'),
          unitModel: batch.model,
          batchId: batch.id,
          status: 'ACTIVE',
          releaseStatus: 'PROCESSING',
          ...(batch.contractPrice && batch.installmentCount && batch.cadence ? {
            schedule: { create: generateSchedule({ contractPrice: batch.contractPrice.toFixed(2),
              installmentCount: batch.installmentCount, cadence: batch.cadence, startDate: batch.startDate }) },
          } : {}),
        },
      });
      const demoAccounts = [
        ['demo@freshphones.test', 'Demo Owner', 'OWNER', null],
        ['demo.coo@freshphones.test', 'Demo COO', 'COO', null],
        ['demo.manager@freshphones.test', 'Demo General Manager', 'GENERAL_MANAGER', null],
        ['demo.hr@freshphones.test', 'Demo HR and Payroll', 'HR_PAYROLL', null],
        ['demo.finance@freshphones.test', 'Demo Finance Officer', 'FINANCE_OFFICER', null],
        ['demo.records@freshphones.test', 'Demo Records Officer', 'RECORDS', null],
        ['demo.analytics@freshphones.test', 'Demo Analytics User', 'ANALYTICS', null],
        ['demo.cs-head@freshphones.test', 'Demo Customer Service Head', 'CS_HEAD', null],
        ['demo.cs-team@freshphones.test', 'Demo Customer Service Team', 'CS_TEAM', null],
        ['demo.handler@freshphones.test', 'Demo Core Handler', 'CORE_HANDLER', null],
        ['demo.customer@freshphones.test', 'Demo Customer', 'CUSTOMER', demoClientId],
      ] as const;
      for (const [email, name, role, linkedClientId] of demoAccounts) {
        await db.user.upsert({
          where: { email },
          update: {
            name,
            role,
            active: true,
            clientId: linkedClientId,
            passwordHash: demoPasswordHash,
            version: { increment: 1 },
          },
          create: { name, email, role, clientId: linkedClientId, passwordHash: demoPasswordHash },
        });
      }
    }
    if (!(await db.auditEntry.findFirst({ where: { action: 'foundation.seeded' } })))
      await db.auditEntry.create({
        data: {
          actorId: owner.id,
          action: 'foundation.seeded',
          entity: 'account',
          recordId: owner.id,
        },
      });
    console.log(
      `Demo records ready. Accounts: owner, records, finance, customer @freshphones.test.${demoPassword ? ' All role-based demo accounts were reset from DEMO_PASSWORD.' : ''}`,
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
