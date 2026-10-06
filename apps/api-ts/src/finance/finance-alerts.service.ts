import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FinanceAlertPage, User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { financeAlertRows, markFinanceAlertsRead } from '../staff/alert-queries';

type AlertRow = { id: string; version: number; amount: string; clientName: string; batchCode: string;
  createdAt: Date; updatedAt: Date; readAt: Date | null };
const pageSize = 20;

@Injectable()
export class FinanceAlertsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private access(user: User) {
    if (!allowed(user, 'PAYMENT_VERIFY')) throw new ForbiddenException('Finance verification access required.');
  }

  /** Derive alerts from pending records so old payments and newly authorized reviewers are covered. */
  async list(user: User, query: { page: number; unreadOnly: boolean }): Promise<FinanceAlertPage> {
    this.access(user);
    const [rows, counts] = await this.db.$transaction([
      this.db.$queryRaw<AlertRow[]>`
        WITH alerts AS (${financeAlertRows(user.id)}) SELECT * FROM alerts
        ${query.unreadOnly ? Prisma.sql`WHERE "readAt" IS NULL` : Prisma.empty}
        ORDER BY "updatedAt" DESC, id DESC
        LIMIT ${pageSize} OFFSET ${(query.page - 1) * pageSize}
      `,
      this.db.$queryRaw<{ pending: bigint; unread: bigint }[]>`
        SELECT COUNT(*) AS pending,
          COUNT(*) FILTER (WHERE COALESCE(r."seenVersion", 0) < p.version) AS unread
        FROM "Payment" p
        LEFT JOIN "FinanceAlertRead" r ON r."paymentId" = p.id AND r."userId" = ${user.id}::uuid
        WHERE p.status = 'PENDING'
      `,
    ], { isolationLevel: 'RepeatableRead' });
    const pendingCount = Number(counts[0].pending);
    const unreadCount = Number(counts[0].unread);
    return { items: rows.map((row) => ({ id: row.id, version: row.version,
      title: 'Payment awaiting verification', message: `PHP ${row.amount} · ${row.clientName} · ${row.batchCode}`,
      targetPath: `/system/payments?payment=${row.id}`, readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    })), total: query.unreadOnly ? unreadCount : pendingCount, pendingCount, unreadCount, page: query.page, pageSize };
  }

  private async write<T>(user: User, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    this.access(user);
    return this.db.$transaction(async (tx) => {
      // The same lock as payment writes closes read/decision/correction races across instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'PAYMENT_VERIFY')) throw new ForbiddenException('Your access has changed.');
      return run(tx);
    });
  }

  private async changed(tx: Prisma.TransactionClient, userId: string) {
    await tx.changeEvent.create({ data: { entity: 'finance-alert-read', recordId: userId } });
  }

  async read(user: User, id: string, version: number) {
    return this.write(user, async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id }, select: { version: true, status: true } });
      if (!payment || payment.status !== 'PENDING') throw new NotFoundException('Pending payment alert not found.');
      if (payment.version !== version) throw new ConflictException('This payment changed. Refresh the alerts and open the latest record.');
      const key = { userId_paymentId: { userId: user.id, paymentId: id } };
      const previous = await tx.financeAlertRead.findUnique({ where: key });
      if (previous?.seenVersion === version) return { id, version, readAt: previous.readAt.toISOString() };
      const read = await tx.financeAlertRead.upsert({ where: key,
        create: { userId: user.id, paymentId: id, seenVersion: version },
        update: { seenVersion: version, readAt: new Date() },
      });
      await this.changed(tx, user.id);
      return { id, version, readAt: read.readAt.toISOString() };
    });
  }

  async readAll(user: User) {
    return this.write(user, async (tx) => {
      const updated = await markFinanceAlertsRead(tx, user.id);
      if (updated) await this.changed(tx, user.id);
      return { updated };
    });
  }
}
