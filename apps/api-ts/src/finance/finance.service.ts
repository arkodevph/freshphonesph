import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  PaymentInput,
  PaymentStatus,
  Permission,
  User,
} from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';
import { notifyCustomer } from '../portal/notifications.service';

const pageSize = 20;
const paymentInclude = {
  client: { select: { id: true, name: true, batch: { select: { id: true, code: true } } } },
  recordedBy: { select: { id: true, name: true } },
  verifier: { select: { id: true, name: true } },
  proofFile: { select: { id: true } },
} as const;
type Query = {
  page: number;
  q: string;
  id?: string;
  status?: string;
  batchId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
};
type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class FinanceService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService,
  ) {}

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
    paymentId: string,
    action: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditEntry.create({
      data: {
        actorId,
        action,
        entity: 'payment',
        recordId: paymentId,
        ...(before ? { before: json(before) } : {}),
        after: json(after),
      },
    });
    await tx.changeEvent.create({ data: { entity: 'payment', recordId: paymentId } });
  }

  private async duplicateReference(
    tx: Prisma.TransactionClient | Database,
    clientId: string,
    referenceNumber: string | null,
    excludeId?: string,
  ) {
    if (!referenceNumber) return false;
    return Boolean(await tx.payment.findFirst({
      where: {
        clientId,
        referenceNumber: { equals: referenceNumber, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    }));
  }

  private async view(tx: Prisma.TransactionClient | Database, payment: PaymentRow) {
    return {
      ...payment,
      amount: payment.amount.toFixed(2),
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      duplicateReference: await this.duplicateReference(
        tx, payment.clientId, payment.referenceNumber, payment.id,
      ),
    };
  }

  private scope(user: User): Prisma.PaymentWhereInput {
    if (user.role === 'CUSTOMER') {
      if (!user.clientId) throw new ForbiddenException('Customer account is not linked.');
      return { clientId: user.clientId, status: 'VERIFIED' };
    }
    return {};
  }

  async customerPending(user: User) {
    if (user.role !== 'CUSTOMER' || !user.clientId)
      throw new ForbiddenException('A linked customer account is required.');
    const rows = await this.db.payment.findMany({
      where: { clientId: user.clientId, status: 'PENDING' },
      select: { id: true, amount: true, paymentDate: true, method: true, referenceNumber: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
    });
    return rows.map((row) => ({ id: row.id, amount: row.amount.toFixed(2),
      payment_date: row.paymentDate.toISOString(), method: row.method,
      reference_no: row.referenceNumber, recorded_at: row.createdAt.toISOString() }));
  }

  async payments(user: User, query: Query) {
    const where: Prisma.PaymentWhereInput = {
      ...this.scope(user),
      ...(query.id ? { id: query.id } : {}),
      OR: query.q ? [
        { referenceNumber: { contains: query.q, mode: 'insensitive' } },
        { client: { name: { contains: query.q, mode: 'insensitive' } } },
        { batch: { code: { contains: query.q, mode: 'insensitive' } } },
      ] : undefined,
    };
    if (query.status) {
      if (!['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_CLARIFICATION'].includes(query.status))
        throw new BadRequestException('Invalid payment status.');
      if (user.role !== 'CUSTOMER') where.status = query.status as PaymentStatus;
    }
    if (query.batchId) where.batchId = query.batchId;
    if (query.clientId) {
      if (user.role === 'CUSTOMER' && query.clientId !== user.clientId)
        throw new NotFoundException('Client not found.');
      where.clientId = query.clientId;
    }
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    const [items, total] = await this.db.$transaction([
      this.db.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.payment.count({ where }),
    ]);
    return {
      items: await Promise.all(items.map((payment) => this.view(this.db, payment))),
      total,
      page: query.page,
      pageSize,
    };
  }

  async create(user: User, input: PaymentInput) {
    return this.write(user, 'PAYMENT_RECORD', async (tx) => {
      const client = await tx.client.findUnique({ where: { id: input.clientId } });
      if (!client) throw new NotFoundException('Client not found.');
      if (input.scheduleItemId) {
        const item = await tx.scheduleItem.findFirst({
          where: { id: input.scheduleItemId, clientId: input.clientId },
        });
        if (!item) throw new BadRequestException('Installment does not belong to this client.');
      }
      const payment = await tx.payment.create({
        data: {
          clientId: input.clientId,
          batchId: client.batchId,
          scheduleItemId: input.scheduleItemId || null,
          amount: input.amount,
          paymentDate: new Date(input.paymentDate),
          method: input.method,
          referenceNumber: input.referenceNumber || null,
          notes: input.notes || null,
          recordedById: user.id,
        },
        include: paymentInclude,
      });
      await this.record(tx, user.id, payment.id, 'payment.recorded', null, payment);
      return this.view(tx, payment);
    });
  }

  async correct(user: User, id: string, input: PaymentInput, version: number) {
    return this.write(user, 'PAYMENT_RECORD', async (tx) => {
      const before = await tx.payment.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Payment not found.');
      if (!['PENDING', 'NEEDS_CLARIFICATION'].includes(before.status))
        throw new ConflictException('Verified or rejected payments are immutable. Record an audited adjustment instead.');
      const client = await tx.client.findUnique({ where: { id: input.clientId } });
      if (!client) throw new NotFoundException('Client not found.');
      if (input.scheduleItemId && !await tx.scheduleItem.findFirst({
        where: { id: input.scheduleItemId, clientId: input.clientId }, select: { id: true },
      })) throw new BadRequestException('Installment does not belong to this client.');
      const changed = await tx.payment.updateMany({
        where: { id, version, status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } },
        data: {
          clientId: input.clientId,
          batchId: client.batchId,
          scheduleItemId: input.scheduleItemId || null,
          amount: input.amount,
          paymentDate: new Date(input.paymentDate),
          method: input.method,
          referenceNumber: input.referenceNumber || null,
          notes: input.notes || null,
          status: 'PENDING',
          verificationNotes: null,
          verifierId: null,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException('This payment changed while you were editing. Refresh and review it.');
      const after = await tx.payment.findUniqueOrThrow({ where: { id }, include: paymentInclude });
      await this.record(tx, user.id, id, 'payment.corrected', before, after);
      return this.view(tx, after);
    });
  }

  async decide(
    user: User,
    id: string,
    decision: Exclude<PaymentStatus, 'PENDING'>,
    notes: string,
    version: number,
  ) {
    return this.write(user, 'PAYMENT_VERIFY', async (tx) => {
      const before = await tx.payment.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Payment not found.');
      if (before.status !== 'PENDING')
        throw new ConflictException('Only pending payments can receive a Finance decision.');
      const changed = await tx.payment.updateMany({
        where: { id, version, status: 'PENDING' },
        data: {
          status: decision,
          verificationNotes: notes,
          verifierId: user.id,
          verifiedAt: decision === 'VERIFIED' ? new Date() : null,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException('This payment was already reviewed. Refresh the queue.');
      const after = await tx.payment.findUniqueOrThrow({ where: { id }, include: paymentInclude });
      await this.record(tx, user.id, id, `payment.${decision.toLowerCase()}`, before, after);
      if (decision === 'VERIFIED')
        await notifyCustomer(tx, after.clientId, 'payment', 'Payment verified', 'Finance verified a payment. Your balance and payment history have been updated.', `/portal/financial-document?payment=${after.id}`);
      return this.view(tx, after);
    });
  }

  async attachProof(user: User, id: string, upload?: PrivateUpload) {
    const file = this.storage.validate(upload);
    const storageKey = await this.storage.save(file);
    try {
      return await this.write(user, 'PAYMENT_RECORD', async (tx) => {
        const before = await tx.payment.findUnique({ where: { id } });
        if (!before) throw new NotFoundException('Payment not found.');
        if (!['PENDING', 'NEEDS_CLARIFICATION'].includes(before.status))
          throw new ConflictException('Proof cannot be changed after the Finance decision.');
        if (before.proofFileId) throw new ConflictException('This payment already has a proof file.');
        const stored = await tx.storedFile.create({
          data: {
            storageKey,
            originalName: file.originalname.slice(0, 255) || 'receipt',
            mimeType: file.mimetype,
            size: file.size,
            uploadedById: user.id,
          },
        });
        const after = await tx.payment.update({
          where: { id }, data: { proofFileId: stored.id, version: { increment: 1 } },
          include: paymentInclude,
        });
        await this.record(tx, user.id, id, 'payment.proof_attached', before, {
          ...after, proofFile: { id: stored.id, mimeType: stored.mimeType, size: stored.size },
        });
        return this.view(tx, after);
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async proof(user: User, id: string) {
    const payment = await this.db.payment.findFirst({
      where: { ...this.scope(user), id, proofFileId: { not: null } },
      select: { status: true, proofFile: true },
    });
    if (!payment?.proofFile || (user.role === 'CUSTOMER' && payment.status !== 'VERIFIED'))
      throw new NotFoundException('Receipt proof not found.');
    return {
      data: await this.storage.read(payment.proofFile.storageKey),
      mimeType: payment.proofFile.mimeType,
      originalName: payment.proofFile.originalName,
    };
  }

  async balance(user: User, clientId: string) {
    if (user.role === 'CUSTOMER' && user.clientId !== clientId)
      throw new NotFoundException('Client not found.');
    const client = await this.db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException('Client not found.');
    const [schedule, verified, pending] = await this.db.$transaction([
      this.db.scheduleItem.aggregate({ where: { clientId }, _sum: { expectedAmount: true } }),
      this.db.payment.aggregate({ where: { clientId, status: 'VERIFIED' }, _sum: { amount: true } }),
      this.db.payment.aggregate({ where: { clientId, status: 'PENDING' }, _sum: { amount: true } }),
    ]);
    const totalDue = schedule._sum.expectedAmount ?? new Prisma.Decimal(0);
    const verifiedPaid = verified._sum.amount ?? new Prisma.Decimal(0);
    const pendingAmount = pending._sum.amount ?? new Prisma.Decimal(0);
    const difference = totalDue.sub(verifiedPaid);
    return {
      clientId,
      totalDue: totalDue.toFixed(2),
      verifiedPaid: verifiedPaid.toFixed(2),
      remainingBalance: Prisma.Decimal.max(difference, 0).toFixed(2),
      overpaid: Prisma.Decimal.max(difference.negated(), 0).toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
    };
  }

  async summary(user: User) {
    const scope = this.scope(user);
    if (user.role === 'CUSTOMER') {
      const verified = await this.db.payment.aggregate({
        where: scope, _sum: { amount: true }, _count: true,
      });
      return {
        verifiedCount: verified._count,
        verifiedAmount: (verified._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        pendingCount: 0,
        pendingAmount: '0.00',
        clarificationCount: 0,
      };
    }
    const [verified, pending, clarification] = await this.db.$transaction([
      this.db.payment.aggregate({ where: { ...scope, status: 'VERIFIED' }, _sum: { amount: true }, _count: true }),
      this.db.payment.aggregate({ where: { ...scope, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      this.db.payment.count({ where: { ...scope, status: 'NEEDS_CLARIFICATION' } }),
    ]);
    return {
      verifiedCount: verified._count,
      verifiedAmount: (verified._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      pendingCount: pending._count,
      pendingAmount: (pending._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      clarificationCount: clarification,
    };
  }

  async statement(user: User, clientId: string) {
    const balance = await this.balance(user, clientId);
    const payments = await this.db.payment.findMany({
      where: { ...this.scope(user), clientId, status: 'VERIFIED' },
      select: { id: true, amount: true, paymentDate: true, method: true, referenceNumber: true },
      orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      documentType: 'STATEMENT_OF_ACCOUNT',
      title: 'Statement of Account',
      officialTaxInvoice: false,
      notice: 'Operational account statement only. This is not an official BIR sales invoice.',
      generatedAt: new Date().toISOString(),
      balance,
      verifiedPayments: payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toFixed(2),
        paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      })),
    };
  }

  async confirmation(user: User, paymentId: string) {
    const payment = await this.db.payment.findFirst({
      where: { ...this.scope(user), id: paymentId, status: 'VERIFIED' },
      include: paymentInclude,
    });
    if (!payment) throw new NotFoundException('Verified payment not found.');
    return {
      documentType: 'PAYMENT_CONFIRMATION',
      title: 'Payment Confirmation',
      officialTaxInvoice: false,
      notice: 'Operational payment confirmation only. This is not an official BIR sales invoice.',
      generatedAt: new Date().toISOString(),
      payment: await this.view(this.db, payment),
    };
  }
}
