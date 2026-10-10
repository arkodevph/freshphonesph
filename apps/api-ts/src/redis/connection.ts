import { Redis } from 'ioredis';
import type { Config } from '../config';

export const namespace = (config: Config) => config.REDIS_NAMESPACE ?? 'freshphones-local';
export const streamKey = (config: Config) => `${namespace(config)}:changes`;
export const heartbeatKey = (config: Config) => `${namespace(config)}:worker-heartbeat`;

/** Producers fail quickly; consumers reconnect indefinitely. Never log connection URLs/errors. */
export function redisConnection(config: Config, consumer = false) {
  if (!config.REDIS_URL) throw new Error('Configure REDIS_URL to run Redis services.');
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: consumer ? null : 1, enableOfflineQueue: consumer, connectTimeout: 3000,
    retryStrategy: times => Math.min(times * 250, 3000),
  });
  redis.on('error', () => {});
  return redis;
}
