import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { supportSources, type User } from '@freshphones/contracts';
import { Database } from '../database';
import { allowed } from '../auth/access';
import { Prisma, type SupportSource, type SupportStatus } from '../generated/prisma/client';
import { notifyCustomer } from './notifications.service';
import { notifySupport } from '../staff/support-alerts';

const include = {
  client: { select: { name: true } }, assignedStaff: { select: { name: true } },
  messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
    select: { createdAt: true, author: { select: { role: true } } } },
} satisfies Prisma.SupportCaseInclude;
type CaseRow = Prisma.SupportCaseGetPayload<{ include: typeof include }>;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const view = (row: CaseRow) => ({
  id: row.id, client: row.clientId, client_name: row.client.name, category: row.category, source: row.source.toLowerCase(),
  description: row.description, assigned_staff: row.assignedStaffId,
  assigned_staff_name: row.assignedStaff?.name ?? null,
  status: row.status.toLowerCase(), resolution: row.resolution,
  date_received: row.createdAt.toISOString(), closed_date: row.closedAt?.toISOString() ?? null,
  turnaround_hours: row.closedAt ? Math.round((row.closedAt.getTime() - row.createdAt.getTime()) / 360000) / 10 : null,
  version: row.version,
  last_message: row.messages[0] ? { by_customer: row.messages[0].author.role === 'CUSTOMER',
    created_at: row.messages[0].createdAt.toISOString() } : null,
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

  async detail(user: User, id: string) {
    const clientId = user.role === 'CUSTOMER' ? this.customer(user) : null;
    if (!clientId && !allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    const row = await this.db.supportCase.findFirst({
      where: { id, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { name: true } }, assignedStaff: { select: { name: true } },
        messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { author: { select: { role: true } } } } },
    });
    if (!row) throw new NotFoundException('Case not found.');
    return { ...view(row),
      last_message: row.messages.length ? { by_customer: row.messages.at(-1)!.author.role === 'CUSTOMER',
        created_at: row.messages.at(-1)!.createdAt.toISOString() } : null,
      messages: row.messages.map((message) => ({ id: message.id, body: message.body,
        author_type: message.author.role === 'CUSTOMER' ? 'customer' : 'staff',
        created_at: message.createdAt.toISOString() })),
    };
  }

  async reply(user: User, id: string, input: { body: string; needsReply?: boolean }) {
    const clientId = user.role === 'CUSTOMER' ? this.customer(user) : null;
    if (!clientId && !allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || (clientId
        ? current.role !== 'CUSTOMER' || current.clientId !== clientId
        : !allowed(current, 'SUPPORT_MANAGE')))
        throw new ForbiddenException('Your access has changed.');
      const before = await tx.supportCase.findFirst({ where: { id, ...(clientId ? { clientId } : {}) }, include });
      if (!before) throw new NotFoundException('Case not found.');
      if (before.status === 'CLOSED' || before.status === 'RESOLVED')
        throw new ConflictException('This case is finished. Create a follow-up case.');
      const status = clientId
        ? before.status === 'WAITING_FOR_CLIENT' ? 'IN_PROGRESS' : before.status
        : input.needsReply ? 'WAITING_FOR_CLIENT' : before.status === 'WAITING_FOR_CLIENT' ? 'IN_PROGRESS' : before.status;
      const message = await tx.supportMessage.create({ data: { caseId: id, authorId: user.id, body: input.body } });
      const updated = await tx.supportCase.update({ where: { id }, data: { status, version: { increment: 1 } } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'support.replied', entity: 'support', recordId: id,
        after: json({ messageId: message.id, authorType: clientId ? 'customer' : 'staff', status }) } });
      await tx.changeEvent.create({ data: { entity: 'support', recordId: id } });
      if (clientId) await notifySupport(tx, updated, 'SUPPORT_CUSTOMER_REPLY');
      else await tx.supportAlert.updateMany({ where: { caseId: id, kind: 'SUPPORT_CUSTOMER_REPLY', handledAt: null }, data: { handledAt: new Date() } });
      if (!clientId) await notifyCustomer(tx, before.clientId, 'support', 'Customer Service replied',
        input.needsReply ? `Customer Service needs your reply on your ${before.category} request.` : `Customer Service replied to your ${before.category} request.`,
        `/portal/support#case-${id}`);
      return { id: message.id, body: message.body, author_type: clientId ? 'customer' : 'staff',
        created_at: message.createdAt.toISOString(), status: status.toLowerCase() };
    });
  }

  async create(user: User, input: { category: string; description: string }) {
    const clientId = this.customer(user);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || current.role !== 'CUSTOMER' || current.clientId !== clientId)
        throw new ForbiddenException('Your access has changed.');
      const row = await tx.supportCase.create({ data: { clientId, ...input, source: 'CUSTOMER_PORTAL' }, include });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'support.created', entity: 'support', recordId: row.id, after: json(view(row)) } });
      await tx.changeEvent.create({ data: { entity: 'support', recordId: row.id } });
      await notifySupport(tx, row, 'SUPPORT_NEW_CASE');
      return view(row);
    });
  }

  async list(user: User, status?: string, page = 1, caseId?: string, source?: string) {
    if (!allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    if (status && !['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'].includes(status))
      throw new BadRequestException('Invalid case status.');
    if (source && !supportSources.includes(source as SupportSource)) throw new BadRequestException('Invalid case source.');
    const where: Prisma.SupportCaseWhereInput = {
      ...(status ? { status: status as SupportStatus } : {}),
      ...(caseId ? { id: caseId } : {}),
      ...(source ? { source: source as SupportSource } : {}),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.supportCase.findMany({ where, include, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
      this.db.supportCase.count({ where }),
    ]);
    return { count: total, next: page * 20 < total ? String(page + 1) : null, results: rows.map(view), page };
  }

  async clientOptions(user: User, query: string) {
    if (!allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Support access required.');
    const q = query.trim();
    if (q.length < 2 || q.length > 100) throw new BadRequestException('Search for a customer using 2–100 characters.');
    const rows = await this.db.client.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, batch: { select: { code: true } } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 20,
    });
    return rows.map((item) => ({ id: item.id, name: item.name, batch_code: item.batch.code }));
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
      if (['RESOLVED', 'CLOSED'].includes(row.status) || before.assignedStaffId !== row.assignedStaffId)
        await tx.supportAlert.updateMany({ where: { caseId: id, handledAt: null }, data: { handledAt: new Date() } });
      if (before.assignedStaffId !== row.assignedStaffId || (before.status === 'RESOLVED' && !['RESOLVED', 'CLOSED'].includes(row.status)))
        await notifySupport(tx, row, row.assignedStaffId ? 'SUPPORT_ASSIGNED' : 'SUPPORT_NEW_CASE');
      if (before.status !== row.status || before.resolution !== row.resolution)
        await notifyCustomer(tx, row.clientId, 'support', 'Support case updated', `Your ${row.category} concern is now ${row.status.toLowerCase().replaceAll('_', ' ')}.`, `/portal/support#case-${id}`);
      return view(row);
    });
  }
}
