import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/auth/password';
import { passwordSchema } from '@freshphones/contracts';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed cannot run in production.');
  const password = passwordSchema.parse(process.env.SEED_PASSWORD);
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
        batchId: batch.id,
        status: 'ACTIVE',
        releaseStatus: 'PROCESSING',
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
      'Demo records ready. Accounts: owner, records, finance, customer @freshphones.test. Password comes from SEED_PASSWORD; existing accounts are not reset.',
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
