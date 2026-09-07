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
type Query = { page: number; q: string; status?: string };
const pageSize = 20;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

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
      items: items.map((b) => ({
        ...b,
        startDate: b.startDate.toISOString().slice(0, 10),
        endDate: b.endDate.toISOString().slice(0, 10),
      })),
      total,
      page: query.page,
      pageSize,
    };
  }
  async createBatch(user: User, input: BatchInput) {
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const result = await tx.batch.create({
        data: { ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) },
        include: batchInclude,
      });
      await this.record(tx, user.id, 'batch', result.id, 'batch.created', null, result);
      return result;
    });
  }
  async updateBatch(user: User, id: string, input: BatchInput, version: number) {
    return this.write(user, 'BATCH_MANAGE', async (tx) => {
      const before = await tx.batch.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Batch not found.');
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
      return after;
    });
  }
  async clients(query: Query) {
    const where: Prisma.ClientWhereInput = {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { batch: { code: { contains: query.q, mode: 'insensitive' } } },
      ],
    };
    if (query.status) {
      if (!['ACTIVE', 'ON_HOLD', 'COMPLETED'].includes(query.status))
        throw new BadRequestException('Invalid client status.');
      where.status = query.status as Prisma.EnumClientStatusFilter['equals'];
    }
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
    return { items, total, page: query.page, pageSize };
  }
  async client(user: User, id: string) {
    if (!allowed(user, 'CLIENT_READ') && !(user.role === 'CUSTOMER' && user.clientId === id))
      throw new NotFoundException('Client not found.');
    const client = await this.db.client.findUnique({ where: { id }, include: clientInclude });
    if (!client) throw new NotFoundException('Client not found.');
    return client;
  }
  private async enrollment(tx: Prisma.TransactionClient, batchId: string) {
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch || !['PLANNED', 'ACTIVE'].includes(batch.status))
      throw new BadRequestException('Choose a planned or active batch for enrollment.');
  }
  async createClient(user: User, input: ClientInput) {
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      await this.enrollment(tx, input.batchId);
      const result = await tx.client.create({ data: input, include: clientInclude });
      await this.record(tx, user.id, 'client', result.id, 'client.created', null, result);
      return result;
    });
  }
  async updateClient(user: User, id: string, input: ClientInput, version: number) {
    return this.write(user, 'CLIENT_MANAGE', async (tx) => {
      const before = await tx.client.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Client not found.');
      if (before.batchId !== input.batchId) await this.enrollment(tx, input.batchId);
      const changed = await tx.client.updateMany({
        where: { id, version },
        data: { ...input, version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException(
          'This client changed while you were editing. Refresh and review the latest record.',
        );
      const after = await tx.client.findUniqueOrThrow({ where: { id }, include: clientInclude });
      await this.record(tx, user.id, 'client', id, 'client.updated', before, after);
      return after;
    });
  }
  async accounts(query: Query) {
    const where: Prisma.UserWhereInput = {
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
  async updateAccount(user: User, id: string, active: boolean, version: number) {
    return this.write(user, 'ACCOUNT_MANAGE', async (tx) => {
      if (id === user.id && !active)
        throw new BadRequestException('You cannot deactivate your own account.');
      const before = await tx.user.findUnique({ where: { id }, select: accountSelect });
      if (!before) throw new NotFoundException('Account not found.');
      const updated = await tx.user.updateMany({
        where: { id, version },
        data: { active, version: { increment: 1 } },
      });
      if (!updated.count)
        throw new ConflictException('This account has changed. Refresh and try again.');
      if (!active)
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      const after = await tx.user.findUniqueOrThrow({ where: { id }, select: accountSelect });
      await this.record(
        tx,
        user.id,
        'account',
        id,
        active ? 'account.activated' : 'account.deactivated',
        before,
        after,
      );
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
