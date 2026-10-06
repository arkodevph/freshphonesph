import type { SupportAlertKind } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Prisma } from '../generated/prisma/client';
import { queueSupportEmails } from './email-queue';

export const supportAlertTitles: Record<SupportAlertKind, string> = {
  SUPPORT_NEW_CASE: 'Support case needs assignment', SUPPORT_ASSIGNED: 'Support case assigned to you',
  SUPPORT_CUSTOMER_REPLY: 'Customer replied to a support case',
};
/** Recipient snapshots are written with the case/message and its audit entry. */
export async function notifySupport(tx: Prisma.TransactionClient, supportCase: {
  id: string; version: number; assignedStaffId: string | null; status: string;
}, kind: SupportAlertKind) {
  if (['RESOLVED', 'CLOSED'].includes(supportCase.status)) return;
  let recipients: { id: string }[];
  if (supportCase.assignedStaffId) {
    const assignee = await tx.user.findUnique({ where: { id: supportCase.assignedStaffId } });
    if (assignee?.active && assignee.role !== 'CUSTOMER' && allowed(assignee, 'SUPPORT_MANAGE')) recipients = [{ id: assignee.id }];
    else recipients = await triageRecipients(tx);
  } else recipients = await triageRecipients(tx);
  if (!recipients.length) return;
  const alerts = await tx.supportAlert.createManyAndReturn({ skipDuplicates: true, data: recipients.map((user) => ({
    userId: user.id, caseId: supportCase.id, caseVersion: supportCase.version, kind,
  })), select: { id: true, userId: true, caseId: true, kind: true } });
  if (!alerts.length) return;
  await tx.changeEvent.createMany({ data: alerts.map((alert) => ({ entity: 'support-alert', recordId: alert.id })) });
  await queueSupportEmails(tx, alerts);
}
async function triageRecipients(tx: Prisma.TransactionClient) {
  const heads = await tx.user.findMany({ where: { active: true, role: 'CS_HEAD' }, select: { id: true } });
  return heads.length ? heads : tx.user.findMany({ where: { active: true, role: 'OWNER' }, select: { id: true } });
}
// Treat an inactive/no-longer-authorized assignee as a triage case without changing its record.
export function supportAlertVisibleSql(userId: string) {
  return Prisma.sql`r."userId" = ${userId}::uuid AND u.active AND u.role IN ('OWNER', 'CS_HEAD', 'CS_TEAM')
    AND r."handledAt" IS NULL AND c.status NOT IN ('RESOLVED', 'CLOSED') AND (
      c."assignedStaffId" = r."userId" OR (
        (c."assignedStaffId" IS NULL OR NOT EXISTS (SELECT 1 FROM "User" a WHERE a.id = c."assignedStaffId" AND a.active AND a.role IN ('OWNER', 'CS_HEAD', 'CS_TEAM')))
        AND (u.role = 'CS_HEAD' OR (u.role = 'OWNER' AND NOT EXISTS (SELECT 1 FROM "User" h WHERE h.active AND h.role = 'CS_HEAD')))
      )
    )`;
}
export function supportAlertRows(userId: string) {
  return Prisma.sql`SELECT r.id, NULL::uuid AS "paymentId", r."caseId", NULL::uuid AS "accountId", r."caseVersion" AS version, 'support'::text AS entity,
    r.kind::text AS kind, NULL::text AS amount, NULL::text AS "clientName", NULL::text AS "batchCode",
    NULL::text AS "taskTitle", NULL::timestamp AS deadline, r."createdAt", r."createdAt" AS "updatedAt", r."readAt", r."createdAt" AS "occurredAt"
    FROM "SupportAlert" r JOIN "SupportCase" c ON c.id = r."caseId" JOIN "User" u ON u.id = r."userId"
    WHERE ${supportAlertVisibleSql(userId)}`;
}
export async function supportAlertIsVisible(tx: Prisma.TransactionClient, userId: string, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT r.id FROM "SupportAlert" r
    JOIN "SupportCase" c ON c.id = r."caseId" JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${id}::uuid AND ${supportAlertVisibleSql(userId)}`;
  return rows.length > 0;
}
