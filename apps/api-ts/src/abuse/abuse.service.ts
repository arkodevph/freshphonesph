import { HttpException, Inject, Injectable, ServiceUnavailableException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import type { Response } from 'express';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { namespace } from '../redis/connection';
import { abusePolicies, type AbusePolicyName } from './policies';

// Counter creation, increment and expiration are one atomic operation across API replicas.
// Saturation prevents overflow; denied requests never slide the reset time forward.
const consumeScript = `
local retry = 0
for i, key in ipairs(KEYS) do
  local maximum = tonumber(ARGV[(i-1)*2+1])
  local window = tonumber(ARGV[(i-1)*2+2])
  local count = tonumber(redis.call('GET', key) or '0')
  local ttl = redis.call('PTTL', key)
  if ttl < 0 then
    count = 1
    redis.call('SET', key, count, 'PX', window)
    ttl = window
  elseif count <= maximum then
    count = redis.call('INCR', key)
  end
  if count > maximum then retry = math.max(retry, ttl) end
end
return retry`;

@Injectable()
export class AbuseService implements OnModuleInit, OnModuleDestroy {
  private readonly redis?: Redis;
  private redisRetryAt = 0;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private cleaning = false;
  private readonly streams = new Set<() => void>();
  constructor(@Inject(CONFIG) private readonly config: Config, @Inject(Database) private readonly db: Database) {
    if (config.REDIS_URL) {
      this.redis = new Redis(config.REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 0,
        connectTimeout: 1000, commandTimeout: 1000, retryStrategy: times => Math.min(times * 250, 3000) });
      this.redis.on('error', () => {});
    }
  }
  onModuleInit() {
    this.cleanupTimer = setInterval(() => { void this.cleanup(); }, 60_000);
    this.cleanupTimer.unref();
    void this.cleanup();
  }
  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    for (const stop of this.streams) stop();
    this.redis?.disconnect();
  }
  private digest(value: string) {
    return createHmac('sha256', this.config.BETTER_AUTH_SECRET ?? this.config.JWT_SECRET!)
      .update(`${namespace(this.config)}:abuse:v1:${value}`).digest('hex');
  }
  status() {
    const ready = this.redis?.status === 'ready' && Date.now() >= this.redisRetryAt;
    return { backend: ready ? 'redis' : 'postgresql', redis: this.redis ? ready ? 'ready' : 'unavailable' : 'disabled' };
  }
  async consume(policy: AbusePolicyName, subject: string, response: Response) {
    const limits = this.config.ABUSE_LIMITS?.[policy] ?? abusePolicies[policy];
    const buckets = limits.map(([maximum, seconds], index) => ({
      key: this.digest(`${policy}:${index}:${subject}`), maximum, seconds,
    }));
    let retryMs: number | undefined;
    if (this.redis?.status === 'ready' && Date.now() >= this.redisRetryAt) {
      try {
        retryMs = Number(await this.redis.eval(consumeScript, buckets.length,
          ...buckets.map(bucket => `${namespace(this.config)}:{abuse}:${bucket.key}`),
          ...buckets.flatMap(bucket => [bucket.maximum, bucket.seconds * 1000])));
        if (!Number.isFinite(retryMs) || retryMs < 0) throw new Error('Invalid counter response');
      } catch {
        this.redisRetryAt = Date.now() + 2000;
      }
    }
    if (retryMs === undefined) {
      try {
        const rows = await this.db.$transaction(async tx => {
          await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '1500ms'");
          return tx.$queryRaw<{ count: number; maximum: number; retryMs: number }[]>`
          INSERT INTO "AbuseBucket" ("key", "count", "resetsAt")
          SELECT "key", 1, statement_timestamp() + "seconds" * interval '1 second'
          FROM jsonb_to_recordset(${JSON.stringify(buckets)}::jsonb) AS b("key" text, "maximum" integer, "seconds" integer)
          ORDER BY "key"
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE WHEN "AbuseBucket"."resetsAt" <= statement_timestamp() THEN 1
              ELSE LEAST("AbuseBucket"."count" + 1, (SELECT "maximum" + 1
                FROM jsonb_to_recordset(${JSON.stringify(buckets)}::jsonb) AS b("key" text, "maximum" integer)
                WHERE b."key" = "AbuseBucket"."key") ) END,
            "resetsAt" = CASE WHEN "AbuseBucket"."resetsAt" <= statement_timestamp() THEN EXCLUDED."resetsAt" ELSE "AbuseBucket"."resetsAt" END
          RETURNING "count", (SELECT "maximum" FROM jsonb_to_recordset(${JSON.stringify(buckets)}::jsonb)
            AS b("key" text, "maximum" integer) WHERE b."key" = "AbuseBucket"."key") AS "maximum",
            CEIL(EXTRACT(EPOCH FROM ("resetsAt" - statement_timestamp())) * 1000)::float8 AS "retryMs"`;
        }, { maxWait: 1000, timeout: 2500 });
        retryMs = Math.max(0, ...rows.filter(row => row.count > row.maximum).map(row => row.retryMs));
      } catch {
        response.setHeader('Retry-After', '5');
        throw new ServiceUnavailableException('Request protection is temporarily unavailable. Try again shortly.');
      }
    }
    if (retryMs > 0) {
      const seconds = Math.max(1, Math.ceil(retryMs / 1000));
      response.setHeader('Retry-After', String(seconds));
      throw new HttpException(`Too many requests. Please try again in ${seconds} seconds.`, 429);
    }
  }

  /** Shared short-lived leases bound long-running SSE work, including during Redis outages. */
  async openStream(userId: string, address: string, response: Response) {
    const accountKey = this.digest(`stream-account:${userId}`), addressKey = this.digest(`stream-address:${address}`), id = randomUUID();
    let admitted: boolean;
    try {
      admitted = await this.db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740016)`;
        const rows = await tx.$queryRaw<{ accounts: number; addresses: number }[]>`
          SELECT COUNT(*) FILTER (WHERE "accountKey" = ${accountKey})::int AS accounts,
            COUNT(*) FILTER (WHERE "addressKey" = ${addressKey})::int AS addresses
          FROM "AbuseStreamLease" WHERE "expiresAt" > statement_timestamp()
            AND ("accountKey" = ${accountKey} OR "addressKey" = ${addressKey})`;
        if (rows[0].accounts >= (this.config.ABUSE_STREAM_ACCOUNT_MAX ?? 8) ||
            rows[0].addresses >= (this.config.ABUSE_STREAM_ADDRESS_MAX ?? 400)) return false;
        await tx.$executeRaw`INSERT INTO "AbuseStreamLease" ("id", "accountKey", "addressKey", "expiresAt")
          VALUES (${id}::uuid, ${accountKey}, ${addressKey}, statement_timestamp() + interval '90 seconds')`;
        return true;
      }, { maxWait: 2000, timeout: 3000 });
    } catch {
      response.setHeader('Retry-After', '5');
      throw new ServiceUnavailableException('Live updates are temporarily unavailable. Try again shortly.');
    }
    if (!admitted) {
      response.setHeader('Retry-After', '30');
      throw new HttpException('Too many live connections. Close an unused tab and try again.', 429);
    }
    let stopped = false, renewing = false;
    let expiryTimer: ReturnType<typeof setTimeout>;
    const stop = () => {
      if (stopped) return;
      stopped = true; clearInterval(timer); clearTimeout(expiryTimer); this.streams.delete(stop);
      response.off('close', stop); response.off('error', stop);
      if (!response.writableEnded) response.end();
      void this.db.abuseStreamLease.deleteMany({ where: { id } }).catch(() => {});
    };
    const timer = setInterval(async () => {
      if (renewing || stopped) return;
      renewing = true;
      try {
        const changed = await this.db.$executeRaw`UPDATE "AbuseStreamLease"
          SET "expiresAt" = statement_timestamp() + interval '90 seconds'
          WHERE "id" = ${id}::uuid AND "expiresAt" > statement_timestamp()`;
        if (changed !== 1) stop();
        else { clearTimeout(expiryTimer); expiryTimer = setTimeout(stop, 85_000); expiryTimer.unref(); }
      } catch { stop(); } finally { renewing = false; }
    }, 30_000);
    expiryTimer = setTimeout(stop, 85_000); expiryTimer.unref();
    timer.unref(); this.streams.add(stop);
    response.once('close', stop); response.once('error', stop);
    if (response.destroyed) stop();
  }
  async cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      await this.db.$executeRaw`DELETE FROM "AbuseBucket" WHERE "key" IN
        (SELECT "key" FROM "AbuseBucket" WHERE "resetsAt" < statement_timestamp() ORDER BY "resetsAt" LIMIT 1000)`;
      await this.db.$executeRaw`DELETE FROM "AbuseStreamLease" WHERE "id" IN
        (SELECT "id" FROM "AbuseStreamLease" WHERE "expiresAt" < statement_timestamp() ORDER BY "expiresAt" LIMIT 1000)`;
    } catch { /* A later bounded cleanup retries; no personal values or connection errors are logged. */ }
    finally { this.cleaning = false; }
  }
}
