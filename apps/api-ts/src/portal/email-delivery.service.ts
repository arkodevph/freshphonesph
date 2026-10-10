import { Inject, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG, hasProductionSender, hasResendTestSender, type Config } from '../config';
import { AuthService } from '../auth/auth.service';
import { Database } from '../database';
import { allocateVerifiedPayments } from '../records/allocation';
import { NotificationSettingsService, renderCustomerEmail } from './notification-settings.service';
import { StaffEmailService } from '../staff/staff-email.service';
import { verifiedTotals } from '../finance/ledger';
import { WorkQueueService } from '../jobs/work-queue.service';

const philippineDate = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const address = (kind: string) => ({ payment: '/portal/payments', release: '/portal/release',
  support: '/portal/support', document: '/portal/documents', installment: '/portal/schedule' })[kind] ?? '/portal/notifications';

@Injectable()
export class EmailDeliveryService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  private reminderDay = '';
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config,
    @Inject(NotificationSettingsService) private readonly settings: NotificationSettingsService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(StaffEmailService) private readonly staffEmails: StaffEmailService,
    @Inject(WorkQueueService) private readonly queues: WorkQueueService) {}

  onModuleInit() {
    if (this.config.NODE_ENV === 'test' || this.config.REDIS_URL) return;
    this.timer = setInterval(() => { void this.run(); }, 30_000);
    this.timer.unref();
    void this.run();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async refreshReminders() {
    this.reminderDay = '';
    if (!this.config.REDIS_URL) { await this.run(); return; }
    // Settings are already committed. A Redis outage must not undo the saved response;
    // the recurring worker reads current database settings when processing resumes.
    try { await this.queues.request('reminders'); } catch { /* Scheduled reconciliation recovers. */ }
  }
  async generateReminders() {
    await this.queueReminders(philippineDate());
    await this.staffEmails.queueReminders();
  }

  private async run() {
    if (this.busy) return;
    this.busy = true;
    try {
      const today = philippineDate();
      if (this.reminderDay !== today) {
        await this.queueReminders(today);
        this.reminderDay = today;
      }
      await this.staffEmails.queueReminders();
      await this.deliver();
    } catch { console.error('Notification job failed.'); }
    finally { this.busy = false; }
  }

  private async queueReminders(today: string) {
    const configured = await this.db.customerNotificationConfig.findUnique({ where: { key: 'customer' } });
    const offsets = [...new Set((configured?.reminderDays ?? this.config.CUSTOMER_REMINDER_DAYS_BEFORE).split(',').map((value) => value.trim()).filter(Boolean).map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 30))];
    for (const offset of offsets) {
      const target = new Date(`${today}T00:00:00Z`);
      target.setUTCDate(target.getUTCDate() + offset);
      const dueDate = target.toISOString().slice(0, 10);
      const due = await this.db.scheduleItem.findMany({ where: { dueDate: target }, include: { client: { include: { account: { select: { id: true, active: true } } } } } });
      for (const item of due) {
        if (!item.client.account?.active) continue;
        const all = await this.db.scheduleItem.findMany({ where: { clientId: item.clientId }, orderBy: { sequenceNo: 'asc' } });
        const verified = await this.db.$transaction((tx) => verifiedTotals(tx, { clientId: item.clientId }), { isolationLevel: 'RepeatableRead' });
        const pendingCount = await this.db.payment.count({ where: { clientId: item.clientId, status: 'PENDING' } });
        const allocation = allocateVerifiedPayments(all.map((row) => ({ sequenceNo: row.sequenceNo, dueDate: row.dueDate.toISOString().slice(0, 10), expectedAmount: row.expectedAmount.toFixed(2) })), verified.effective.toFixed(2), today);
        const current = allocation.find((row) => row.sequenceNo === item.sequenceNo);
        if (!current || current.status === 'PAID') continue;
        const outstanding = (Number(current.expectedAmount) - Number(current.paidApplied)).toFixed(2);
        const key = `installment:${item.id}:${offset}`;
        try {
          await this.db.$transaction(async (tx) => {
            const notification = await tx.notification.create({ data: { userId: item.client.account!.id, kind: 'installment', dedupeKey: key,
              title: offset === 0 ? 'Installment due today' : 'Upcoming installment',
              message: `Installment ${item.sequenceNo} is due ${dueDate}. Remaining scheduled amount: PHP ${outstanding}. ${pendingCount ? 'A staff-recorded payment is awaiting Finance review; it is not included in this amount. ' : ''}Coordinate payment in Messenger; only Finance-verified payments update your record.`,
              targetPath: `/portal/schedule#installment-${item.sequenceNo}`,
            } });
            await tx.changeEvent.create({ data: { entity: 'notification', recordId: notification.id } });
          });
        } catch (error) {
          if (typeof error !== 'object' || !error || !('code' in error) || error.code !== 'P2002') throw error;
        }
      }
    }
  }

  async deliver(onlyId?: string, includeStaff = true) {
    const now = new Date();
    const due = await this.db.notification.findMany({ where: { ...(onlyId ? { id: onlyId } : {}), emailStatus: { in: ['PENDING', 'SENDING'] }, emailNextAt: { lte: now } },
      select: { id: true }, orderBy: { createdAt: 'asc' }, take: 20 });
    for (const candidate of due) {
      const notice = await this.db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
        const current = await tx.notification.findUnique({ where: { id: candidate.id }, include: { user: true } });
        if (!current || !['PENDING', 'SENDING'].includes(current.emailStatus) || current.emailNextAt > new Date()) return null;
        if (!current.user.active || current.emailAttempts >= 5 || Date.now() - current.createdAt.getTime() >= 23 * 60 * 60_000 ||
            (current.emailRecipient && current.emailRecipient !== current.user.email)) {
          await tx.notification.update({ where: { id: current.id }, data: { emailStatus: !current.user.active || current.emailRecipient !== null && current.emailRecipient !== current.user.email ? 'SKIPPED' : 'FAILED', emailAttemptId: null } });
          return null;
        }
        const template = await this.settings.template(current.kind);
        const rendered = renderCustomerEmail(template, { title: current.title, message: current.message,
          url: `${this.config.WEB_ORIGIN}${current.targetPath ?? address(current.kind)}` });
        return tx.notification.update({ where: { id: candidate.id }, data: { emailStatus: 'SENDING', emailAttemptId: randomUUID(),
          emailSubject: current.emailSubject ?? rendered.subject, emailBody: current.emailBody ?? rendered.text,
          emailSender: current.emailSender ?? this.config.EMAIL_FROM, emailRecipient: current.emailRecipient ?? current.user.email,
          emailAttempts: { increment: 1 }, emailNextAt: new Date(Date.now() + 2 * 60_000) },
          include: { user: { select: { email: true, active: true } } } });
      });
      if (!notice) continue;
      try {
        await this.sendRendered(notice.id, notice.emailRecipient!, notice.emailSubject!, notice.emailBody!, notice.emailSender!, notice.emailAttemptId!);
        await this.db.notification.updateMany({ where: { id: notice.id, emailStatus: 'SENDING', emailAttemptId: notice.emailAttemptId }, data: { emailStatus: 'SENT', emailAttemptId: null, emailSentAt: new Date(), emailError: null } });
      } catch {
        const attempts = notice.emailAttempts;
        await this.db.notification.updateMany({ where: { id: notice.id, emailStatus: 'SENDING', emailAttemptId: notice.emailAttemptId }, data: {
          emailStatus: attempts >= 5 ? 'FAILED' : 'PENDING',
          emailAttemptId: null,
          emailNextAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
          emailError: 'Delivery failed; check provider or retry manually.',
        } });
        console.error('Customer notification email delivery failed.');
      }
    }
    if (includeStaff) await this.deliverStaff();
  }
  async deliverStaff(onlyId?: string) {
    await this.staffEmails.deliver((id, to, subject, body, sender, attemptId) => this.sendRendered(id, to, subject, body, sender, attemptId), onlyId);
  }

  async sendTestReminder(ownerId: string, to: string) {
    await this.auth.limit(`test-reminder:${ownerId}`, 3);
    if (!this.config.RESEND_API_KEY?.trim() || !(hasProductionSender(this.config.EMAIL_FROM) ||
      (this.config.NODE_ENV === 'development' && hasResendTestSender(this.config.EMAIL_FROM))))
      throw new ServiceUnavailableException('Real email is not configured. Add RESEND_API_KEY and an EMAIL_FROM sender to the API environment, then restart it.');
    const due = new Date(`${philippineDate()}T00:00:00Z`);
    due.setUTCDate(due.getUTCDate() + 3);
    const dueDate = due.toISOString().slice(0, 10);
    const template = await this.settings.template('installment');
    const rendered = renderCustomerEmail(template, {
      title: 'TEST · Upcoming installment',
      message: `This is a test reminder for ${dueDate}. Example remaining amount: PHP 5,000.00. No payment is due from this email. Only Finance-verified payments update your record.`,
      url: `${this.config.WEB_ORIGIN}/portal/schedule`,
    });
    await this.sendViaResend(randomUUID(), to, rendered.subject, rendered.text);
    return { sent: true };
  }

  private async sendRendered(id: string, to: string, subject: string, text: string, sender = this.config.EMAIL_FROM, attemptId?: string) {
    // Hold the same lock as erasure through the actual send, and recheck the lease and recipient.
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const notice = await tx.notification.findUnique({ where: { id }, include: { user: true } });
      const staff = notice ? null : await tx.staffEmail.findUnique({ where: { id } });
      if (notice ? notice.emailStatus !== 'SENDING' || notice.emailAttemptId !== attemptId || !notice.user.active || notice.user.email !== to :
          !staff || staff.status !== 'SENDING' || staff.attemptId !== attemptId || await this.staffEmails.eligibility(tx, staff, new Date()))
        throw new ServiceUnavailableException('Delivery is no longer eligible.');
      if (this.config.NODE_ENV !== 'production') {
        const directory = join(process.cwd(), '.local/mail');
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(join(directory, `${id}.txt`), `To: ${to}\nSubject: ${subject}\n\n${text}`, { mode: 0o600 });
        return;
      }
      await this.sendViaResend(id, to, subject, text, sender);
    }, { timeout: 20_000 });
  }

  private async sendViaResend(id: string, to: string, subject: string, text: string, sender = this.config.EMAIL_FROM) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${this.config.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `notification/${id}` },
      body: JSON.stringify({ from: sender, to: [to], subject, text }) });
    if (!response.ok) throw new ServiceUnavailableException(hasResendTestSender(this.config.EMAIL_FROM)
      ? 'Resend rejected the message. Its test sender can email only the address used to sign up for Resend.'
      : 'Email provider rejected the message. Check the sender and recipient settings.');
  }
}
