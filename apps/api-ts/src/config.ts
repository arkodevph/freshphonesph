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
    })
    .parse(process.env);
  if (new URL(config.WEB_ORIGIN).origin !== config.WEB_ORIGIN)
    throw new Error('WEB_ORIGIN must be an origin without a path.');
  if (
    config.NODE_ENV === 'production' &&
    (!config.WEB_ORIGIN.startsWith('https://') ||
      !config.RESEND_API_KEY ||
      config.JWT_SECRET.startsWith('replace-'))
  ) {
    throw new Error(
      'Production requires HTTPS, a generated JWT secret and Resend email configuration.',
    );
  }
  return config;
}
export const CONFIG = Symbol('CONFIG');
export type Config = ReturnType<typeof readConfig>;
