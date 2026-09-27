import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { Database } from '../database';
import { allowed } from '../auth/access';
import { requirement } from './requirements';
import { Prisma } from '../generated/prisma/client';

export type CustomerWorkKind = 'support' | 'documents' | 'payments';
const pageSize = 20;

@Injectable()
export class CustomerWorkService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async list(user: User, kind: CustomerWorkKind, page: number) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Invalid page number.');
    const skip = (page - 1) * pageSize;
    if (kind === 'support') {
      if (!allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
      const where: Prisma.SupportCaseWhereInput = { status: { in: ['OPEN', 'IN_PROGRESS'] } };
      const [rows, count] = await this.db.$transaction([
        this.db.supportCase.findMany({ where, select: { id: true, category: true, status: true, createdAt: true, updatedAt: true,
          client: { select: { name: true } },
          messages: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 1,
            select: { author: { select: { role: true } } } },
        }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip, take: pageSize }),
        this.db.supportCase.count({ where }),
      ]);
      return { kind, count, page, next: page * pageSize < count ? page + 1 : null,
        results: rows.map((row) => ({ id: row.id, clientName: row.client.name, label: row.category,
          status: row.status, waitingSince: row.updatedAt.toISOString(), createdAt: row.createdAt.toISOString(),
          customerReplied: row.messages[0]?.author.role === 'CUSTOMER',
          href: `/system/support?case=${row.id}` })) };
    }
    if (kind === 'documents') {
      if (user.role !== 'OWNER' && user.role !== 'RECORDS') throw new ForbiddenException('Records access required.');
      const [rows, count] = await this.db.$transaction([
        this.db.customerDocument.findMany({ where: { status: 'SUBMITTED' },
          select: { id: true, clientId: true, requirementKey: true, createdAt: true,
            client: { select: { name: true } } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip, take: pageSize }),
        this.db.customerDocument.count({ where: { status: 'SUBMITTED' } }),
      ]);
      return { kind, count, page, next: page * pageSize < count ? page + 1 : null,
        results: rows.map((row) => ({ id: row.id, clientName: row.client.name,
          label: requirement(row.requirementKey)?.label ?? row.requirementKey,
          status: 'SUBMITTED', waitingSince: row.createdAt.toISOString(),
          href: `/system/clients?client=${row.clientId}&documents=${row.clientId}#document-${row.requirementKey}` })) };
    }
    if (kind === 'payments') {
      if (!allowed(user, 'PAYMENT_VERIFY')) throw new ForbiddenException('Finance verification access required.');
      const [rows, count] = await this.db.$transaction([
        this.db.payment.findMany({ where: { status: 'PENDING' },
          select: { id: true, amount: true, createdAt: true, client: { select: { name: true } } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip, take: pageSize }),
        this.db.payment.count({ where: { status: 'PENDING' } }),
      ]);
      return { kind, count, page, next: page * pageSize < count ? page + 1 : null,
        results: rows.map((row) => ({ id: row.id, clientName: row.client.name,
          label: `₱${row.amount.toFixed(2)}`, status: 'PENDING', waitingSince: row.createdAt.toISOString(),
          href: `/system/payments?payment=${row.id}` })) };
    }
    throw new BadRequestException('Invalid work queue.');
  }
}
