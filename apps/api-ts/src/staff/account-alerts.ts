import type { AccountAlertKind, Role } from '@freshphones/contracts';
import { Prisma } from '../generated/prisma/client';
import { queueAccountEmails } from './email-queue';

export const accountAlertTitles: Record<AccountAlertKind, string> = {
  ACCOUNT_CREATED: 'Staff account created', ACCOUNT_ROLE_CHANGED: 'Staff account role changed',
  ACCOUNT_ACTIVATED: 'Staff sign-in access activated', ACCOUNT_DEACTIVATED: 'Staff sign-in access deactivated',
};
type AccountSnapshot = { id: string; name: string; role: Role; active: boolean; version: number };
/** Immutable events go to active Owners at commit, including a newly promoted Owner. */
export async function notifyAccount(tx: Prisma.TransactionClient, actor: { name: string }, before: AccountSnapshot | null, after: AccountSnapshot) {
  if (after.role === 'CUSTOMER' || before?.role === 'CUSTOMER') return;
  const kinds: AccountAlertKind[] = before ? [
    ...(before.role !== after.role ? ['ACCOUNT_ROLE_CHANGED' as const] : []),
    ...(before.active !== after.active ? [after.active ? 'ACCOUNT_ACTIVATED' as const : 'ACCOUNT_DEACTIVATED' as const] : []),
  ] : ['ACCOUNT_CREATED'];
  if (!kinds.length) return;
  const recipients = await tx.user.findMany({ where: { active: true, role: 'OWNER' }, select: { id: true } });
  if (!recipients.length) return;
  const alerts = await tx.accountAlert.createManyAndReturn({ skipDuplicates: true,
    data: recipients.flatMap((user) => kinds.map((kind) => ({ userId: user.id, accountId: after.id,
      accountVersion: after.version, kind, accountName: after.name, actorName: actor.name,
      previousRole: before?.role ?? null, role: after.role, previousActive: before?.active ?? null, active: after.active,
    }))), select: { id: true, userId: true, accountId: true, kind: true },
  });
  if (!alerts.length) return;
  await tx.changeEvent.createMany({ data: alerts.map((alert) => ({ entity: 'account-alert', recordId: alert.id })) });
  await queueAccountEmails(tx, alerts);
}
export function accountAlertVisibleSql(userId: string) {
  return Prisma.sql`r."userId" = ${userId}::uuid AND u.active AND u.role = 'OWNER'`;
}
export function accountAlertRows(userId: string) {
  return Prisma.sql`SELECT r.id, NULL::uuid AS "paymentId", NULL::uuid AS "caseId", r."accountId", r."accountVersion" AS version,
    'account'::text AS entity, r.kind::text AS kind, NULL::text AS amount, r."accountName" AS "clientName", r."actorName" AS "batchCode",
    CASE r.kind WHEN 'ACCOUNT_ROLE_CHANGED' THEN REPLACE(LOWER(r."previousRole"::text), '_', ' ') || ' → ' || REPLACE(LOWER(r.role::text), '_', ' ')
      WHEN 'ACCOUNT_CREATED' THEN 'Created with ' || REPLACE(LOWER(r.role::text), '_', ' ') || ' access'
      WHEN 'ACCOUNT_ACTIVATED' THEN 'Sign-in access activated' ELSE 'Sign-in access deactivated' END AS "taskTitle",
    NULL::timestamp AS deadline, r."createdAt", r."createdAt" AS "updatedAt", r."readAt", r."createdAt" AS "occurredAt"
    FROM "AccountAlert" r JOIN "User" u ON u.id = r."userId" WHERE ${accountAlertVisibleSql(userId)}`;
}
export async function accountAlertIsVisible(tx: Prisma.TransactionClient, userId: string, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT r.id FROM "AccountAlert" r JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${id}::uuid AND ${accountAlertVisibleSql(userId)}`;
  return rows.length > 0;
}
