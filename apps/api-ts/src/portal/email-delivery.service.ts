import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { allocateVerifiedPayments } from '../records/allocation';
import { NotificationSettingsService, renderCustomerEmail } from './notification-settings.service';

const philippineDate = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const address = (kind: string) => ({ payment: '/portal/payments', release: '/portal/release',
  support: '/portal/support', document: '/portal/documents', installment: '/portal/schedule' })[kind] ?? '/portal/notifications';

@Injectable()
export class EmailDeliveryService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  private reminderDay = '';
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config,
    @Inject(NotificationSettingsService) private readonly settings: NotificationSettingsService) {}

  onModuleInit() {
    if (this.config.NODE_ENV === 'test') return;
    this.timer = setInterval(() => { void this.run(); }, 30_000);
    this.timer.unref();
    void this.run();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async refreshReminders() { this.reminderDay = ''; await this.run(); }

  private async run() {
    if (this.busy) return;
    this.busy = true;
    try {
      const today = philippineDate();
      if (this.reminderDay !== today) {
        await this.queueReminders(today);
        this.reminderDay = today;
      }
      await this.deliver();
    } catch { console.error('Customer notification job failed.'); }
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
        const verified = await this.db.payment.aggregate({ where: { clientId: item.clientId, status: 'VERIFIED' }, _sum: { amount: true } });
        const pendingCount = await this.db.payment.count({ where: { clientId: item.clientId, status: 'PENDING' } });
        const allocation = allocateVerifiedPayments(all.map((row) => ({ sequenceNo: row.sequenceNo, dueDate: row.dueDate.toISOString().slice(0, 10), expectedAmount: row.expectedAmount.toFixed(2) })), (verified._sum.amount ?? 0).toString(), today);
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

  async deliver() {
    const now = new Date();
    const due = await this.db.notification.findMany({ where: { emailStatus: { in: ['PENDING', 'SENDING'] }, emailNextAt: { lte: now } },
      include: { user: { select: { email: true, active: true } } }, orderBy: { createdAt: 'asc' }, take: 20 });
    for (const notice of due) {
      const claimed = await this.db.notification.updateMany({ where: { id: notice.id, emailStatus: notice.emailStatus, emailNextAt: { lte: now } },
        data: { emailStatus: 'SENDING', emailAttempts: { increment: 1 }, emailNextAt: new Date(Date.now() + 2 * 60_000) } });
      if (!claimed.count) continue;
      if (!notice.user.active || Date.now() - notice.createdAt.getTime() > 23 * 60 * 60_000) {
        await this.db.notification.update({ where: { id: notice.id }, data: { emailStatus: notice.user.active ? 'FAILED' : 'SKIPPED', emailError: notice.user.active ? 'Delivery window expired; manual review required.' : null } });
        continue;
      }
      try {
        await this.send(notice.id, notice.user.email, notice.kind, notice.title, notice.message, notice.targetPath);
        await this.db.notification.update({ where: { id: notice.id }, data: { emailStatus: 'SENT', emailSentAt: new Date(), emailError: null } });
      } catch {
        const attempts = notice.emailAttempts + 1;
        await this.db.notification.update({ where: { id: notice.id }, data: {
          emailStatus: attempts >= 5 ? 'FAILED' : 'PENDING',
          emailNextAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
          emailError: 'Delivery failed; check provider or retry manually.',
        } });
        console.error('Customer notification email delivery failed.');
      }
    }
  }

  private async send(id: string, to: string, kind: string, title: string, message: string, targetPath: string | null) {
    const template = await this.settings.template(kind);
    const { subject, text } = renderCustomerEmail(template, { title, message, url: `${this.config.WEB_ORIGIN}${targetPath ?? address(kind)}` });
    if (this.config.NODE_ENV !== 'production') {
      const directory = join(process.cwd(), '.local/mail');
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(join(directory, `${id}.txt`), `To: ${to}\nSubject: ${subject}\n\n${text}`, { mode: 0o600 });
      return;
    }
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${this.config.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `notification/${id}` },
      body: JSON.stringify({ from: this.config.EMAIL_FROM, to: [to], subject, text }) });
    if (!response.ok) throw new Error('Email provider rejected notification.');
  }
}
