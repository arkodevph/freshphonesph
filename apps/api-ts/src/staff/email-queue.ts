import { accountAlertKinds, rolePermissions, type AccountAlertKind, type StaffEmailKind, type TaskAlertKind, type User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Prisma } from '../generated/prisma/client';

export const defaultStaffSubject = 'Fresh Phones PH · {title}';
export const defaultStaffBody = '{title}\n\n{message}\n\nOpen Freshphones: {url}\n\nFresh Phones PH';
export const staffEmailWindowMs = 23 * 60 * 60_000;
export const staffEmailTitles: Record<StaffEmailKind, string> = {
  TASK_ASSIGNED: 'Task assigned to you', TASK_DUE_SOON: 'Your task deadline is approaching', TASK_OVERDUE: 'Your task is overdue',
  FINANCE_PENDING: 'Payment awaiting Finance review', PAYMENT_VERIFIED: 'Finance verified a payment',
  PAYMENT_REJECTED: 'Finance rejected a payment', PAYMENT_CLARIFICATION: 'Finance needs payment clarification',
  SUPPORT_NEW_CASE: 'Support case needs assignment', SUPPORT_ASSIGNED: 'Support case assigned to you',
  SUPPORT_CUSTOMER_REPLY: 'Customer replied to a support case',
  ACCOUNT_CREATED: 'Staff account created', ACCOUNT_ROLE_CHANGED: 'Staff account role changed',
  ACCOUNT_ACTIVATED: 'Staff sign-in access activated', ACCOUNT_DEACTIVATED: 'Staff sign-in access deactivated',
};
export const hasResultEmailAccess = (user: Pick<User, 'role'>) => user.role !== 'CUSTOMER' &&
  allowed(user, 'PAYMENT_READ') && allowed(user, 'PAYMENT_RECORD');

export function taskEmailStage(deadline: Date, now: Date, dueSoonHours: number, overdueHours: number): TaskAlertKind | null {
  const remaining = deadline.getTime() - now.getTime();
  if (remaining < -overdueHours * 3_600_000) return 'TASK_OVERDUE';
  if (remaining >= 0 && remaining <= dueSoonHours * 3_600_000) return 'TASK_DUE_SOON';
  return null;
}
export async function staffTemplate(tx: Prisma.TransactionClient, kind: StaffEmailKind) {
  const stored = await tx.staffEmailTemplate.findUnique({ where: { kind } });
  return { enabled: stored?.enabled ?? true, subject: stored?.subject ?? defaultStaffSubject, body: stored?.body ?? defaultStaffBody };
}
type QueueInput = Pick<Prisma.StaffEmailCreateManyInput, 'userId' | 'kind' | 'recipientEmail' | 'message' | 'targetPath' | 'dedupeKey'> &
  Partial<Pick<Prisma.StaffEmailCreateManyInput, 'taskId' | 'deadline' | 'paymentId' | 'paymentVersion' | 'resultId' | 'supportAlertId' | 'accountAlertId'>>;
