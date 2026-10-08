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
  AgentInput,
  BatchAssignmentInput,
  BatchInput,
  ClientInput,
  Permission,
  User,
} from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { allowed } from '../auth/access';
import { eligibleForConfidentialHr } from '@freshphones/contracts';
import { hashPassword } from '../auth/password';
import { generateSchedule } from './schedule';
import { allocateVerifiedPayments } from './allocation';
import type { Batch as StoredBatch, ReleaseStatus } from '../generated/prisma/client';
import { notifyCustomer } from '../portal/notifications.service';
import { historyChanges } from './history';
import { batchScope, clientScope } from './scope';
import { notifyAccount } from '../staff/account-alerts';
import { verifiedTotals } from '../finance/ledger';

const batchInclude = { _count: { select: { clients: true } },
  handler: { select: { id: true, name: true, active: true, role: true } },
  agent: { select: { id: true, name: true, active: true } },
  clients: { where: { schedule: { some: {} } }, select: { id: true }, take: 1 } } as const;
const clientInclude = {
  _count: { select: { schedule: true } },
  batch: { select: { id: true, code: true, model: true, startDate: true, endDate: true } },
  account: { select: { id: true } },
} as const;
const accountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  hrConfidentialAccess: true,
  clientId: true,
  version: true,
  createdAt: true,
} as const;
type Query = { page: number; q: string; status?: string; batchId?: string; id?: string; handlerId?: string; agentId?: string;
  model?: string; dateFrom?: string; dateTo?: string };
type AccountQuery = { page: number; q: string; status?: 'ACTIVE' | 'INACTIVE'; role?: User['role'] };
const pageSize = 20;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const batchJson = <T extends StoredBatch & { clients: { id: string }[] }>(batch: T) => {
  const { clients, ...record } = batch;
  return {
    ...record, termsLocked: clients.length > 0,
    startDate: batch.startDate.toISOString().slice(0, 10),
    endDate: batch.endDate.toISOString().slice(0, 10),
    contractPrice: batch.contractPrice?.toFixed(2) ?? null,
  };
};
const clientJson = <T extends { joinedAt: Date | null; _count: { schedule: number } }>(client: T) => {
  const { _count, ...record } = client;
  return { ...record, scheduleIssued: _count.schedule > 0, joinedAt: client.joinedAt?.toISOString().slice(0, 10) ?? null };
};

