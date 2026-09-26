import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { Database } from '../database';
import { allowed } from '../auth/access';
import { Prisma, type SupportStatus } from '../generated/prisma/client';
import { notifyCustomer } from './notifications.service';

const include = { client: { select: { name: true } }, assignedStaff: { select: { name: true } } } as const;
type CaseRow = Prisma.SupportCaseGetPayload<{ include: typeof include }>;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const view = (row: CaseRow) => ({
  id: row.id, client: row.clientId, client_name: row.client.name, category: row.category,
  description: row.description, assigned_staff: row.assignedStaffId,
  assigned_staff_name: row.assignedStaff?.name ?? null,
  status: row.status.toLowerCase(), resolution: row.resolution,
  date_received: row.createdAt.toISOString(), closed_date: row.closedAt?.toISOString() ?? null,
  turnaround_hours: row.closedAt ? Math.round((row.closedAt.getTime() - row.createdAt.getTime()) / 360000) / 10 : null,
  version: row.version,
});

@Injectable()
export class SupportService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private customer(user: User) {
    if (user.role !== 'CUSTOMER' || !user.clientId)
      throw new ForbiddenException('A linked customer account is required.');
    return user.clientId;
  }

  async mine(user: User) {
    const clientId = this.customer(user);
    return (await this.db.supportCase.findMany({ where: { clientId }, include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 })).map(view);
  }

  async create(user: User, input: { category: string; description: string }) {
    const clientId = this.customer(user);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || current.role !== 'CUSTOMER' || current.clientId !== clientId)
        throw new ForbiddenException('Your access has changed.');
      const row = await tx.supportCase.create({ data: { clientId, ...input }, include });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'support.created', entity: 'support', recordId: row.id, after: json(view(row)) } });
      await tx.changeEvent.create({ data: { entity: 'support', recordId: row.id } });
      return view(row);
    });
  }

  async list(user: User, status?: string, page = 1) {
    if (!allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    if (status && !['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'].includes(status))
      throw new BadRequestException('Invalid case status.');
    const where: Prisma.SupportCaseWhereInput = status ? { status: status as SupportStatus } : {};
    const [rows, total] = await this.db.$transaction([
      this.db.supportCase.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
      this.db.supportCase.count({ where }),
    ]);
    return { count: total, next: page * 20 < total ? String(page + 1) : null, results: rows.map(view), page };
  }

  async update(user: User, id: string, input: { status?: SupportStatus; resolution?: string; assignedStaffId?: string | null; version: number }) {
    if (!allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'SUPPORT_MANAGE')) throw new ForbiddenException('Your access has changed.');
      const before = await tx.supportCase.findUnique({ where: { id }, include });
      if (!before) throw new NotFoundException('Case not found.');
      if (before.version !== input.version) throw new ConflictException('This case changed. Refresh and review it.');
      if (input.assignedStaffId) {
        const assignee = await tx.user.findUnique({ where: { id: input.assignedStaffId } });
        if (!assignee?.active || !['CS_HEAD', 'CS_TEAM'].includes(assignee.role))
          throw new BadRequestException('Assign an active Customer Service staff member.');
      }
      const status = input.status ?? before.status;
      if (before.status === 'CLOSED')
        throw new ConflictException('Closed cases cannot be changed. Create a follow-up case.');
      const resolution = input.resolution ?? before.resolution;
      if (['RESOLVED', 'CLOSED'].includes(status) && !resolution.trim())
        throw new BadRequestException('A resolution is required before resolving or closing a case.');
      const row = await tx.supportCase.update({ where: { id }, data: {
        status, resolution, assignedStaffId: input.assignedStaffId === undefined ? undefined : input.assignedStaffId,
        closedAt: status === 'CLOSED' ? before.closedAt ?? new Date() : null, version: { increment: 1 },
      }, include });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'support.updated', entity: 'support', recordId: id, before: json(view(before)), after: json(view(row)) } });
      await tx.changeEvent.create({ data: { entity: 'support', recordId: id } });
      if (before.status !== row.status || before.resolution !== row.resolution)
        await notifyCustomer(tx, row.clientId, 'support', 'Support case updated', `Your ${row.category} concern is now ${row.status.toLowerCase().replaceAll('_', ' ')}.`);
      return view(row);
    });
  }
}
