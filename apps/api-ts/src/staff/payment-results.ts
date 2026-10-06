import { rolePermissions, type PaymentStatus, type User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Prisma } from '../generated/prisma/client';
import { queueResultEmails } from './email-queue';

export const canReadPaymentResults = (user: Pick<User, 'role'>) =>
  user.role !== 'CUSTOMER' && allowed(user, 'PAYMENT_READ') && allowed(user, 'PAYMENT_RECORD');

/** Capture the decision and recipients inside the same audited Finance transaction. */
export async function notifyPaymentResult(tx: Prisma.TransactionClient, payment: {
  id: string; version: number; status: PaymentStatus; amount: Prisma.Decimal; recordedById: string;
  verificationNotes: string | null; verifier: { name: string } | null;
  client: { name: string; batch: { code: string } };
}) {
  const recorderRoles = (Object.keys(rolePermissions) as User['role'][])
    .filter((role) => canReadPaymentResults({ role }));
  const recipients = await tx.user.findMany({ where: { active: true, OR: [
    { role: 'RECORDS' }, { id: payment.recordedById, role: { in: recorderRoles } },
  ] }, select: { id: true } });
  if (!recipients.length) return;
  const results = await tx.paymentResultAlert.createManyAndReturn({ data: recipients.map((recipient) => ({
      userId: recipient.id, paymentId: payment.id, paymentVersion: payment.version,
      decision: payment.status, amount: payment.amount, clientName: payment.client.name,
      batchCode: payment.client.batch.code, notes: payment.verificationNotes ?? '',
      verifierName: payment.verifier!.name,
    })), select: { id: true, userId: true, paymentId: true, paymentVersion: true, decision: true } });
  await tx.changeEvent.createMany({ data: results.map((result) => ({ entity: 'payment-result', recordId: result.id })) });
  await queueResultEmails(tx, results);
}