async function queue(tx: Prisma.TransactionClient, rows: QueueInput[]) {
  if (!rows.length) return;
  const template = await staffTemplate(tx, rows[0]!.kind);
  if (!template.enabled) return;
  await tx.staffEmail.createMany({ skipDuplicates: true, data: rows.map((row) => ({ ...row,
    title: staffEmailTitles[row.kind], subjectTemplate: template.subject, bodyTemplate: template.body,
  })) });
}
export async function queueTaskEmail(tx: Prisma.TransactionClient, task: {
  id: string; title: string; assigneeId: string; deadline: Date; priority: string;
}, kind: TaskAlertKind) {
  const assignee = await tx.user.findUnique({ where: { id: task.assigneeId } });
  if (!assignee?.active || assignee.role === 'CUSTOMER') return;
  const deadline = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(task.deadline);
  await queue(tx, [{ userId: assignee.id, recipientEmail: assignee.email, kind,
    taskId: task.id, deadline: task.deadline,
    dedupeKey: `task:${task.id}:${assignee.id}:${kind}:${task.deadline.toISOString()}`,
    message: `Task: ${task.title}\nDeadline: ${deadline} (Philippine time). Priority: ${task.priority}. Open the task to review its instructions and submit your work.`,
    targetPath: `/system/tasks?task=${task.id}`,
  }]);
}
export async function queuePendingEmails(tx: Prisma.TransactionClient, payment: { id: string; version: number; status: string }) {
  if (payment.status !== 'PENDING') return;
  const reviewers = (Object.keys(rolePermissions) as User['role'][]).filter((role) => role !== 'CUSTOMER' && allowed({ role }, 'PAYMENT_VERIFY'));
  const users = await tx.user.findMany({ where: { active: true, role: { in: reviewers } }, select: { id: true, email: true } });
  await queue(tx, users.map((user) => ({ userId: user.id, recipientEmail: user.email, kind: 'FINANCE_PENDING',
    paymentId: payment.id, paymentVersion: payment.version,
    dedupeKey: `pending:${payment.id}:${payment.version}:${user.id}`,
    message: 'A staff-recorded payment awaits your Finance review. Open the payment to check its current details and evidence before deciding.',
    targetPath: `/system/payments?payment=${payment.id}`,
  })));
}
export async function queueResultEmails(tx: Prisma.TransactionClient, results: { id: string; userId: string; paymentId: string; paymentVersion: number; decision: string }[]) {
  if (!results.length) return;
  const kind: StaffEmailKind = results[0]!.decision === 'VERIFIED' ? 'PAYMENT_VERIFIED' : results[0]!.decision === 'REJECTED' ? 'PAYMENT_REJECTED' : 'PAYMENT_CLARIFICATION';
  const users = await tx.user.findMany({ where: { id: { in: results.map((row) => row.userId) } }, select: { id: true, email: true } });
  await queue(tx, results.map((result) => ({ userId: result.userId, recipientEmail: users.find((user) => user.id === result.userId)!.email, kind,
    resultId: result.id, paymentId: result.paymentId, paymentVersion: result.paymentVersion,
    dedupeKey: `result:${result.id}`,
    message: kind === 'PAYMENT_CLARIFICATION' ? 'Finance requested clarification on a recorded payment. Open your saved Finance result to read the notes and review the current payment before making corrections.'
      : 'Finance completed a review of a recorded payment. Open your saved Finance result to read the decision and notes and check the current payment record.',
    targetPath: `/system/payments?payment=${result.paymentId}&result=${result.id}`,
  })));
}
export async function queueSupportEmails(tx: Prisma.TransactionClient, alerts: {
  id: string; userId: string; caseId: string; kind: 'SUPPORT_NEW_CASE' | 'SUPPORT_ASSIGNED' | 'SUPPORT_CUSTOMER_REPLY';
}[]) {
  if (!alerts.length) return;
  const users = await tx.user.findMany({ where: { id: { in: alerts.map((row) => row.userId) } }, select: { id: true, email: true } });
  await queue(tx, alerts.map((alert) => ({ userId: alert.userId, recipientEmail: users.find((user) => user.id === alert.userId)!.email,
    kind: alert.kind, supportAlertId: alert.id, dedupeKey: `support:${alert.id}`,
    message: alert.kind === 'SUPPORT_NEW_CASE' ? 'A Customer Service case needs an assignee. Open the current case to review it and assign responsibility.'
      : alert.kind === 'SUPPORT_ASSIGNED' ? 'A Customer Service case was assigned to you. Open the current case to review its concern and conversation.'
        : 'A customer replied to a Customer Service case awaiting staff attention. Open the current conversation before responding.',
    targetPath: `/system/support?case=${alert.caseId}`,
  })));
}
export async function queueAccountEmails(tx: Prisma.TransactionClient, alerts: {
  id: string; userId: string; accountId: string; kind: AccountAlertKind;
}[]) {
  if (!alerts.length) return;
  const users = await tx.user.findMany({ where: { id: { in: alerts.map((row) => row.userId) } }, select: { id: true, email: true } });
  for (const kind of accountAlertKinds) await queue(tx, alerts.filter((alert) => alert.kind === kind).map((alert) => ({
    userId: alert.userId, recipientEmail: users.find((user) => user.id === alert.userId)!.email,
    kind, accountAlertId: alert.id, dedupeKey: `account:${alert.id}`,
    message: 'A staff account event requires Owner review. Open the authenticated account directory to review its current role and sign-in access. The bell preserves the event details.',
    targetPath: `/system/team?account=${alert.accountId}`,
  })));
}
