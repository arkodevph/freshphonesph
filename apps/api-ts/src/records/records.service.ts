import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccountInput,
  BatchInput,
  ClientInput,
  Permission,
  User,
} from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { allowed } from '../auth/access';
import { hashPassword } from '../auth/password';
import { generateSchedule } from './schedule';
import type { Batch as StoredBatch } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const batchInclude = { _count: { select: { clients: true } } } as const;
const clientInclude = {
  batch: { select: { id: true, code: true, model: true, startDate: true, endDate: true } },
  account: { select: { id: true } },
} as const;
const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  clientId: true,
  version: true,
  createdAt: true,
} as const;
type Query = { page: number; q: string; status?: string; batchId?: string };
type AccountQuery = { page: number; q: string; status?: 'ACTIVE' | 'INACTIVE'; role?: User['role'] };
const pageSize = 20;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const batchJson = <T extends StoredBatch>(batch: T) => ({
  ...batch,
  startDate: batch.startDate.toISOString().slice(0, 10),
  endDate: batch.endDate.toISOString().slice(0, 10),
  contractPrice: batch.contractPrice?.toFixed(2) ?? null,
});
const clientJson = <T extends { joinedAt: Date | null }>(client: T) => ({
  ...client, joinedAt: client.joinedAt?.toISOString().slice(0, 10) ?? null,
});

