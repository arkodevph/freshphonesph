import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const include = {
  client: { select: { id: true, name: true, account: { select: { id: true } } } },
  assignedStaff: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SupportService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private view<T extends { createdAt: Date; closedAt: Date | null }>(item: T) {
    return {
      ...item,
      turnaroundHours: item.closedAt
        ? Math.round(((item.closedAt.getTime() - item.createdAt.getTime()) / 3_600_000) * 10) / 10
        : null,
    };
  }

  async cases(user: User, query: { page: number; q: string; status?: string; clientId?: string }) {
    if (query.status && !['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'].includes(query.status))
      throw new ConflictException('Invalid support status.');
    const where: Prisma.SupportCaseWhereInput = {
      ...(user.role === 'CUSTOMER' ? { clientId: user.clientId ?? '__unlinked__' } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status as Prisma.EnumSupportStatusFilter['equals'] } : {}),
      ...(query.q ? { OR: [
        { category: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { client: { name: { contains: query.q, mode: 'insensitive' } } },
      ] } : {}),
    };
    if (user.role === 'CUSTOMER' && query.clientId && query.clientId !== user.clientId)
      throw new NotFoundException('Support cases not found.');
    const [items, total] = await this.db.$transaction([
      this.db.supportCase.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.db.supportCase.count({ where }),
    ]);
    return { items: items.map((item) => this.view(item)), total, page: query.page, pageSize: 20 };
  }

  async create(user: User, input: { category: string; description: string; clientId?: string }) {
    const clientId = user.role === 'CUSTOMER' ? user.clientId : input.clientId;
    if (!clientId) throw new ForbiddenException('A linked customer is required.');
    if (user.role !== 'CUSTOMER' && !allowed(user, 'SUPPORT_MANAGE'))
      throw new ForbiddenException('Support management access is required.');
    return this.db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found.');
      const result = await tx.supportCase.create({
        data: { clientId, category: input.category, description: input.description },
        include,
      });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'support_case.created', entity: 'support_case',
        recordId: result.id, after: json(result),
      } });
      await tx.changeEvent.create({ data: { entity: 'support_case', recordId: result.id } });
      return this.view(result);
    });
  }

  async update(user: User, id: string, input: {
    status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CLIENT' | 'RESOLVED' | 'CLOSED';
    assignedStaffId?: string | null; resolution?: string; version: number;
  }) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'SUPPORT_MANAGE'))
        throw new ForbiddenException('Your access has changed.');
      const before = await tx.supportCase.findUnique({ where: { id }, include });
      if (!before) throw new NotFoundException('Support case not found.');
      if (input.assignedStaffId && !await tx.user.findFirst({ where: { id: input.assignedStaffId, active: true, role: { not: 'CUSTOMER' } } }))
        throw new NotFoundException('Active staff assignee not found.');
      const closes = input.status === 'RESOLVED' || input.status === 'CLOSED';
      const reopens = input.status && !['RESOLVED', 'CLOSED'].includes(input.status);
      const changed = await tx.supportCase.updateMany({ where: { id, version: input.version }, data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedStaffId !== undefined ? { assignedStaffId: input.assignedStaffId } : {}),
        ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
        ...(closes && !before.closedAt ? { closedAt: new Date() } : {}),
        ...(reopens ? { closedAt: null } : {}),
        version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This support case changed. Refresh and try again.');
      const after = await tx.supportCase.findUniqueOrThrow({ where: { id }, include });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'support_case.updated', entity: 'support_case', recordId: id,
        before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'support_case', recordId: id } });
      if (after.client.account && input.status) await this.notifications.enqueue(tx, {
        recipientId: after.client.account.id,
        eventKey: 'support.updated',
        dedupeKey: `support:${id}:status:${after.version}`,
        variables: { category: after.category, status: after.status.replaceAll('_', ' ').toLowerCase() },
        link: '/portal',
      });
      return this.view(after);
    });
  }
}
