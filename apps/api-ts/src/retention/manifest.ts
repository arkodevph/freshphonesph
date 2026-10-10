import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import type { RetentionScope } from '@freshphones/contracts';
import { Prisma, type StoredFile } from '../generated/prisma/client';
import { verifiedTotals } from '../finance/ledger';

export type Target = { scope: RetentionScope; subjectId: string };
export type Manifest = {
  target: Target; files: { id: string; storageKey: string; size: number }[];
  recordIds: string[]; userIds: string[]; paymentIds: string[]; caseIds: string[]; taskIds: string[];
  mailIds: string[]; auditIds: string[]; notificationIds: string[]; staffNotificationIds: string[];
};
const maxActivity = (value: unknown, initial: Date): Date => {
  let result = initial;
  function visit(item: unknown) {
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      if (/^(createdAt|updatedAt|closedAt|reviewedAt|submittedAt|verifiedAt|acknowledgedAt)$/.test(key) && child instanceof Date && child > result) result = child;
      else if (typeof child === 'object') visit(child);
    }
  }
  visit(value);
  return result;
};
export function fingerprint(value: unknown): string {
  // Sort every object, including result rows, so database ordering does not create false conflicts.
  function canonical(item: unknown): unknown {
    if (item instanceof Date) return item.toISOString();
    if (item instanceof Prisma.Decimal) return item.toFixed(2);
    if (Array.isArray(item)) return item.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
    return item;
  }
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export async function describe(tx: Prisma.TransactionClient, target: Target, actorId: string) {
  const blockers: string[] = [];
  const manifest: Manifest = { target, files: [], recordIds: [target.subjectId], userIds: [], paymentIds: [], caseIds: [], taskIds: [],
    mailIds: [], auditIds: [], notificationIds: [], staffNotificationIds: [] };
  let label = '', anchorAt = new Date(), records = 1;
  const state: unknown[] = [];
  const addFiles = (files: StoredFile[]) => { for (const file of files) {
    if (file.purgePending) blockers.push('A linked file is already awaiting deletion.');
    if (!manifest.files.some(item => item.id === file.id)) manifest.files.push({ id: file.id, storageKey: file.storageKey, size: file.size });
    manifest.recordIds.push(file.id); state.push(file);
  } };
  const heldTargets: Target[] = [target];

  async function applicant(id: string, eraseProfile: boolean) {
    const row = await tx.applicant.findUnique({ where: { id }, include: { attachments: { include: { storedFile: true } }, legalAcknowledgements: true } });
    if (!row || row.retentionErasedAt) throw new NotFoundException('Application is unavailable or already erased.');
    if (!['HIRED', 'REJECTED'].includes(row.status)) blockers.push('The application must be finalized as hired or rejected.');
    heldTargets.push({ scope: 'APPLICANT', subjectId: id }); state.push(row); anchorAt = maxActivity(row, eraseProfile ? row.updatedAt : anchorAt);
    if (eraseProfile) {
      label = row.fullName; addFiles(row.attachments.map(item => item.storedFile));
      manifest.recordIds.push(...row.attachments.map(item => item.id), ...row.legalAcknowledgements.map(item => item.id));
      records += row.attachments.length + row.legalAcknowledgements.length;
    }
  }
  async function customer(id: string, eraseProfile: boolean) {
    const row = await tx.client.findUnique({ where: { id }, include: {
      account: true, schedule: true, payments: { include: { proofFile: true, adjustments: true } },
      supportCases: { include: { messages: true } }, releaseUpdates: true,
      documents: { include: { file: true } }, requirements: { include: { documents: { include: { storedFile: true } }, reviews: true } },
    } });
    if (!row || row.retentionErasedAt) throw new NotFoundException('Customer is unavailable or already erased.');
    if (row.status !== 'COMPLETED' || row.releaseStatus !== 'RELEASED') blockers.push('Complete the customer record and unit release first.');
    if (row.account?.active) blockers.push('Deactivate the customer portal account first.');
    if (row.supportCases.some(item => item.status !== 'CLOSED')) blockers.push('Close every support concern first.');
    if (row.payments.some(item => ['PENDING', 'NEEDS_CLARIFICATION'].includes(item.status))) blockers.push('Resolve pending payments and clarification first.');
    const due = row.schedule.reduce((total, item) => total.add(item.expectedAmount), new Prisma.Decimal(0));
    const paid = await verifiedTotals(tx, { clientId: id });
    if (!due.equals(paid.effective)) blockers.push('The scheduled balance and any overpayment must be fully resolved.');
    if (eraseProfile && row.payments.some(item => item.adjustments.length)) blockers.push('Finance adjustment evidence requires a separate approved disposition; it cannot be edited by this workflow.');
    heldTargets.push({ scope: 'CUSTOMER', subjectId: id });
    if (row.account) heldTargets.push({ scope: 'EMPLOYEE', subjectId: row.account.id });
    state.push(row); anchorAt = maxActivity(row, eraseProfile ? row.updatedAt : anchorAt);
    if (eraseProfile) {
      label = row.name;
      if (row.account) manifest.userIds.push(row.account.id);
      manifest.paymentIds.push(...row.payments.map(item => item.id)); manifest.caseIds.push(...row.supportCases.map(item => item.id));
      manifest.recordIds.push(...row.schedule.map(item => item.id), ...manifest.paymentIds, ...manifest.caseIds,
        ...row.supportCases.flatMap(item => item.messages.map(message => message.id)), ...row.releaseUpdates.map(item => item.id),
        ...row.documents.map(item => item.id), ...row.requirements.flatMap(item => [item.id, ...item.documents.map(doc => doc.id), ...item.reviews.map(review => review.id)]));
      addFiles([...row.documents.map(item => item.file), ...row.payments.flatMap(item => item.proofFile ? [item.proofFile] : []),
        ...row.requirements.flatMap(item => item.documents.map(doc => doc.storedFile))]);
      records += manifest.recordIds.length - 1;
    }
  }
  async function task(id: string, eraseProfile: boolean) {
    const row = await tx.task.findUniqueOrThrow({ where: { id }, include: { attachments: { include: { storedFile: true } }, attachment: true,
      review: { include: { hrActionRequests: true } } } });
    if (row.status !== 'DONE') blockers.push('Finish every linked task first.');
    if (row.review?.hrActionRequests.length) blockers.push('Linked HR action evidence requires a separate approved disposition.');
    heldTargets.push({ scope: 'EMPLOYEE', subjectId: row.assigneeId }, { scope: 'EMPLOYEE', subjectId: row.creatorId });
    state.push(row); anchorAt = maxActivity(row, anchorAt);
    if (eraseProfile) {
      manifest.taskIds.push(row.id); manifest.recordIds.push(row.id, ...row.attachments.map(item => item.id), ...(row.review ? [row.review.id] : []));
      addFiles([...row.attachments.map(item => item.storedFile), ...(row.attachment ? [row.attachment] : [])]);
      records += 1 + row.attachments.length + (row.review ? 1 : 0);
    }
  }
  if (target.scope === 'APPLICANT') await applicant(target.subjectId, true);
  else if (target.scope === 'CUSTOMER') await customer(target.subjectId, true);
  else if (target.scope === 'EMPLOYEE') {
    const row = await tx.user.findUnique({ where: { id: target.subjectId }, include: { sessions: true, legalAcknowledgements: true } });
    if (!row || row.retentionErasedAt || row.role === 'CUSTOMER') throw new NotFoundException('Employee is unavailable or already erased.');
    label = row.name; state.push(row); anchorAt = maxActivity(row, row.updatedAt); manifest.userIds.push(row.id);
    if (row.id === actorId || row.active) blockers.push('Only an inactive account belonging to another employee can be erased.');
    const batches = await tx.batch.findMany({ where: { handlerId: row.id, status: { in: ['PLANNED', 'ACTIVE'] } } });
    const cases = await tx.supportCase.findMany({ where: { assignedStaffId: row.id, status: { not: 'CLOSED' } } });
    if (batches.length || cases.length) blockers.push('Reassign active batches and open support concerns first.');
    const openCreated = await tx.task.count({ where: { creatorId: row.id, status: { not: 'DONE' } } });
    if (openCreated) blockers.push('Finish or transfer open tasks created by this employee first.');
    const tasks = await tx.task.findMany({ where: { assigneeId: row.id }, select: { id: true } });
    for (const item of tasks) await task(item.id, true);
    const protectedRecords = await tx.hrActionRequest.count({ where: { OR: [{ proposedById: row.id }, { decidedById: row.id }] } });
    const analyses = await tx.reportAnalysis.count({ where: { submittedById: row.id } });
    if (protectedRecords || analyses) blockers.push('Authored HR decisions or submitted report analysis require a separate approved disposition.');
    state.push(batches, cases, protectedRecords, analyses, openCreated);
    manifest.recordIds.push(...row.sessions.map(item => item.id), ...row.legalAcknowledgements.map(item => item.id));
    // Orphan uploads can use their own file policy. Files belonging to another person's work are never erased as employee uploads.
  } else {
    const file = await tx.storedFile.findUnique({ where: { id: target.subjectId }, include: {
      catalogItem: true, applicantAttachment: true, requirementDocument: true, document: true, payment: true, workAttachment: true, taskAttachment: true,
    } });
    if (!file || file.purgePending) throw new NotFoundException('Private file is unavailable or already awaiting deletion.');
    label = file.originalName; anchorAt = file.createdAt; addFiles([file]);
    if (file.catalogItem) blockers.push('This is a public catalog image. Manage it through the catalog.');
    if (file.applicantAttachment) await applicant(file.applicantAttachment.applicantId, false);
    const clients = [...new Set([file.requirementDocument?.clientId, file.document?.clientId, file.payment?.clientId].filter((id): id is string => !!id))];
    for (const id of clients) await customer(id, false);
    const tasks = [...new Set([file.workAttachment?.taskId, file.taskAttachment?.id].filter((id): id is string => !!id))];
    for (const id of tasks) await task(id, false);
    manifest.recordIds.push(...[file.requirementDocument?.id, file.document?.id, file.applicantAttachment?.id, file.workAttachment?.id, file.payment?.id, file.taskAttachment?.id].filter((id): id is string => !!id));
    state.push(file);
  }
  // A StoredFile can technically be linked by different tables. Never detach somebody else's copy as a side effect.
  if (target.scope !== 'PRIVATE_FILE') for (const item of manifest.files) {
    const file = await tx.storedFile.findUniqueOrThrow({ where: { id: item.id }, include: {
      catalogItem: true, applicantAttachment: true, requirementDocument: true, document: true, payment: true, workAttachment: true, taskAttachment: true,
    } });
    const otherApplicant = file.applicantAttachment && (target.scope !== 'APPLICANT' || file.applicantAttachment.applicantId !== target.subjectId);
    const otherCustomer = [file.requirementDocument?.clientId, file.document?.clientId, file.payment?.clientId].some(id => id && (target.scope !== 'CUSTOMER' || id !== target.subjectId));
    const otherTask = [file.workAttachment?.taskId, file.taskAttachment?.id].some(id => id && !manifest.taskIds.includes(id));
    if (file.catalogItem || otherApplicant || otherCustomer || otherTask) blockers.push('A linked file is shared with another record. Resolve its ownership before erasing this profile.');
    state.push(file);
  }
  for (const file of manifest.files) heldTargets.push({ scope: 'PRIVATE_FILE', subjectId: file.id });
  const holds = await tx.retentionHold.findMany({ where: { OR: heldTargets } });
  if (holds.some(hold => !hold.releasedAt)) blockers.push('An active legal or operational hold prevents this deletion.');
  if (manifest.userIds.length) {
    const authRows = await Promise.all([
      tx.authAccount.findMany({ where: { userId: { in: manifest.userIds } } }),
      tx.authSession.findMany({ where: { userId: { in: manifest.userIds } } }),
      tx.authVerification.findMany({ where: { userId: { in: manifest.userIds } } }),
      tx.authTwoFactor.findMany({ where: { userId: { in: manifest.userIds } } }),
    ]);
    state.push(authRows); for (const rows of authRows) manifest.recordIds.push(...rows.map(row => row.id));
  }
  manifest.recordIds.push(...manifest.userIds); manifest.recordIds = [...new Set(manifest.recordIds)];
  // Copy cleanup follows explicit foreign keys and identifiers in snapshots and notification links.
  const ids = manifest.recordIds;
  const emails = await tx.staffEmail.findMany({ where: { OR: [
    { userId: { in: manifest.userIds } }, { taskId: { in: manifest.taskIds } }, { paymentId: { in: manifest.paymentIds } },
    { supportAlert: { caseId: { in: manifest.caseIds } } }, { accountAlert: { accountId: { in: manifest.userIds } } },
  ] } });
  if (emails.some(item => item.status === 'SENDING')) blockers.push('Wait for in progress email delivery to finish.');
  const notices = await tx.notification.findMany({ where: { OR: [{ userId: { in: manifest.userIds } },
    ...ids.map(id => ({ targetPath: { contains: id } }))] } });
  if (notices.some(item => item.emailStatus === 'SENDING')) blockers.push('Wait for in progress customer email delivery to finish.');
  const staffNotices = await tx.staffNotification.findMany({ where: { OR: [{ recipientId: { in: manifest.userIds } },
    ...ids.map(id => ({ link: { contains: id } })), ...ids.map(id => ({ dedupeKey: { contains: id } }))] }, include: { deliveries: true } });
  manifest.mailIds = [...new Set([...emails.map(item => item.id), ...notices.map(item => item.id), ...staffNotices.map(item => item.id)])];
  manifest.notificationIds = notices.map(item => item.id); manifest.staffNotificationIds = staffNotices.map(item => item.id);
  const audits = ids.length ? await tx.$queryRaw<{ id: string; recordId: string; before: unknown; after: unknown }[]>(Prisma.sql`
    SELECT "id", "recordId", "before", "after" FROM "AuditEntry" WHERE "entity" NOT LIKE 'retention%'
    AND ("recordId" IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})
      OR ${Prisma.join(ids.map(id => Prisma.sql`COALESCE("before"::text, '') LIKE ${`%${id}%`} OR COALESCE("after"::text, '') LIKE ${`%${id}%`}`), ' OR ')})`) : [];
  manifest.auditIds = audits.map(item => item.id);
  const mailRecipients = (await tx.user.findMany({ where: { id: { in: manifest.userIds } }, select: { email: true } })).map(item => item.email);
  const extractEmails = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['email', 'recipientEmail', 'contact_email'].includes(key) && typeof child === 'string' && child.includes('@')) mailRecipients.push(child);
      else if (typeof child === 'object') extractEmails(child);
    }
  };
  for (const audit of audits) if (manifest.userIds.includes(audit.recordId)) { extractEmails(audit.before); extractEmails(audit.after); }
  // Notification read marks, retry counters and delivery state are excluded from the approval fingerprint.
  state.push(audits, emails.map(({ id, message, renderedBody, renderedSubject }) => ({ id, message, renderedBody, renderedSubject })),
    notices.map(({ id, title, message }) => ({ id, title, message })), staffNotices.map(({ id, title, body }) => ({ id, title, body })));
  return { label, anchorAt, blockers: [...new Set(blockers)], records, manifest, state, holds, mailRecipients: [...new Set(mailRecipients)] };
}

// Keep audit timestamps, record identifiers, enums and exact monetary facts; erase descriptive strings and embedded personal fields.
const safeStringKeys = /^(id|.*Id|status|role|source|method|action|entity|decision|kind|priority|releaseStatus|createdAt|updatedAt|verifiedAt|paymentDate|dueDate|startDate|endDate|periodStart|periodEnd|submittedAt|closedAt|reviewedAt|amount|amountDue|.*Amount|originalVerifiedAmount|adjustmentAmount|effectiveAmount|resultingAmount)$/;
export function redactSnapshot(value: unknown): Prisma.InputJsonValue {
  function visit(item: unknown, key = ''): unknown {
    if (typeof item === 'string') return safeStringKeys.test(key) ? item : '[erased]';
    if (Array.isArray(item)) return item.map(child => visit(child));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([name, child]) => [name, visit(child, name)]));
    return item;
  }
  return visit(value) as Prisma.InputJsonValue;
}
