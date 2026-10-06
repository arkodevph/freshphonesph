import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';

type Transaction = Prisma.TransactionClient;
type EventInput = {
  recipientId: string;
  eventKey: keyof typeof defaults;
  dedupeKey: string;
  variables: Record<string, string>;
  link?: string;
};

const defaults = {
  'payment.submitted': {
    title: 'Payment awaiting verification',
    body: '{{client}} submitted a payment of PHP {{amount}} for Finance review.',
    emailEnabled: true,
  },
  'payment.verified': {
    title: 'Payment verified',
    body: 'Your payment of PHP {{amount}} was verified. Your portal balance is updated.',
    emailEnabled: true,
  },
  'payment.rejected': {
    title: 'Payment needs attention',
    body: 'Your payment of PHP {{amount}} was rejected. Review the Finance note in your portal.',
    emailEnabled: true,
  },
  'payment.needs_clarification': {
    title: 'Payment clarification requested',
    body: 'Finance needs more information about your PHP {{amount}} payment.',
    emailEnabled: true,
  },
  'document.submitted': {
    title: 'Document ready for review',
    body: '{{client}} uploaded {{requirement}}.',
    emailEnabled: false,
  },
  'document.approved': {
    title: 'Document approved',
    body: 'Your {{requirement}} was approved.',
    emailEnabled: true,
  },
  'document.needs_clarification': {
    title: 'Document clarification requested',
    body: 'Please review and resubmit your {{requirement}}. Note: {{note}}',
    emailEnabled: true,
  },
  'client.release': {
    title: 'Release status updated',
    body: 'Your unit release status is now {{status}}.',
    emailEnabled: true,
  },
  'task.assigned': {
    title: 'New task assigned',
    body: '{{title}} is due {{deadline}}.',
    emailEnabled: true,
  },
  'task.reminder': {
    title: 'Task deadline approaching',
    body: '{{title}} is due {{deadline}}.',
    emailEnabled: true,
  },
  'task.overdue': {
    title: 'Task is overdue',
    body: '{{title}} passed its deadline on {{deadline}}. This is an objective timing notice only.',
    emailEnabled: true,
  },
  'support.updated': {
    title: 'Support case updated',
    body: 'Your {{category}} concern is now {{status}}.',
    emailEnabled: true,
  },
} as const;

const render = (template: string, variables: Record<string, string>) =>
  template.replace(/{{([a-zA-Z0-9_]+)}}/g, (_, key: string) => variables[key] ?? '');

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  async enqueue(tx: Transaction, input: EventInput) {
    const override = await tx.notificationTemplate.findUnique({ where: { key: input.eventKey } });
    const template = override?.active ? override : defaults[input.eventKey];
    const notification = await tx.staffNotification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        recipientId: input.recipientId,
        eventKey: input.eventKey,
        title: render(template.title, input.variables),
        body: render(template.body, input.variables),
        link: input.link,
        dedupeKey: input.dedupeKey,
        ...((override?.emailEnabled ?? template.emailEnabled)
          ? { deliveries: { create: {} } }
          : {}),
      },
    });
    await tx.changeEvent.create({ data: { entity: 'notification', recordId: notification.id } });
    return notification;
  }

  async enqueueRoles(tx: Transaction, roles: User['role'][], input: Omit<EventInput, 'recipientId' | 'dedupeKey'> & { dedupeKey: string }) {
    const recipients = await tx.user.findMany({
      where: { active: true, role: { in: roles } },
      select: { id: true },
    });
    await Promise.all(recipients.map((recipient) => this.enqueue(tx, {
      ...input,
      recipientId: recipient.id,
      dedupeKey: `${input.dedupeKey}:${recipient.id}`,
    })));
  }

  async list(user: User, page: number, unreadOnly = false) {
    const where: Prisma.StaffNotificationWhereInput = {
      recipientId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [items, total, unread] = await this.db.$transaction([
      this.db.staffNotification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.db.staffNotification.count({ where }),
      this.db.staffNotification.count({ where: { recipientId: user.id, readAt: null } }),
    ]);
    return { items, total, unread, page, pageSize: 20 };
  }

  async markRead(user: User, id: string) {
    const changed = await this.db.staffNotification.updateMany({
      where: { id, recipientId: user.id },
      data: { readAt: new Date() },
    });
    if (!changed.count) throw new NotFoundException('Notification not found.');
    return this.db.staffNotification.findUniqueOrThrow({ where: { id } });
  }

  async readAll(user: User) {
    const result = await this.db.staffNotification.updateMany({
      where: { recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  templates() {
    return this.db.notificationTemplate.findMany({ orderBy: { key: 'asc' } });
  }

  async createTemplate(user: User, input: {
    key: string; title: string; body: string; emailEnabled: boolean; active: boolean;
  }) {
    return this.db.$transaction(async (tx) => {
      const template = await tx.notificationTemplate.create({ data: input });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'notification_template.created', entity: 'notification_template',
        recordId: template.id, after: JSON.parse(JSON.stringify(template)) as Prisma.InputJsonValue,
      } });
      return template;
    });
  }

  async updateTemplate(user: User, id: string, input: {
    key: string; title: string; body: string; emailEnabled: boolean; active: boolean;
  }, version: number) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.notificationTemplate.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Notification template not found.');
      const changed = await tx.notificationTemplate.updateMany({ where: { id, version }, data: {
        ...input, version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This template changed. Refresh and try again.');
      const after = await tx.notificationTemplate.findUniqueOrThrow({ where: { id } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'notification_template.updated', entity: 'notification_template',
        recordId: id,
        before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue,
        after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue,
      } });
      return after;
    });
  }

  async runTaskReminders() {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await this.db.task.findMany({
      where: { status: { in: ['TODO', 'IN_PROGRESS'] }, deadline: { lte: soon } },
      select: { id: true, title: true, assigneeId: true, deadline: true },
      take: 500,
    });
    await this.db.$transaction(async (tx) => {
      for (const task of tasks) {
        const overdue = task.deadline < now;
        await this.enqueue(tx, {
          recipientId: task.assigneeId,
          eventKey: overdue ? 'task.overdue' : 'task.reminder',
          dedupeKey: `task:${task.id}:${overdue ? 'overdue' : 'reminder'}:${task.deadline.toISOString()}`,
          variables: { title: task.title, deadline: task.deadline.toLocaleString('en-PH') },
          link: '/system/tasks',
        });
      }
    });
    return { considered: tasks.length };
  }

  async deliverPending() {
    const queued = await this.db.notificationDelivery.count({
      where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 }, nextAttemptAt: { lte: new Date() } },
    });
    if (!this.config.RESEND_API_KEY) return { processed: 0, queued, providerConfigured: false };
    const deliveries = await this.db.notificationDelivery.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 }, nextAttemptAt: { lte: new Date() } },
      include: { notification: { include: { recipient: { select: { email: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    for (const delivery of deliveries) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: this.config.EMAIL_FROM,
            to: [delivery.notification.recipient.email],
            subject: `${delivery.notification.title} — Fresh Phones PH`,
            text: delivery.notification.body,
          }),
        });
        if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
        await this.db.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'SENT', attempts: { increment: 1 }, sentAt: new Date(), lastError: null,
        } });
      } catch (error) {
        const attempts = delivery.attempts + 1;
        await this.db.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'FAILED', attempts,
          nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60 * 1000),
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed.',
        } });
      }
    }
    return { processed: deliveries.length, queued, providerConfigured: true };
  }
}
