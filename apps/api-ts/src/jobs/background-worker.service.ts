import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { EmailDeliveryService } from '../portal/email-delivery.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RetentionService } from '../retention/retention.service';
import { heartbeatKey, namespace, redisConnection } from '../redis/connection';
import { relayChanges } from '../redis/event-relay';
import { controlQueueName, eventQueueName, deliveryQueueName, jobOptions, WorkQueueService } from './work-queue.service';

@Injectable()
export class BackgroundWorkerService implements OnModuleInit, OnModuleDestroy {
  private connection?: Redis;
  private workers: Worker[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private scheduling = false;
  constructor(@Inject(CONFIG) private readonly config: Config, @Inject(Database) private readonly db: Database,
    @Inject(WorkQueueService) private readonly queues: WorkQueueService,
    @Inject(EmailDeliveryService) private readonly emails: EmailDeliveryService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(RetentionService) private readonly retention: RetentionService) {}

  onModuleInit() {
    if (!this.config.REDIS_URL) throw new Error('Workers require REDIS_URL.');
    const connection = this.connection = redisConnection(this.config, true);
    const options = { connection, prefix: namespace(this.config), maxStalledCount: 2 };
    this.workers = [new Worker(eventQueueName, () => this.safe(() => relayChanges(this.db, this.queues.connection!, this.config)), { ...options, concurrency: 1 }),
      new Worker(controlQueueName, job => this.safe(() => this.maintain(job)), { ...options, concurrency: 1 }),
      new Worker(deliveryQueueName, job => this.safe(() => this.deliver(job)), { ...options, concurrency: 4 })];
    for (const worker of this.workers) {
      worker.on('error', () => { console.error('Redis worker connection or processing failed.'); });
      worker.on('failed', () => { console.error('Background job failed; bounded retries or database reconciliation will recover it.'); });
    }
    connection.on('ready', () => { void this.schedules(); });
    // Rebuild schedulers after lost Redis data, even when the connection stayed open.
    this.timer = setInterval(() => { void this.schedules(); }, 10_000);
    this.timer.unref();
    void this.schedules();
  }
  private async safe<T>(run: () => Promise<T>) {
    try { return await run(); }
    catch { throw new Error('Background processing failed. Retry or inspect database delivery status.'); }
  }
  private async schedules() {
    if (this.scheduling || this.queues.connection?.status !== 'ready') return;
    this.scheduling = true;
    try {
      for (const [name, every] of [['relay', 1000], ['reconcile', 5000], ['reminders', 30_000]] as const) {
        const queue = name === 'relay' ? this.queues.events! : this.queues.control!;
        if (!await queue.getJobScheduler(name))
          await queue.upsertJobScheduler(name, { every }, { name, data: {}, opts: jobOptions });
      }
    } catch { /* Retry registration when Redis reconnects. */ }
    finally { this.scheduling = false; }
  }
  private async maintain(job: Job) {
    if (job.name === 'reminders') {
      await this.emails.generateReminders();
      return;
    }
    if (job.name === 'operations-reminders') return this.notifications.runTaskReminders();
    if (job.name !== 'reconcile') throw new Error('Unknown maintenance job.');
    await this.reconcile();
    await this.queues.connection!.set(heartbeatKey(this.config), new Date().toISOString(), 'EX', 30);
  }
  async reconcile() {
    const now = new Date();
    const customers = await this.db.notification.findMany({ where: { emailStatus: { in: ['PENDING', 'SENDING'] }, emailNextAt: { lte: now } },
      select: { id: true, emailAttempts: true, emailNextAt: true }, orderBy: [{ emailNextAt: 'asc' }, { id: 'asc' }], take: 100 });
    for (const row of customers) await this.queues.enqueue('customer-email', row.id, `${row.emailAttempts}-${row.emailNextAt.getTime()}`);
    const staff = await this.db.staffEmail.findMany({ where: { status: { in: ['PENDING', 'SENDING'] }, nextAt: { lte: now } },
      select: { id: true, version: true }, orderBy: [{ nextAt: 'asc' }, { id: 'asc' }], take: 100 });
    for (const row of staff) await this.queues.enqueue('staff-email', row.id, String(row.version));
    const operations = await this.db.notificationDelivery.findMany({ where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 }, nextAttemptAt: { lte: now } },
      select: { id: true, attempts: true, nextAttemptAt: true }, orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take: 100 });
    for (const row of operations) await this.queues.enqueue('operations-email', row.id, `${row.attempts}-${row.nextAttemptAt.getTime()}`);
    const files = await this.db.retentionFileJob.findMany({ where: { request: { status: 'FILES_PENDING' }, nextAt: { lte: now },
      OR: [{ status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 } }, { status: 'RUNNING', OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] }] },
      select: { id: true, attempts: true, nextAt: true }, orderBy: [{ nextAt: 'asc' }, { id: 'asc' }], take: 100 });
    for (const row of files) await this.queues.enqueue('retention-file', row.id, `${row.attempts}-${row.nextAt.getTime()}`);
  }
  private async deliver(job: Job) {
    const id = job.data?.id;
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id) || Object.keys(job.data).length !== 1)
      throw new Error('Invalid background job identifier.');
    switch (job.name) {
      case 'customer-email': return this.emails.deliver(id, false);
      case 'staff-email': return this.emails.deliverStaff(id);
      case 'operations-email': return this.notifications.deliverPending(id);
      case 'retention-file': return this.retention.processFileJob(id);
      default: throw new Error('Unknown delivery job.');
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    const closing = Promise.all(this.workers.map(worker => worker.close(this.connection?.status !== 'ready')));
    const timeout = setTimeout(() => {
      this.connection?.disconnect();
      for (const worker of this.workers) void worker.close(true);
    }, 20_000);
    timeout.unref();
    try { await closing; } finally { clearTimeout(timeout); this.connection?.disconnect(); }
  }
}
