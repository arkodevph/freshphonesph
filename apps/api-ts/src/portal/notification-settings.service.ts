import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { CONFIG, hasProductionSender, hasResendTestSender, type Config } from '../config';
import { Prisma } from '../generated/prisma/client';

export const customerEmailKinds = ['payment', 'release', 'support', 'document', 'installment'] as const;
export type CustomerEmailKind = typeof customerEmailKinds[number];
export const defaultCustomerSubject = 'Fresh Phones PH · {title}';
export const defaultCustomerBody = '{title}\n\n{message}\n\nView your account: {url}\n\nFresh Phones PH';
const auditIds: Record<CustomerEmailKind | 'reminders', string> = {
  payment: '7617ca2f-0f72-40c3-b32e-28152d60e301', release: '7617ca2f-0f72-40c3-b32e-28152d60e302',
  support: '7617ca2f-0f72-40c3-b32e-28152d60e303', document: '7617ca2f-0f72-40c3-b32e-28152d60e304',
  installment: '7617ca2f-0f72-40c3-b32e-28152d60e305', reminders: '7617ca2f-0f72-40c3-b32e-28152d60e306',
};

export function renderCustomerEmail(template: { subject: string; body: string }, values: { title: string; message: string; url: string }) {
  const replace = (input: string) => input.replaceAll('{title}', values.title).replaceAll('{message}', values.message).replaceAll('{url}', values.url);
  return { subject: replace(template.subject), text: replace(template.body) };
}

@Injectable()
export class NotificationSettingsService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config) {}
  async list() {
    const [stored, config] = await Promise.all([this.db.customerEmailTemplate.findMany(), this.db.customerNotificationConfig.findUnique({ where: { key: 'customer' } })]);
    return { reminderDays: config?.reminderDays ?? this.config.CUSTOMER_REMINDER_DAYS_BEFORE, reminderVersion: config?.version ?? 0,
      testEmailConfigured: Boolean(this.config.RESEND_API_KEY?.trim() &&
        (hasProductionSender(this.config.EMAIL_FROM) ||
          (this.config.NODE_ENV === 'development' && hasResendTestSender(this.config.EMAIL_FROM)))),
      usingResendTestSender: this.config.NODE_ENV === 'development' && hasResendTestSender(this.config.EMAIL_FROM),
      templates: customerEmailKinds.map((kind) => {
        const row = stored.find((item) => item.kind === kind);
        return { kind, subject: row?.subject ?? defaultCustomerSubject, body: row?.body ?? defaultCustomerBody, version: row?.version ?? 0 };
      }) };
  }
  async template(kind: string) {
    const row = await this.db.customerEmailTemplate.findUnique({ where: { kind } });
    return { subject: row?.subject ?? defaultCustomerSubject, body: row?.body ?? defaultCustomerBody };
  }
  private async write<T>(user: User, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'ACCOUNT_MANAGE')) throw new ForbiddenException('Your access has changed.');
      return run(tx);
    });
  }
  async updateTemplate(user: User, kind: CustomerEmailKind, input: { version: number; subject: string; body: string }) {
    return this.write(user, async (tx) => {
      const before = await tx.customerEmailTemplate.findUnique({ where: { kind } });
      if ((before?.version ?? 0) !== input.version) throw new ConflictException('Template changed. Refresh and review the latest wording.');
      const after = before ? await tx.customerEmailTemplate.update({ where: { kind }, data: { subject: input.subject, body: input.body, version: { increment: 1 } } })
        : await tx.customerEmailTemplate.create({ data: { kind, subject: input.subject, body: input.body } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'customer_email_template.updated', entity: 'customer_email_template', recordId: auditIds[kind],
        before: before ? { subject: before.subject, body: before.body, version: before.version } : Prisma.JsonNull,
        after: { subject: after.subject, body: after.body, version: after.version } } });
      return { kind, subject: after.subject, body: after.body, version: after.version };
    });
  }
  async updateReminders(user: User, input: { version: number; reminderDays: string }) {
    return this.write(user, async (tx) => {
      const before = await tx.customerNotificationConfig.findUnique({ where: { key: 'customer' } });
      if ((before?.version ?? 0) !== input.version) throw new ConflictException('Reminder settings changed. Refresh and review the latest values.');
      const after = before ? await tx.customerNotificationConfig.update({ where: { key: 'customer' }, data: { reminderDays: input.reminderDays, version: { increment: 1 } } })
        : await tx.customerNotificationConfig.create({ data: { key: 'customer', reminderDays: input.reminderDays } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'customer_reminders.updated', entity: 'customer_notification_config', recordId: auditIds.reminders,
        before: before ? { reminderDays: before.reminderDays, version: before.version } : Prisma.JsonNull,
        after: { reminderDays: after.reminderDays, version: after.version } } });
      return { reminderDays: after.reminderDays, version: after.version };
    });
  }
}
