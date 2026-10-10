import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RetentionPolicy, RetentionPreview, RetentionRequest, User, retentionPolicySchema, retentionQuerySchema, retentionRequestSchema } from '@freshphones/contracts';
import type { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Database } from '../database';
import { CONFIG, type Config } from '../config';
import { allowed, requireCurrentUser } from '../auth/access';
import { Prisma, type RetentionPolicy as PolicyRow } from '../generated/prisma/client';
import { PrivateStorageService, type LocalMailCopy } from '../storage/private-storage.service';
import { describe, fingerprint, redactSnapshot, type Manifest, type Target } from './manifest';

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const requestInclude = { policy: true, files: { orderBy: { id: 'asc' } } } as const;
type RequestRow = Prisma.RetentionRequestGetPayload<{ include: typeof requestInclude }>;
const names = async (tx: Prisma.TransactionClient, ids: (string | null)[]) => new Map((await tx.user.findMany({
  where: { id: { in: ids.filter((id): id is string => !!id) } }, select: { id: true, name: true },
})).map(person => [person.id, { id: person.id, name: person.name }]));

@Injectable()
export class RetentionService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(PrivateStorageService) private readonly storage: PrivateStorageService,
    @Inject(CONFIG) private readonly config: Config) {}
  private write<T>(user: User, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'RETENTION_MANAGE')) throw new ForbiddenException('Your retention access has changed.');
      return run(tx);
    }, { timeout: 30_000 });
  }
  private async audit(tx: Prisma.TransactionClient, user: User, id: string, action: string, evidence: object) {
    await tx.auditEntry.create({ data: { actorId: user.id, entity: 'retention', recordId: id, action: `retention.${action}`, after: json(evidence) } });
    await tx.changeEvent.create({ data: { entity: 'retention', recordId: id } });
  }
  private async policyView(tx: Prisma.TransactionClient, row: PolicyRow): Promise<RetentionPolicy> {
    const people = await names(tx, [row.approvedById]);
    return { ...row, approvedBy: row.approvedById ? people.get(row.approvedById) ?? null : null,
      approvedAt: row.approvedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
  }
  private async requestView(tx: Prisma.TransactionClient, row: RequestRow): Promise<RetentionRequest> {
    const people = await names(tx, [row.requestedById, row.decidedById, row.followupById]);
    return { id: row.id, scope: row.scope, subjectId: row.subjectId, policy: await this.policyView(tx, row.policy),
      reason: row.reason, status: row.status, version: row.version, createdAt: row.createdAt.toISOString(),
      requestedBy: people.get(row.requestedById) ?? { id: row.requestedById, name: 'Erased account' },
      decidedBy: row.decidedById ? people.get(row.decidedById) ?? { id: row.decidedById, name: 'Erased account' } : null,
      decisionReason: row.decisionReason, decidedAt: row.decidedAt?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null,
      followupBy: row.followupById ? people.get(row.followupById) ?? null : null, followupAt: row.followupAt?.toISOString() ?? null, followupReference: row.followupReference,
      files: row.files.map(({ id, status, attempts, error }) => ({ id, status, attempts, error })) };
  }
  async policies(user: User) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    return this.db.$transaction(async tx => ({ items: await Promise.all((await tx.retentionPolicy.findMany({
      orderBy: [{ scope: 'asc' }, { version: 'desc' }],
    })).map(row => this.policyView(tx, row))) }));
  }
  createPolicy(user: User, input: z.infer<typeof retentionPolicySchema>) {
    return this.write(user, async tx => {
      const previous = await tx.retentionPolicy.aggregate({ where: { scope: input.scope }, _max: { version: true } });
      const row = await tx.retentionPolicy.create({ data: { ...input, version: (previous._max.version ?? 0) + 1, createdById: user.id } });
      await this.audit(tx, user, row.id, 'policy_drafted', { scope: row.scope, version: row.version, days: row.days });
      return this.policyView(tx, row);
    });
  }
  activatePolicy(user: User, id: string, approvalReference: string) {
    return this.write(user, async tx => {
      const draft = await tx.retentionPolicy.findUnique({ where: { id } });
      if (!draft) throw new NotFoundException('Retention policy not found.');
      if (draft.status !== 'DRAFT') throw new ConflictException('Only a draft policy can be approved.');
      await tx.retentionPolicy.updateMany({ where: { scope: draft.scope, status: 'ACTIVE' }, data: { status: 'RETIRED' } });
      const row = await tx.retentionPolicy.update({ where: { id }, data: { status: 'ACTIVE', approvedById: user.id, approvedAt: new Date(), approvalReference } });
      await this.audit(tx, user, id, 'policy_approved', { scope: row.scope, version: row.version, days: row.days, approvalReference });
      return this.policyView(tx, row);
    });
  }
  private async previewIn(tx: Prisma.TransactionClient, target: Target, user: User, mailIndex?: () => Promise<LocalMailCopy[]>) {
    target = { scope: target.scope, subjectId: target.subjectId };
    const details = await describe(tx, target, user.id);
    const policy = await tx.retentionPolicy.findFirst({ where: { scope: target.scope, status: 'ACTIVE' } });
    const eligibleAt = policy ? new Date(details.anchorAt.getTime() + policy.days * 86_400_000) : null;
    const localCopies = policy && eligibleAt! <= new Date() && !details.blockers.length && details.mailRecipients.length
      ? await this.storage.localMailCopies(details.mailRecipients, mailIndex ? await mailIndex() : undefined) : [];
    details.manifest.mailIds = [...new Set([...details.manifest.mailIds, ...localCopies.map(copy => copy.id)])];
    details.state.push(localCopies);
    const blockers = [...details.blockers];
    if (!policy) blockers.unshift('No approved retention policy is active for this category.');
    else if (eligibleAt! > new Date()) blockers.push('The approved retention period has not elapsed.');
    const previewHash = fingerprint({ target, policyId: policy?.id, state: details.state, holds: details.holds.map(({ id, releasedAt }) => ({ id, releasedAt })), anchorAt: details.anchorAt });
    const preview: RetentionPreview = { ...target, label: details.label, anchorAt: details.anchorAt.toISOString(), eligibleAt: eligibleAt?.toISOString() ?? null,
      policy: policy ? await this.policyView(tx, policy) : null, blockers, previewHash,
      impact: { files: details.manifest.files.length, privateBytes: details.manifest.files.reduce((total, file) => total + file.size, 0),
        records: details.records, operation: target.scope === 'PRIVATE_FILE' ? 'Purge the private file and detach download references.' : 'Erase the profile and linked personal details; retain pseudonymous operational references.',
        retained: ['Deletion approvals, policy revisions, record identifiers and event timestamps.',
          ...(target.scope === 'CUSTOMER' ? ['Payment amounts, verification facts, schedules and aggregate reports.'] : []),
          ...(target.scope === 'EMPLOYEE' ? ['Completed task timing facts and pseudonymous actor references.'] : []),
          'Backups and externally delivered copies follow the policy’s separately managed instructions.'] } };
    return { preview, manifest: details.manifest };
  }
  async preview(user: User, target: Target) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    return this.db.$transaction(async tx => (await this.previewIn(tx, target, user)).preview, { isolationLevel: 'RepeatableRead', timeout: 30_000 });
  }
  async candidates(user: User, query: z.infer<typeof retentionQuerySchema>) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    const skip = (query.page - 1) * 20;
    return this.db.$transaction(async tx => {
      let ids: string[], total: number;
      if (query.scope === 'APPLICANT') {
        const where: Prisma.ApplicantWhereInput = { retentionErasedAt: null, ...(query.q ? { fullName: { contains: query.q, mode: 'insensitive' } } : {}) };
        const rows = await tx.applicant.findMany({ where, select: { id: true }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip, take: 20 });
        ids = rows.map(row => row.id); total = await tx.applicant.count({ where });
      } else if (query.scope === 'CUSTOMER') {
        const where: Prisma.ClientWhereInput = { retentionErasedAt: null, ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}) };
        ids = (await tx.client.findMany({ where, select: { id: true }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip, take: 20 })).map(row => row.id);
        total = await tx.client.count({ where });
      } else if (query.scope === 'EMPLOYEE') {
        const where: Prisma.UserWhereInput = { retentionErasedAt: null, role: { not: 'CUSTOMER' }, ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}) };
        ids = (await tx.user.findMany({ where, select: { id: true }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip, take: 20 })).map(row => row.id);
        total = await tx.user.count({ where });
      } else {
        const where: Prisma.StoredFileWhereInput = { purgePending: false, ...(query.q ? { originalName: { contains: query.q, mode: 'insensitive' } } : {}) };
        ids = (await tx.storedFile.findMany({ where, select: { id: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip, take: 20 })).map(row => row.id);
        total = await tx.storedFile.count({ where });
      }
      const items: RetentionPreview[] = [];
      let mailIndex: Promise<LocalMailCopy[]> | undefined;
      for (const id of ids) items.push((await this.previewIn(tx, { scope: query.scope, subjectId: id }, user,
        () => mailIndex ??= this.storage.localMailIndex())).preview);
      return { items, total, page: query.page, pageSize: 20 };
    }, { isolationLevel: 'RepeatableRead', timeout: 30_000 });
  }
  async requests(user: User, page: number) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    return this.db.$transaction(async tx => ({ items: await Promise.all((await tx.retentionRequest.findMany({ include: requestInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
    })).map(row => this.requestView(tx, row))), total: await tx.retentionRequest.count(), page, pageSize: 20 }));
  }
  request(user: User, input: z.infer<typeof retentionRequestSchema>) {
    return this.write(user, async tx => {
      const { preview, manifest } = await this.previewIn(tx, input, user);
      if (preview.blockers.length) throw new ConflictException(preview.blockers.join(' '));
      if (preview.previewHash !== input.previewHash) throw new ConflictException('This record changed. Review a fresh preview before requesting deletion.');
      const existing = await tx.retentionRequest.findFirst({ where: { scope: input.scope, subjectId: input.subjectId,
        status: { in: ['PENDING', 'APPROVED', 'FILES_PENDING'] } } });
      if (existing) throw new ConflictException('An open deletion request already exists for this record.');
      const row = await tx.retentionRequest.create({ data: { scope: input.scope, subjectId: input.subjectId, policyId: preview.policy!.id,
        reason: input.reason, previewHash: input.previewHash, manifest: json(manifest), requestedById: user.id }, include: requestInclude });
      await this.audit(tx, user, row.id, 'requested', { scope: row.scope, subjectId: row.subjectId, policyId: row.policyId, previewHash: row.previewHash, reason: row.reason });
      return this.requestView(tx, row);
    });
  }
  private async current(tx: Prisma.TransactionClient, id: string, version: number) {
    const row = await tx.retentionRequest.findUnique({ where: { id }, include: requestInclude });
    if (!row) throw new NotFoundException('Deletion request not found.');
    if (row.version !== version) throw new ConflictException('This request changed. Refresh and review it again.');
    return row;
  }
  private async checkApproval(tx: Prisma.TransactionClient, row: RequestRow, user: User) {
    const { preview, manifest } = await this.previewIn(tx, row, user);
    if (preview.blockers.length) throw new ConflictException(preview.blockers.join(' '));
    if (preview.policy!.id !== row.policyId || preview.previewHash !== row.previewHash)
      throw new ConflictException('The record or policy changed. Reject this request and request deletion from a fresh preview.');
    return manifest;
  }
  decide(user: User, id: string, input: { version: number; approved: boolean; reason: string }) {
    return this.write(user, async tx => {
      const row = await this.current(tx, id, input.version);
      if (!(input.approved ? row.status === 'PENDING' : ['PENDING', 'APPROVED'].includes(row.status)))
        throw new ConflictException('This request is no longer awaiting a decision.');
      if (input.approved) await this.checkApproval(tx, row, user);
      const changed = await tx.retentionRequest.update({ where: { id }, data: { status: input.approved ? 'APPROVED' : 'REJECTED',
        decidedById: user.id, decidedAt: new Date(), decisionReason: input.reason, version: { increment: 1 } }, include: requestInclude });
      await this.audit(tx, user, id, input.approved ? 'approved' : 'rejected', { reason: input.reason, version: changed.version });
      return this.requestView(tx, changed);
    });
  }
  async execute(user: User, id: string, input: { version: number; confirmation: string }) {
    await this.write(user, async tx => {
      const row = await this.current(tx, id, input.version);
      if (row.status !== 'APPROVED' || input.confirmation !== row.subjectId) throw new ConflictException('An approved request and matching record ID are required.');
      const manifest = await this.checkApproval(tx, row, user);
      await this.eraseRecords(tx, manifest);
      for (const file of manifest.files) {
        await tx.storedFile.update({ where: { id: file.id }, data: { purgePending: true, originalName: '[erased]', uploadedById: null } });
        await tx.retentionFileJob.create({ data: { requestId: id, fileId: file.id, storageKey: file.storageKey } });
      }
      for (const mailId of manifest.mailIds) await tx.retentionFileJob.create({ data: { requestId: id, fileId: mailId, kind: 'LOCAL_MAIL', storageKey: mailId } });
      const hasJobs = manifest.files.length + manifest.mailIds.length > 0;
      await tx.retentionRequest.update({ where: { id }, data: { status: hasJobs ? 'FILES_PENDING' : 'COMPLETED',
        completedAt: hasJobs ? null : new Date(), manifest: json({ ...manifest, files: manifest.files.map(({ id, size }) => ({ id, size })) }), version: { increment: 1 } } });
      await this.audit(tx, user, id, 'records_erased', { scope: row.scope, subjectId: row.subjectId, files: manifest.files.length, localMailCopies: manifest.mailIds.length });
    });
    return this.purge(user, id);
  }
  private async eraseRecords(tx: Prisma.TransactionClient, m: Manifest) {
    const now = new Date();
    const fileIds = m.files.map(file => file.id);
    await tx.payment.updateMany({ where: { proofFileId: { in: fileIds } }, data: { proofFileId: null, version: { increment: 1 } } });
    await tx.task.updateMany({ where: { attachmentFileId: { in: fileIds } }, data: { attachmentFileId: null, version: { increment: 1 } } });
    await tx.customerDocument.deleteMany({ where: { fileId: { in: fileIds } } });
    await tx.requirementDocument.deleteMany({ where: { storedFileId: { in: fileIds } } });
    await tx.applicantAttachment.deleteMany({ where: { storedFileId: { in: fileIds } } });
    await tx.taskAttachment.deleteMany({ where: { storedFileId: { in: fileIds } } });
    if (m.target.scope === 'APPLICANT') {
      await tx.legalAcknowledgement.deleteMany({ where: { applicantId: m.target.subjectId } });
      await tx.applicant.update({ where: { id: m.target.subjectId }, data: { fullName: 'Erased applicant', email: '', phone: '', message: '', reviewerNotes: '', reviewerId: null,
        retentionErasedAt: now, version: { increment: 1 } } });
    }
    if (m.target.scope === 'CUSTOMER') {
      await tx.clientRequirement.deleteMany({ where: { clientId: m.target.subjectId } });
      await tx.payment.updateMany({ where: { id: { in: m.paymentIds } }, data: { referenceNumber: '', receiptName: '', receiptPhone: '', notes: '', verificationNotes: '', version: { increment: 1 } } });
      await tx.supportMessage.deleteMany({ where: { caseId: { in: m.caseIds } } });
      await tx.supportCase.updateMany({ where: { id: { in: m.caseIds } }, data: { description: '[erased]', resolution: '[erased]', version: { increment: 1 } } });
      await tx.releaseUpdate.updateMany({ where: { clientId: m.target.subjectId }, data: { note: '' } });
    }
    if (m.target.scope === 'EMPLOYEE') {
      await tx.kpiReview.updateMany({ where: { taskId: { in: m.taskIds } }, data: { factualEvidence: '[erased]', evaluation: '[erased]', recommendation: '' } });
      await tx.task.updateMany({ where: { id: { in: m.taskIds } }, data: { title: 'Erased task details', instructions: '', report: '', version: { increment: 1 } } });
      await tx.supportMessage.updateMany({ where: { authorId: m.target.subjectId }, data: { body: '[erased]' } });
      await tx.releaseUpdate.updateMany({ where: { actorId: m.target.subjectId }, data: { note: '' } });
    }
    for (const id of m.userIds) {
      await tx.session.deleteMany({ where: { userId: id } }); await tx.passwordReset.deleteMany({ where: { userId: id } });
      await tx.authSession.deleteMany({ where: { userId: id } });
      await tx.authVerification.deleteMany({ where: { userId: id } });
      await tx.authTwoFactor.deleteMany({ where: { userId: id } });
      await tx.authAccount.deleteMany({ where: { userId: id } });
      await tx.legalAcknowledgement.deleteMany({ where: { userId: id } });
      await tx.user.update({ where: { id }, data: { name: 'Erased account', email: `${id}@erased.invalid`, passwordHash: 'ERASED', active: false,
        hrConfidentialAccess: false, twoFactorEnabled: false, emailVerified: false, image: null, retentionErasedAt: now, version: { increment: 1 } } });
    }
    if (m.target.scope === 'CUSTOMER') await tx.client.update({ where: { id: m.target.subjectId }, data: {
      name: 'Erased customer', email: '', phone: '', joinedAt: null, retentionErasedAt: now, version: { increment: 1 } } });
    await tx.staffEmail.deleteMany({ where: { id: { in: m.mailIds } } });
    await tx.notification.deleteMany({ where: { id: { in: m.notificationIds } } });
    await tx.staffNotification.deleteMany({ where: { id: { in: m.staffNotificationIds } } });
    await tx.paymentResultAlert.deleteMany({ where: { OR: [{ paymentId: { in: m.paymentIds } }, { userId: { in: m.userIds } }] } });
    await tx.supportAlert.deleteMany({ where: { OR: [{ caseId: { in: m.caseIds } }, { userId: { in: m.userIds } }] } });
    await tx.accountAlert.deleteMany({ where: { OR: [{ accountId: { in: m.userIds } }, { userId: { in: m.userIds } }] } });
    for (const id of m.auditIds) {
      const row = await tx.auditEntry.findUniqueOrThrow({ where: { id } });
      await tx.auditEntry.update({ where: { id }, data: { before: row.before === null ? Prisma.DbNull : redactSnapshot(row.before),
        after: row.after === null ? Prisma.DbNull : redactSnapshot(row.after) } });
    }
    const entity = { APPLICANT: 'applicant', CUSTOMER: 'client', EMPLOYEE: 'account', PRIVATE_FILE: 'retention' }[m.target.scope];
    await tx.changeEvent.create({ data: { entity, recordId: m.target.subjectId } });
  }
  async purge(user: User, id: string) {
    // Jobs survive API restarts. Leases and fencing tokens prevent a stale runner from reporting another runner's work.
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    const request = await this.db.retentionRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Deletion request not found.');
    if (!['FILES_PENDING', 'COMPLETED'].includes(request.status)) throw new ConflictException('Execute the approved deletion before retrying file removal.');
    if (this.config.REDIS_URL) {
      return this.write(user, async tx => {
        const retried = await tx.retentionFileJob.updateMany({ where: { requestId: id, status: 'FAILED' },
          data: { status: 'PENDING', attempts: 0, nextAt: new Date(), error: null, leaseId: null, leaseUntil: null } });
        if (retried.count) await this.audit(tx, user, id, 'file_retry_requested', { jobs: retried.count });
        return this.requestView(tx, await tx.retentionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude }));
      });
    }
    const jobs = await this.db.retentionFileJob.findMany({ where: { requestId: id, status: { not: 'DELETED' } }, select: { id: true } });
    for (const candidate of jobs) {
      const job = await this.write(user, async tx => {
        const current = await tx.retentionFileJob.findUniqueOrThrow({ where: { id: candidate.id } });
        if (current.status === 'DELETED' || (current.status === 'RUNNING' && current.leaseUntil && current.leaseUntil > new Date())) return null;
        return tx.retentionFileJob.update({ where: { id: current.id }, data: { status: 'RUNNING', leaseId: randomUUID(), leaseUntil: new Date(Date.now() + 120_000), attempts: { increment: 1 }, error: null } });
      });
      if (!job) continue;
      let succeeded = false;
      try {
        if (job.kind === 'LOCAL_MAIL') await this.storage.eraseLocalMail(job.storageKey!);
        else await this.storage.erase(job.storageKey!);
        succeeded = true;
      } catch { /* Provider error details may contain credentials, keys or personal filenames. */ }
      await this.db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
        const current = await tx.retentionFileJob.findUniqueOrThrow({ where: { id: job.id } });
        if (current.leaseId !== job.leaseId || current.status !== 'RUNNING') return;
        if (succeeded && job.kind === 'PRIVATE_FILE') await tx.storedFile.deleteMany({ where: { id: job.fileId, purgePending: true } });
        await tx.retentionFileJob.update({ where: { id: job.id }, data: { status: succeeded ? 'DELETED' : 'FAILED',
          storageKey: succeeded ? null : current.storageKey, leaseId: null, leaseUntil: null, deletedAt: succeeded ? new Date() : null,
          error: succeeded ? null : 'Storage deletion was not confirmed. Retry after checking storage access.' } });
      });
    }
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const row = await tx.retentionRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
      if (row.status === 'FILES_PENDING' && row.files.every(file => file.status === 'DELETED')) {
        const completed = await tx.retentionRequest.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } }, include: requestInclude });
        await this.audit(tx, user, id, 'application_erasure_completed', { scope: row.scope, subjectId: row.subjectId });
        return this.requestView(tx, completed);
      }
      return this.requestView(tx, row);
    });
  }
  /** Only file jobs created by an already executed Owner deletion can be processed here. */
  async processFileJob(id: string) {
    const job = await this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const row = await tx.retentionFileJob.findUnique({ where: { id }, include: { request: true } });
      if (!row || row.request.status !== 'FILES_PENDING' || row.status === 'DELETED' || row.nextAt > new Date() ||
          row.status === 'RUNNING' && row.leaseUntil && row.leaseUntil > new Date()) return null;
      const execution = await tx.auditEntry.findFirst({ where: { entity: 'retention', recordId: row.requestId,
        action: 'retention.records_erased' }, select: { actorId: true } });
      if (!execution) return null;
      if (row.attempts >= 5) {
        await tx.retentionFileJob.update({ where: { id }, data: { status: 'FAILED', leaseId: null, leaseUntil: null,
          error: 'Maximum storage attempts reached. Owner review and retry required.' } });
        return null;
      }
      const claimed = await tx.retentionFileJob.update({ where: { id }, data: { status: 'RUNNING', leaseId: randomUUID(),
        leaseUntil: new Date(Date.now() + 120_000), attempts: { increment: 1 }, error: null } });
      return { ...claimed, actorId: execution.actorId };
    });
    if (!job) return;
    let succeeded = false;
    try {
      if (job.kind === 'LOCAL_MAIL') await this.storage.eraseLocalMail(job.storageKey!);
      else await this.storage.erase(job.storageKey!);
      succeeded = true;
    } catch { /* Keep provider errors and personal filenames out of Redis and logs. */ }
    await this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.retentionFileJob.findUnique({ where: { id } });
      if (!current || current.leaseId !== job.leaseId || current.status !== 'RUNNING') return;
      if (succeeded && job.kind === 'PRIVATE_FILE') await tx.storedFile.deleteMany({ where: { id: job.fileId, purgePending: true } });
      await tx.retentionFileJob.update({ where: { id }, data: { status: succeeded ? 'DELETED' : 'FAILED',
        storageKey: succeeded ? null : current.storageKey, leaseId: null, leaseUntil: null,
        nextAt: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60_000), deletedAt: succeeded ? new Date() : null,
        error: succeeded ? null : 'Storage deletion was not confirmed. Retry after checking storage access.' } });
      await tx.auditEntry.create({ data: { actorId: job.actorId, entity: 'retention', recordId: job.requestId, action: 'retention.worker_file_attempt',
        after: { jobId: id, attempt: job.attempts, status: succeeded ? 'DELETED' : 'FAILED' } } });
      await tx.changeEvent.create({ data: { entity: 'retention', recordId: job.requestId } });
      const request = await tx.retentionRequest.findUniqueOrThrow({ where: { id: job.requestId }, include: requestInclude });
      if (request.status === 'FILES_PENDING' && request.files.every(file => file.status === 'DELETED')) {
        await tx.retentionRequest.update({ where: { id: request.id }, data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } } });
        await tx.auditEntry.create({ data: { actorId: job.actorId, entity: 'retention', recordId: request.id, action: 'retention.application_erasure_completed',
          after: { scope: request.scope, subjectId: request.subjectId, executor: 'redis-worker' } } });
      }
    });
  }
  async holds(user: User, page: number) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    return this.db.$transaction(async tx => {
      const rows = await tx.retentionHold.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 });
      const people = await names(tx, rows.map(row => row.createdById));
      return { items: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), releasedAt: row.releasedAt?.toISOString() ?? null,
        createdBy: people.get(row.createdById) })), total: await tx.retentionHold.count(), page, pageSize: 20 };
    });
  }
  hold(user: User, target: Target & { reason: string }) {
    return this.write(user, async tx => {
      await describe(tx, target, user.id); // Existence is required; holds can protect records even without active policies.
      const row = await tx.retentionHold.create({ data: { scope: target.scope, subjectId: target.subjectId, reason: target.reason, createdById: user.id } });
      await this.audit(tx, user, row.id, 'hold_placed', { scope: row.scope, subjectId: row.subjectId, reason: row.reason });
      return { id: row.id };
    });
  }
  releaseHold(user: User, id: string, reason: string) {
    return this.write(user, async tx => {
      const row = await tx.retentionHold.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Hold not found.');
      if (row.releasedAt) throw new ConflictException('This hold has already been released.');
      await tx.retentionHold.update({ where: { id }, data: { releasedAt: new Date(), releasedById: user.id, releaseReason: reason } });
      await this.audit(tx, user, id, 'hold_released', { scope: row.scope, subjectId: row.subjectId, reason });
      return { id };
    });
  }
  confirmFollowup(user: User, id: string, input: { version: number; reference: string }) {
    return this.write(user, async tx => {
      const row = await this.current(tx, id, input.version);
      if (row.status !== 'COMPLETED' || row.followupAt) throw new ConflictException('Complete application erasure before recording the backup and external copy follow up.');
      const changed = await tx.retentionRequest.update({ where: { id }, data: { followupAt: new Date(), followupById: user.id,
        followupReference: input.reference, version: { increment: 1 } }, include: requestInclude });
      await this.audit(tx, user, id, 'followup_confirmed', { reference: input.reference });
      return this.requestView(tx, changed);
    });
  }
  async deletionLedger(user: User) {
    await requireCurrentUser(this.db, user, 'RETENTION_MANAGE');
    const rows = await this.db.retentionRequest.findMany({ where: { status: { in: ['FILES_PENDING', 'COMPLETED'] } },
      include: { policy: true, files: { select: { fileId: true, kind: true, status: true, deletedAt: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return { format: 'freshphones-retention-ledger-v1', exportedAt: new Date().toISOString(),
      records: rows.map(({ previewHash: _hash, ...row }) => row) };
  }
}
