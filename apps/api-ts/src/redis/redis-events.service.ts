import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import type { Redis } from 'ioredis';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { redisConnection, streamKey } from './connection';

export type LiveHint = { entity: string; recordId: string } | null;
const compare = (a: string, b: string) => {
  const [aTime, aSeq] = a.split('-').map(BigInt), [bTime, bSeq] = b.split('-').map(BigInt);
  return aTime === bTime ? (aSeq < bSeq ? -1 : aSeq > bSeq ? 1 : 0) : aTime < bTime ? -1 : 1;
};

@Injectable()
export class RedisEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly events = new EventEmitter();
  private reader?: Redis;
  private running?: Promise<void>;
  private stopped = false;
  private generation = 0;
  readonly enabled: boolean;
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config) {
    this.enabled = Boolean(config.REDIS_URL);
    this.events.setMaxListeners(0);
  }
  subscribe(listener: (hint: LiveHint) => void) {
    this.events.on('hint', listener);
    return () => { this.events.off('hint', listener); };
  }
  onModuleInit() {
    if (!this.enabled) return;
    this.reader = redisConnection(this.config, true);
    this.reader.on('ready', () => { this.generation++; });
    this.reader.on('close', () => { this.events.emit('hint', null); });
    this.running = this.read();
  }
  async onModuleDestroy() {
    this.stopped = true;
    this.reader?.disconnect();
    await this.running;
    this.events.removeAllListeners();
  }
  private async read() {
    const redis = this.reader!, key = streamKey(this.config);
    let cursor = '0-0', generation = -1, nextCheck = 0;
    while (!this.stopped) {
      try {
        if (redis.status !== 'ready') { await delay(250); continue; }
        if (generation !== this.generation) {
          // New/reconnected readers catch up through an authorized HTTP snapshot.
          const latest = await redis.xrevrange(key, '+', '-', 'COUNT', 1);
          cursor = latest[0]?.[0] ?? '0-0';
          generation = this.generation;
          nextCheck = 0;
          this.events.emit('hint', null);
        }
        if (Date.now() >= nextCheck) {
          const first = await redis.xrange(key, '-', '+', 'COUNT', 1);
          const last = await redis.xrevrange(key, '+', '-', 'COUNT', 1);
          if (cursor !== '0-0' && (!first.length || compare(first[0][0], cursor) > 0 || compare(last[0][0], cursor) < 0)) {
            cursor = last[0]?.[0] ?? '0-0';
            this.events.emit('hint', null);
          }
          nextCheck = Date.now() + 15_000;
        }
        const result = await redis.xread('COUNT', 100, 'BLOCK', 1000, 'STREAMS', key, cursor) as [string, [string, string[]][]][] | null;
        if (!result) continue;
        const entries = result[0][1];
        // Detect trim/reset before advancing: new entries can arrive before the periodic check.
        if (cursor !== '0-0') {
          const first = await redis.xrange(key, '-', '+', 'COUNT', 1);
          if (first.length && compare(first[0][0], cursor) > 0) this.events.emit('hint', null);
        }
        const ids = entries.map(([, fields]) => fields[0] === 'eventId' && /^[0-9]{1,20}$/.test(fields[1] ?? '') ? BigInt(fields[1]) : null)
          .filter((id): id is bigint => id !== null);
        const rows = await this.db.changeEvent.findMany({ where: { id: { in: ids } }, select: { id: true, entity: true, recordId: true } });
        const byId = new Map(rows.map(row => [String(row.id), row]));
        for (const [, fields] of entries) {
          const row = byId.get(fields[1]);
          if (row) this.events.emit('hint', { entity: row.entity, recordId: row.recordId });
        }
        cursor = entries.at(-1)![0];
      } catch {
        if (!this.stopped) { generation = -1; await delay(1000); }
      }
    }
  }
}
