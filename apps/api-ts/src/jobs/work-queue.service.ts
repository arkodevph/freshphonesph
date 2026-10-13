import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { CONFIG, type Config } from '../config';
import { heartbeatKey, namespace, redisConnection } from '../redis/connection';

export const controlQueueName = 'maintenance';
export const eventQueueName = 'event-relay';
export const deliveryQueueName = 'deliveries';
export const jobOptions: JobsOptions = {
  attempts: 5, backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600, count: 1000 }, removeOnFail: { age: 86400, count: 1000 },
};
export type DeliveryKind = 'customer-email' | 'staff-email' | 'operations-email' | 'retention-file';

@Injectable()
export class WorkQueueService implements OnApplicationShutdown {
  readonly control?: Queue;
  readonly events?: Queue;
  readonly deliveries?: Queue;
  readonly connection?: Redis;
  constructor(@Inject(CONFIG) readonly config: Config) {
    if (!config.REDIS_URL) return;
    const connection = this.connection = redisConnection(config);
    const options = { connection, prefix: namespace(config), defaultJobOptions: jobOptions };
    this.control = new Queue(controlQueueName, options);
    this.events = new Queue(eventQueueName, options);
    this.deliveries = new Queue(deliveryQueueName, options);
    this.control.on('error', () => {});
    this.events.on('error', () => {});
    this.deliveries.on('error', () => {});
  }
  async request(kind: 'reminders' | 'operations-reminders' | 'reconcile') {
    await this.control!.add(kind, {}, { deduplication: { id: kind } });
    return { queued: true };
  }
  async enqueue(kind: DeliveryKind, id: string, revision: string) {
    // Only opaque IDs reach Redis. A later reconciliation can recover an exhausted infrastructure job.
    return this.deliveries!.add(kind, { id }, {
      jobId: `${kind}-${id}-${revision}-${Math.floor(Date.now() / 60_000)}`,
      deduplication: { id: `${kind}-${id}` },
    });
  }
  async status() {
    if (!this.connection) return { mode: 'database-local', redis: 'disabled', worker: 'disabled' };
    try {
      if (this.connection.status !== 'ready') throw new Error();
      await this.connection.ping();
      const heartbeat = await this.connection.get(heartbeatKey(this.config));
      return { mode: 'redis', redis: 'connected', worker: heartbeat ? 'running' : 'unavailable',
        heartbeatAt: heartbeat, queues: {
          events: await this.events!.getJobCounts('waiting', 'active', 'delayed', 'failed'),
          maintenance: await this.control!.getJobCounts('waiting', 'active', 'delayed', 'failed'),
          deliveries: await this.deliveries!.getJobCounts('waiting', 'active', 'delayed', 'failed'),
        } };
    } catch { return { mode: 'redis', redis: 'unavailable', worker: 'unknown' }; }
  }
  async onApplicationShutdown() {
    // Stop new queue operations even if Redis is unavailable at shutdown.
    this.connection?.disconnect();
    await Promise.all([this.control?.close(), this.deliveries?.close(), this.events?.close()]);
  }
}
