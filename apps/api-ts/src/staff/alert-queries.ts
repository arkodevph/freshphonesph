import type { StaffAlertScope, TaskAlertKind } from '@freshphones/contracts';
import { Prisma } from '../generated/prisma/client';

export const taskReminderHours = 24;
export function taskAlertKind(deadline: Date, now: Date): TaskAlertKind {
  const remaining = deadline.getTime() - now.getTime();
  if (remaining < 0) return 'TASK_OVERDUE';
  return remaining <= taskReminderHours * 3_600_000 ? 'TASK_DUE_SOON' : 'TASK_ASSIGNED';
}
// Prisma dates use UTC timestamps. Explicit UTC text avoids session-timezone conversion in raw SQL.
export const utcTimestamp = (date: Date) => date.toISOString().slice(0, 23).replace('T', ' ');
export function taskStageSql(now: Date) {
  return Prisma.sql`CASE WHEN t.deadline < ${utcTimestamp(now)}::timestamp THEN 'TASK_OVERDUE'
    WHEN t.deadline <= ${utcTimestamp(now)}::timestamp + INTERVAL '24 hours' THEN 'TASK_DUE_SOON'
    ELSE 'TASK_ASSIGNED' END`;
}
export function taskAlertRows(userId: string, now: Date) {
  return Prisma.sql`
    SELECT t.id, NULL::uuid AS "paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId", t.version, 'task'::text AS entity, stage.kind, NULL::text AS amount,
      NULL::text AS "clientName", NULL::text AS "batchCode", t.title AS "taskTitle", t.deadline,
      t."createdAt", t."updatedAt", CASE WHEN r.deadline = t.deadline THEN r."readAt" ELSE NULL END AS "readAt",
      CASE stage.kind WHEN 'TASK_ASSIGNED' THEN t."createdAt"
        WHEN 'TASK_DUE_SOON' THEN GREATEST(t."createdAt", t.deadline - INTERVAL '24 hours')
        ELSE GREATEST(t."createdAt", t.deadline) END AS "occurredAt"
    FROM "Task" t CROSS JOIN LATERAL (SELECT ${taskStageSql(now)} AS kind) stage
    LEFT JOIN "TaskAlertRead" r ON r."taskId" = t.id AND r."userId" = ${userId}::uuid AND r.kind::text = stage.kind
    WHERE t."assigneeId" = ${userId}::uuid AND t.status IN ('TODO', 'IN_PROGRESS')
  `;
}
export function financeAlertRows(userId: string) {
  return Prisma.sql`
    SELECT p.id, p.id AS "paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId", p.version, 'payment'::text AS entity, 'FINANCE_PENDING'::text AS kind, p.amount::text AS amount,
      c.name AS "clientName", b.code AS "batchCode", NULL::text AS "taskTitle", NULL::timestamp AS deadline,
      p."createdAt", p."updatedAt", CASE WHEN r."seenVersion" >= p.version THEN r."readAt" ELSE NULL END AS "readAt",
      p."updatedAt" AS "occurredAt"
    FROM "Payment" p JOIN "Client" c ON c.id = p."clientId" JOIN "Batch" b ON b.id = p."batchId"
    LEFT JOIN "FinanceAlertRead" r ON r."paymentId" = p.id AND r."userId" = ${userId}::uuid
    WHERE p.status = 'PENDING'
  `;
}
export function alertScopeSql(scope: StaffAlertScope) {
  return scope === 'tasks' ? Prisma.sql`entity = 'task'` : scope === 'finance' ? Prisma.sql`entity = 'payment'`
    : scope === 'results' ? Prisma.sql`entity = 'payment-result'` : scope === 'support' ? Prisma.sql`entity = 'support'`
    : scope === 'accounts' ? Prisma.sql`entity = 'account'` : Prisma.sql`TRUE`;
}
export function paymentResultRows(userId: string) {
  return Prisma.sql`
    SELECT r.id, r."paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId", r."paymentVersion" AS version, 'payment-result'::text AS entity,
      CASE r.decision WHEN 'VERIFIED' THEN 'PAYMENT_VERIFIED' WHEN 'REJECTED' THEN 'PAYMENT_REJECTED'
        ELSE 'PAYMENT_CLARIFICATION' END AS kind,
      r.amount::text AS amount, r."clientName", r."batchCode", NULL::text AS "taskTitle", NULL::timestamp AS deadline,
      r."createdAt", r."createdAt" AS "updatedAt", r."readAt", r."createdAt" AS "occurredAt"
    FROM "PaymentResultAlert" r WHERE r."userId" = ${userId}::uuid
  `;
}
export async function markFinanceAlertsRead(tx: Prisma.TransactionClient, userId: string) {
  return tx.$executeRaw`
    INSERT INTO "FinanceAlertRead" ("userId", "paymentId", "seenVersion", "readAt")
    SELECT ${userId}::uuid, p.id, p.version, CURRENT_TIMESTAMP FROM "Payment" p WHERE p.status = 'PENDING'
    ON CONFLICT ("userId", "paymentId") DO UPDATE
      SET "seenVersion" = EXCLUDED."seenVersion", "readAt" = EXCLUDED."readAt"
      WHERE "FinanceAlertRead"."seenVersion" < EXCLUDED."seenVersion"
  `;
}