@Injectable()
export class RecordsService {
  constructor(@Inject(Database) private readonly db: Database) {}

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
  async batches(user: User, query: Query) {
    const where: Prisma.BatchWhereInput = {
      AND: [batchScope(user), ...(query.handlerId ? [{ handlerId: query.handlerId }] : []),
        ...(query.agentId ? [{ agentId: query.agentId }] : [])],
      ...(query.model ? { model: { contains: query.model, mode: 'insensitive' } } : {}),
      ...(query.dateFrom || query.dateTo ? { startDate: {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      } } : {}),
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
    ], { isolationLevel: 'RepeatableRead' });
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
  async batch(user: User, id: string) {
    const batch = await this.db.batch.findFirst({ where: { id, ...batchScope(user) }, include: batchInclude });
    if (!batch) throw new NotFoundException('Batch not found.');
    return batchJson(batch);
  }
  async assignmentOptions(user: User) {
    const [handlers, agents] = await this.db.$transaction([
      this.db.user.findMany({ where: user.role === 'CORE_HANDLER' ? { id: user.id } : {
        OR: [{ role: 'CORE_HANDLER' }, { handledBatches: { some: {} } }],
      }, select: { id: true, name: true, active: true, role: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.db.agent.findMany({ where: user.role === 'CORE_HANDLER' ? { batches: { some: batchScope(user) } } : {},
        select: { id: true, name: true, active: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
    ]);
    return { handlers: handlers.map(({ role, ...handler }) => ({ ...handler, active: handler.active && role === 'CORE_HANDLER' })), agents };
  }
  async assignBatch(user: User, id: string, input: BatchAssignmentInput) {
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const before = await tx.batch.findUnique({ where: { id }, include: batchInclude });
      if (!before) throw new NotFoundException('Batch not found.');
      if (before.version !== input.version) throw new ConflictException('This batch changed. Load the latest assignments and review them.');
      if (input.handlerId && input.handlerId !== before.handlerId && !await tx.user.findFirst({
        where: { id: input.handlerId, role: 'CORE_HANDLER', active: true }, select: { id: true },
      })) throw new BadRequestException('Choose an active handler account.');
      if (input.agentId && input.agentId !== before.agentId && !await tx.agent.findFirst({
        where: { id: input.agentId, active: true }, select: { id: true },
      })) throw new BadRequestException('Choose an active agent.');
      if (input.handlerId === before.handlerId && input.agentId === before.agentId) return batchJson(before);
      await tx.batch.update({ where: { id }, data: { handlerId: input.handlerId, agentId: input.agentId, version: { increment: 1 } } });
      const after = await tx.batch.findUniqueOrThrow({ where: { id }, include: batchInclude });
      await this.record(tx, user.id, 'batch', id, 'batch.assigned', before, after);
      // Refresh both handlers without exposing a removed record's identifier to the old handler.
      if (before.handlerId !== after.handlerId) {
        for (const handlerId of new Set([before.handlerId, after.handlerId].filter((value): value is string => Boolean(value))))
          await tx.changeEvent.create({ data: { entity: 'record-access', recordId: handlerId } });
      }
      return batchJson(after);
    });
  }
  async agents(query: { q: string; page: number; status?: 'ACTIVE' | 'INACTIVE' }) {
    const where: Prisma.AgentWhereInput = { ...(query.status ? { active: query.status === 'ACTIVE' } : {}),
      OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { code: { contains: query.q, mode: 'insensitive' } }] };
    const [items, total] = await this.db.$transaction([
      this.db.agent.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * pageSize, take: pageSize }),
      this.db.agent.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize };
  }
  async createAgent(user: User, input: AgentInput) {
    return this.write(user, 'AGENT_MANAGE', async (tx) => {
      const agent = await tx.agent.create({ data: input });
      await this.record(tx, user.id, 'agent', agent.id, 'agent.created', null, agent);
      return agent;
    });
  }
  async agent(id: string) {
    const agent = await this.db.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found.');
    return agent;
  }
  async updateAgent(user: User, id: string, input: AgentInput, version: number) {
    return this.write(user, 'AGENT_MANAGE', async (tx) => {
      const before = await tx.agent.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Agent not found.');
      const changed = await tx.agent.updateMany({ where: { id, version }, data: { ...input, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This agent changed. Reload the directory and review the latest record.');
      const after = await tx.agent.findUniqueOrThrow({ where: { id } });
      await this.record(tx, user.id, 'agent', id, 'agent.updated', before, after);
      // Assigned handlers see the new safe display name/status through their batch event.
      const batches = await tx.batch.findMany({ where: { agentId: id }, select: { id: true } });
      if (batches.length) await tx.changeEvent.createMany({ data: batches.map((batch) => ({ entity: 'batch', recordId: batch.id })) });
      return after;
    });
  }
  async verifyAgent(query: string) {
    if (!query) return { found: false };
    const byCode = await this.db.agent.findUnique({ where: { code: query.toUpperCase() }, select: { name: true, code: true, active: true } });
    // A complete name must identify exactly one agent; never confirm an arbitrary first match.
    const matches = byCode ? [byCode] : await this.db.agent.findMany({ where: { name: { equals: query, mode: 'insensitive' } },
      select: { name: true, code: true, active: true }, take: 2 });
    if (matches.length !== 1) return { found: false };
    const agent = matches[0];
    const maskedCode = agent.code.length <= 4 ? '*'.repeat(agent.code.length) : `${agent.code.slice(0, 2)}${'*'.repeat(agent.code.length - 4)}${agent.code.slice(-2)}`;
    return { found: true, full_name: agent.name, agent_code: maskedCode, is_active: agent.active };
  }
  async updateBatch(user: User, id: string, input: BatchInput, version: number) {
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const before = await tx.batch.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Batch not found.');
      if (before.version !== version) throw new ConflictException('This batch changed while you were editing. Refresh and review the latest record.');
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
  async clients(user: User, query: Query) {
    const where: Prisma.ClientWhereInput = {
      AND: [clientScope(user), ...(query.handlerId ? [{ batch: { handlerId: query.handlerId } }] : []),
        ...(query.agentId ? [{ batch: { agentId: query.agentId } }] : []),
        ...(query.model ? [{ OR: [
          { unitModel: { contains: query.model, mode: 'insensitive' as const } },
          { unitModel: '', batch: { model: { contains: query.model, mode: 'insensitive' as const } } },
        ] }] : [])],
      ...(query.dateFrom || query.dateTo ? { joinedAt: {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      } } : {}),
      ...(query.id ? { id: query.id } : {}),
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
    ], { isolationLevel: 'RepeatableRead' });
    return { items: items.map(clientJson), total, page: query.page, pageSize };
  }
  async client(user: User, id: string) {
    if (!allowed(user, 'CLIENT_READ') && !(user.role === 'CUSTOMER' && user.clientId === id))
      throw new NotFoundException('Client not found.');
    const client = await this.db.client.findFirst({ where: { id, ...clientScope(user) }, include: clientInclude });
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
      const before = await tx.client.findUnique({ where: { id }, include: clientInclude });
      if (!before) throw new NotFoundException('Client not found.');
      if (before.version !== version) throw new ConflictException('This client changed while you were editing. Refresh and review the latest record.');
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
      if (before.releaseStatus !== after.releaseStatus) {
        const update = await tx.releaseUpdate.create({ data: { clientId: id, actorId: user.id, status: after.releaseStatus } });
        await notifyCustomer(tx, id, 'release', 'Release status updated', `Your unit is now ${after.releaseStatus.toLowerCase().replaceAll('_', ' ')}.`, `/portal/release#release-update-${update.id}`);
      }
      return clientJson(after);
    });
  }

  async releaseUpdates(user: User, id: string) {
    await this.client(user, id);
    const rows = await this.db.releaseUpdate.findMany({ where: { clientId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30 });
    return rows.map((row) => ({ id: row.id, status: row.status.toLowerCase().replaceAll('_', ' '),
      note: row.note, collection_date: row.collectionDate?.toISOString().slice(0, 10) ?? null,
      updated_at: row.createdAt.toISOString() }));
  }

  async addReleaseUpdate(user: User, id: string, input: { status: ReleaseStatus; note: string; collectionDate?: string | null; version: number }) {
    if (input.collectionDate && !['READY', 'RELEASED'].includes(input.status))
      throw new BadRequestException('Collection date is only available when the unit is ready or released.');
    if (input.collectionDate) {
      const parsed = new Date(`${input.collectionDate}T00:00:00Z`);
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.collectionDate)
        throw new BadRequestException('Enter a valid collection date.');
    }
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      const before = await tx.client.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Client not found.');
      if (before.releaseStatus === input.status && !input.note && !input.collectionDate)
        throw new BadRequestException('Add a note, a collection date, or a new status.');
      const changed = await tx.client.updateMany({ where: { id, version: input.version },
        data: { releaseStatus: input.status, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This client changed. Refresh and review the latest record.');
      const update = await tx.releaseUpdate.create({ data: { clientId: id, actorId: user.id, status: input.status,
        note: input.note, collectionDate: input.collectionDate ? new Date(`${input.collectionDate}T00:00:00Z`) : null } });
      await this.record(tx, user.id, 'client', id, 'release.updated', before,
        { status: update.status, note: update.note, collectionDate: input.collectionDate ?? null });
      await notifyCustomer(tx, id, 'release', 'Release update',
        `Your unit status is ${input.status.toLowerCase().replaceAll('_', ' ')}. Open your portal for the latest details.`, `/portal/release#release-update-${update.id}`);
      return { id: update.id, status: update.status.toLowerCase().replaceAll('_', ' '), note: update.note,
        collection_date: input.collectionDate ?? null, updated_at: update.createdAt.toISOString() };
    });
  }
  async schedule(user: User, id: string) {
    await this.client(user, id);
    return this.db.$transaction((tx) => this.readSchedule(tx, id), { isolationLevel: 'RepeatableRead' });
  }
  private async readSchedule(tx: Prisma.TransactionClient, id: string) {
    const items = await tx.scheduleItem.findMany({ where: { clientId: id }, orderBy: { sequenceNo: 'asc' } });
    if (!items.length) throw new ConflictException('This client does not have an issued schedule yet. Ask Records to review the batch terms.');
    const totalDue = items.reduce((sum, item) => sum.add(item.expectedAmount), new Prisma.Decimal(0)).toFixed(2);
    const verified = await verifiedTotals(tx, { clientId: id });
    const schedule = items.map((item) => ({
      id: item.id, sequenceNo: item.sequenceNo, dueDate: item.dueDate.toISOString().slice(0, 10),
      expectedAmount: item.expectedAmount.toFixed(2),
    }));
    return { clientId: id, totalDue, items: allocateVerifiedPayments(
      schedule, verified.effective.toFixed(2), new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ) };
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
  async account(id: string) {
    const result = await this.db.user.findUnique({ where: { id }, select: accountSelect });
    if (!result) throw new NotFoundException('Account not found.');
    return result;
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
  async hrAccessHistory(id: string, page: number) {
    if (!await this.db.user.findUnique({ where: { id }, select: { id: true } }))
      throw new NotFoundException('Account not found.');
    const where = { entity: 'account', recordId: id,
      action: { in: ['account.hr_access_granted', 'account.hr_access_revoked'] } };
    const [items, total] = await this.db.$transaction([
      this.db.auditEntry.findMany({ where, include: { actor: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.db.auditEntry.count({ where }),
    ]);
    return { items: items.map((item) => {
      const after = item.after as { reason?: string } | null;
      return { id: item.id, granted: item.action === 'account.hr_access_granted',
        reason: after?.reason ?? '', actorName: item.actor.name, createdAt: item.createdAt.toISOString() };
    }), total, page, pageSize };
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
      await notifyAccount(tx, user, null, result);
      return result;
    });
  }
  async updateAccount(
    user: User,
    id: string,
    input: { active?: boolean; role?: User['role']; hrConfidentialAccess?: boolean; hrAccessReason?: string },
    version: number,
  ) {
    return this.write(user, 'ACCOUNT_MANAGE', async (tx) => {
      const before = await tx.user.findUnique({ where: { id }, select: accountSelect });
      if (!before) throw new NotFoundException('Account not found.');
      if (before.version !== version)
        throw new ConflictException('This account has changed. Refresh and try again.');
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
      const nextRole = input.role ?? before.role;
      const nextActive = input.active ?? before.active;
      if (input.hrConfidentialAccess !== undefined) {
        if (nextRole === 'OWNER') throw new BadRequestException('Owner confidential HR access is automatic.');
        if (!input.hrAccessReason || input.hrAccessReason.trim().length < 3 || input.hrAccessReason.trim().length > 1000)
          throw new BadRequestException('Give a reason for the confidential HR access decision.');
        if (input.hrConfidentialAccess && (!eligibleForConfidentialHr(nextRole) || !nextActive))
          throw new BadRequestException('Only active HR / Payroll or COO accounts can receive confidential HR access.');
      }
      const hrConfidentialAccess = nextActive && eligibleForConfidentialHr(nextRole)
        ? input.hrConfidentialAccess ?? (roleChanged ? false : before.hrConfidentialAccess) : false;
      const hrChanged = hrConfidentialAccess !== before.hrConfidentialAccess;
      if (!roleChanged && !activeChanged && !hrChanged) return before;
      const updated = await tx.user.updateMany({
        where: { id, version },
        data: {
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.role ? { role: input.role } : {}),
          hrConfidentialAccess,
          version: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ConflictException('This account has changed. Refresh and try again.');
      if (input.active === false || roleChanged || hrChanged)
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      const after = await tx.user.findUniqueOrThrow({ where: { id }, select: accountSelect });
      if (roleChanged || activeChanged) {
        const action = roleChanged ? 'account.role_changed' : input.active ? 'account.activated' : 'account.deactivated';
        await this.record(tx, user.id, 'account', id, action, before, after);
      }
      if (hrChanged || (roleChanged && input.hrConfidentialAccess === true)) await this.record(tx, user.id, 'account', id,
        hrConfidentialAccess ? 'account.hr_access_granted' : 'account.hr_access_revoked',
        { granted: before.hrConfidentialAccess, role: before.role },
        { granted: hrConfidentialAccess, role: after.role,
          reason: input.hrAccessReason?.trim() ?? (roleChanged ? 'Access cleared after the account role changed.' : 'Access cleared after sign-in was deactivated.') });
      await notifyAccount(tx, user, before, after);
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
  async history(entity: 'batch' | 'client', id: string, page: number) {
    const record = entity === 'batch' ? await this.db.batch.findUnique({ where: { id }, select: { id: true } })
      : await this.db.client.findUnique({ where: { id }, select: { id: true } });
    if (!record) throw new NotFoundException('Record not found.');
    const where = { entity, recordId: id };
    const [rows, total] = await this.db.$transaction([
      this.db.auditEntry.findMany({ where, select: { id: true, action: true, createdAt: true,
        actor: { select: { name: true } }, before: true, after: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.db.auditEntry.count({ where }),
    ]);
    return { items: rows.map(({ before, after, ...entry }) => ({ ...entry,
      changes: historyChanges(entity, entry.action, before, after) })), total, page, pageSize };
  }
  async overview(user: User) {
    const [activeBatches, clients, readyForRelease, employees] = await Promise.all([
      allowed(user, 'BATCH_READ') ? this.db.batch.count({ where: { status: 'ACTIVE', ...batchScope(user) } }) : null,
      allowed(user, 'CLIENT_READ') ? this.db.client.count({ where: clientScope(user) }) : null,
      allowed(user, 'CLIENT_READ')
        ? this.db.client.count({ where: { releaseStatus: 'READY', ...clientScope(user) } })
        : null,
      allowed(user, 'ACCOUNT_MANAGE')
        ? this.db.user.count({ where: { active: true, role: { not: 'CUSTOMER' } } })
        : null,
    ]);
    return { activeBatches, clients, readyForRelease, employees };
  }
}