@Injectable()
export class RecordsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  // This lock orders event IDs with commits, including across API instances.
  private async write<T>(
    user: User,
    permission: Permission,
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, permission))
        throw new ForbiddenException('Your access has changed.');
      return run(tx);
    });
  }
  private async record(
    tx: Prisma.TransactionClient,
    actorId: string,
    entity: string,
    recordId: string,
    action: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditEntry.create({
      data: {
        actorId,
        action,
        entity,
        recordId,
        ...(before ? { before: json(before) } : {}),
        after: json(after),
      },
    });
    await tx.changeEvent.create({ data: { entity, recordId } });
  }
  async batches(query: Query) {
    const where: Prisma.BatchWhereInput = {
      OR: [
        { code: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ],
    };
    if (query.status) {
      if (!['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(query.status))
        throw new BadRequestException('Invalid batch status.');
      where.status = query.status as Prisma.EnumBatchStatusFilter['equals'];
    }
    const [items, total] = await this.db.$transaction([
      this.db.batch.findMany({
        where,
        include: batchInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.batch.count({ where }),
    ]);
    return {
      items: items.map(batchJson),
      total,
      page: query.page,
      pageSize,
    };
  }
  async createBatch(user: User, input: BatchInput) {
    this.validatePlan(input);
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const result = await tx.batch.create({
        data: { ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) },
        include: batchInclude,
      });
      await this.record(tx, user.id, 'batch', result.id, 'batch.created', null, result);
      return batchJson(result);
    });
  }
  async updateBatch(user: User, id: string, input: BatchInput, version: number) {
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const before = await tx.batch.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Batch not found.');
      const termsChanged = before.startDate.toISOString().slice(0, 10) !== input.startDate ||
        before.endDate.toISOString().slice(0, 10) !== input.endDate || before.model !== input.model ||
        (input.contractPrice !== undefined && !before.contractPrice?.equals(input.contractPrice)) ||
        (input.installmentCount !== undefined && before.installmentCount !== input.installmentCount) ||
        (input.cadence !== undefined && before.cadence !== input.cadence);
      if (termsChanged && await tx.scheduleItem.count({ where: { client: { batchId: id } } }))
        throw new ConflictException('Plan terms are locked after schedules are issued. Create a new batch for a different plan.');
      this.validatePlan({
        ...input,
        contractPrice: input.contractPrice ?? before.contractPrice?.toFixed(2),
        installmentCount: input.installmentCount ?? before.installmentCount ?? undefined,
        cadence: input.cadence ?? before.cadence ?? undefined,
      });
      const changed = await tx.batch.updateMany({
        where: { id, version },
        data: {
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'This batch changed while you were editing. Refresh and review the latest record.',
        );
      const after = await tx.batch.findUniqueOrThrow({ where: { id }, include: batchInclude });
      await this.record(tx, user.id, 'batch', id, 'batch.updated', before, after);
      return batchJson(after);
    });
  }
  async clients(query: Query) {
    const where: Prisma.ClientWhereInput = {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
        { batch: { code: { contains: query.q, mode: 'insensitive' } } },
      ],
    };
    if (query.status) {
      if (!['ACTIVE', 'ON_HOLD', 'COMPLETED'].includes(query.status))
        throw new BadRequestException('Invalid client status.');
      where.status = query.status as Prisma.EnumClientStatusFilter['equals'];
    }
    if (query.batchId) where.batchId = query.batchId;
    const [items, total] = await this.db.$transaction([
      this.db.client.findMany({
        where,
        include: clientInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.client.count({ where }),
    ]);
    return { items: items.map(clientJson), total, page: query.page, pageSize };
  }
  async client(user: User, id: string) {
    if (!allowed(user, 'CLIENT_READ') && !(user.role === 'CUSTOMER' && user.clientId === id))
      throw new NotFoundException('Client not found.');
    const client = await this.db.client.findUnique({ where: { id }, include: clientInclude });
    if (!client) throw new NotFoundException('Client not found.');
    return clientJson(client);
  }
  private validatePlan(input: BatchInput) {
    if (input.contractPrice === undefined || input.installmentCount === undefined || input.cadence === undefined) return;
    const items = generateSchedule({ ...input, contractPrice: input.contractPrice, installmentCount: input.installmentCount, cadence: input.cadence, startDate: new Date(input.startDate) });
    if (items[items.length - 1].dueDate > new Date(input.endDate))
      throw new BadRequestException('The batch end date must include the last installment.');
  }
  private plan(batch: StoredBatch) {
    if (batch.contractPrice === null || batch.installmentCount === null || batch.cadence === null)
      throw new BadRequestException('Set the agreed batch payment terms before enrolling a client or issuing a schedule.');
    return generateSchedule({ ...batch, contractPrice: batch.contractPrice.toFixed(2), installmentCount: batch.installmentCount, cadence: batch.cadence });
  }
  private async enrollment(tx: Prisma.TransactionClient, batchId: string) {
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch || !['PLANNED', 'ACTIVE'].includes(batch.status))
      throw new BadRequestException('Choose a planned or active batch for enrollment.');
    return batch;
  }
  async createClient(user: User, input: ClientInput) {
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      const batch = await this.enrollment(tx, input.batchId);
      const schedule = this.plan(batch);
      const result = await tx.client.create({
        data: { ...input, joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
          unitModel: input.unitModel || batch.model,
          schedule: { create: schedule } },
        include: clientInclude,
      });
      await this.record(tx, user.id, 'client', result.id, 'client.created', null, result);
      await this.record(tx, user.id, 'client', result.id, 'schedule.generated', null, { items: schedule });
      await tx.changeEvent.create({ data: { entity: 'batch', recordId: batch.id } });
      return clientJson(result);
    });
  }
  async updateClient(user: User, id: string, input: ClientInput, version: number) {
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      const before = await tx.client.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Client not found.');
      if (before.batchId !== input.batchId) {
        if (await tx.scheduleItem.count({ where: { clientId: id } }))
          throw new ConflictException('This client has an issued schedule and cannot be moved to another batch.');
        await this.enrollment(tx, input.batchId);
      }
      const changed = await tx.client.updateMany({
        where: { id, version },
        data: { ...input, joinedAt: input.joinedAt ? new Date(input.joinedAt) : undefined, version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException(
          'This client changed while you were editing. Refresh and review the latest record.',
        );
      const after = await tx.client.findUniqueOrThrow({ where: { id }, include: clientInclude });
      await this.record(tx, user.id, 'client', id, 'client.updated', before, after);
      if (before.releaseStatus !== after.releaseStatus && after.account) {
        await this.notifications.enqueue(tx, {
          recipientId: after.account.id,
          eventKey: 'client.release',
          dedupeKey: `client:${id}:release:${after.version}`,
          variables: { status: after.releaseStatus.replaceAll('_', ' ').toLowerCase() },
          link: '/portal',
        });
      }
      return clientJson(after);
    });
  }
  async schedule(user: User, id: string) {
    await this.client(user, id);
    return this.readSchedule(this.db, id);
  }
  private async readSchedule(tx: Prisma.TransactionClient, id: string) {
    const items = await tx.scheduleItem.findMany({ where: { clientId: id }, orderBy: { sequenceNo: 'asc' } });
    if (!items.length) throw new ConflictException('This client does not have an issued schedule yet. Ask Records to review the batch terms.');
    const totalDue = items.reduce((sum, item) => sum.add(item.expectedAmount), new Prisma.Decimal(0)).toFixed(2);
    return { clientId: id, totalDue, items: items.map((item) => ({
      id: item.id, sequenceNo: item.sequenceNo, dueDate: item.dueDate.toISOString().slice(0, 10),
      expectedAmount: item.expectedAmount.toFixed(2),
    })) };
  }
  async issueSchedule(user: User, id: string) {
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      const client = await tx.client.findUnique({ where: { id }, include: { batch: true } });
      if (!client) throw new NotFoundException('Client not found.');
      if (!await tx.scheduleItem.count({ where: { clientId: id } })) {
        const items = this.plan(client.batch);
        await tx.scheduleItem.createMany({ data: items.map((item) => ({ ...item, clientId: id })) });
        await this.record(tx, user.id, 'client', id, 'schedule.generated', null, { items });
      }
      return this.readSchedule(tx, id);
    });
  }
  async accounts(query: AccountQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { active: query.status === 'ACTIVE' } : {}),
      ...(query.role ? { role: query.role } : {}),
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ],
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: accountSelect,
        skip: (query.page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize };
  }
  async createAccount(user: User, input: AccountInput) {
    const passwordHash = await hashPassword(input.password);
    return this.write(user, 'ACCOUNT_MANAGE', async (tx) => {
      if (input.clientId && !(await tx.client.findUnique({ where: { id: input.clientId } })))
        throw new BadRequestException('Client not found.');
      const result = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          clientId: input.clientId,
          passwordHash,
        },
        select: accountSelect,
      });
      await this.record(tx, user.id, 'account', result.id, 'account.created', null, result);
      return result;
    });
  }
  async updateAccount(
    user: User,
    id: string,
    input: { active?: boolean; role?: User['role'] },
    version: number,
  ) {
    return this.write(user, 'ACCOUNT_MANAGE', async (tx) => {
      const before = await tx.user.findUnique({ where: { id }, select: accountSelect });
      if (!before) throw new NotFoundException('Account not found.');
      if (id === user.id && input.active === false)
        throw new BadRequestException('You cannot deactivate your own account.');
      if (id === user.id && input.role && input.role !== before.role)
        throw new BadRequestException('You cannot change your own role.');
      if (input.role === 'CUSTOMER' && before.role !== 'CUSTOMER')
        throw new BadRequestException('Create customer access from the linked client record.');
      if (before.role === 'CUSTOMER' && input.role && input.role !== 'CUSTOMER')
        throw new BadRequestException('Customer access remains linked to its client record.');
      const roleChanged = Boolean(input.role && input.role !== before.role);
      const activeChanged = input.active !== undefined && input.active !== before.active;
      if (!roleChanged && !activeChanged) return before;
      const updated = await tx.user.updateMany({
        where: { id, version },
        data: {
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.role ? { role: input.role } : {}),
          version: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ConflictException('This account has changed. Refresh and try again.');
      if (input.active === false || roleChanged)
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      const after = await tx.user.findUniqueOrThrow({ where: { id }, select: accountSelect });
      const action = roleChanged
        ? 'account.role_changed'
        : input.active
          ? 'account.activated'
          : 'account.deactivated';
      await this.record(tx, user.id, 'account', id, action, before, after);
      return after;
    });
  }
  async audit(query: Query) {
    const where = { action: { contains: query.q, mode: 'insensitive' as const } };
    const [items, total] = await this.db.$transaction([
      this.db.auditEntry.findMany({
        where,
        select: {
          id: true,
          action: true,
          entity: true,
          recordId: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.auditEntry.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize };
  }
  async overview(user: User) {
    const [activeBatches, clients, readyForRelease, employees] = await Promise.all([
      allowed(user, 'BATCH_READ') ? this.db.batch.count({ where: { status: 'ACTIVE' } }) : null,
      allowed(user, 'CLIENT_READ') ? this.db.client.count() : null,
      allowed(user, 'CLIENT_READ')
        ? this.db.client.count({ where: { releaseStatus: 'READY' } })
        : null,
      allowed(user, 'ACCOUNT_MANAGE')
        ? this.db.user.count({ where: { active: true, role: { not: 'CUSTOMER' } } })
        : null,
    ]);
    return { activeBatches, clients, readyForRelease, employees };
  }
}
