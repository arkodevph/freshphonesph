import type { Redis } from 'ioredis';
import type { Database } from '../database';
import type { Config } from '../config';
import { streamKey } from './connection';

/** Committed outbox rows, not an ID watermark: a lower sequence can commit later. */
export async function relayChanges(db: Database, redis: Redis, config: Config) {
  return db.$transaction(async tx => {
    const events = await tx.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM "ChangeEvent" WHERE "publishedAt" IS NULL
      ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`;
    for (const event of events) {
      // A crash between XADD and commit can repeat a hint. Consumers tolerate duplicates.
      await redis.xadd(streamKey(config), 'MAXLEN', '~', '10000', '*', 'eventId', String(event.id));
      await tx.changeEvent.update({ where: { id: event.id }, data: { publishedAt: new Date() } });
    }
    return events.length;
  }, { timeout: 15_000 });
}
