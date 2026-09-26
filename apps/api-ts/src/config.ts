import 'dotenv/config';
import { z } from 'zod';

export function readConfig() {
  const config = z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      PORT: z.coerce.number().int().min(1).max(65535).default(4100),
      HOST: z.string().default('127.0.0.1'),
      DATABASE_URL: z.string().url(),
      WEB_ORIGIN: z.string().url(),
      JWT_SECRET: z.string().min(32),
      RESEND_API_KEY: z.string().optional(),
      EMAIL_FROM: z.string().default('Fresh Phones <accounts@example.com>'),
      CUSTOMER_REMINDER_DAYS_BEFORE: z.string().default(''),
      PRIVATE_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
      PRIVATE_STORAGE_DIR: z.string().optional(),
      PRIVATE_STORAGE_S3_ENDPOINT: z.string().url().optional(),
      PRIVATE_STORAGE_S3_REGION: z.string().default('ap-southeast-1'),
      PRIVATE_STORAGE_S3_BUCKET: z.string().optional(),
      PRIVATE_STORAGE_S3_ACCESS_KEY: z.string().optional(),
      PRIVATE_STORAGE_S3_SECRET_KEY: z.string().optional(),
    })
    .parse(process.env);
  if (new URL(config.WEB_ORIGIN).origin !== config.WEB_ORIGIN)
    throw new Error('WEB_ORIGIN must be an origin without a path.');
  if (
    config.NODE_ENV === 'production' &&
    (!config.WEB_ORIGIN.startsWith('https://') ||
      !config.RESEND_API_KEY ||
      config.PRIVATE_STORAGE_PROVIDER !== 's3' ||
      config.JWT_SECRET.startsWith('replace-'))
  ) {
    throw new Error(
      'Production requires HTTPS, a generated JWT secret, Resend email and private S3 storage.',
    );
  }
  if (config.PRIVATE_STORAGE_PROVIDER === 's3' &&
    (!config.PRIVATE_STORAGE_S3_ENDPOINT || !config.PRIVATE_STORAGE_S3_BUCKET ||
      !config.PRIVATE_STORAGE_S3_ACCESS_KEY || !config.PRIVATE_STORAGE_S3_SECRET_KEY ||
      (config.NODE_ENV === 'production' && !config.PRIVATE_STORAGE_S3_ENDPOINT.startsWith('https://'))))
    throw new Error('Private S3 storage requires endpoint, bucket, credentials, and HTTPS in production.');
  return config;
}
export const CONFIG = Symbol('CONFIG');
export type Config = ReturnType<typeof readConfig>;
