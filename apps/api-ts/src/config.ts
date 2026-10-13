import 'dotenv/config';
import { z } from 'zod';
import { legalDocuments } from '@freshphones/contracts';
import ipaddr from 'ipaddr.js';
import { abusePolicies, type AbusePolicyName } from './abuse/policies';

const abuseLimitsSchema = z.record(z.enum(Object.keys(abusePolicies) as [AbusePolicyName, ...AbusePolicyName[]]),
  z.array(z.tuple([z.number().int().min(1).max(1_000_000), z.number().int().min(1).max(86400)])).min(1).max(3));

export function hasProductionSender(value: string | undefined) {
  const sender = value?.trim();
  const address = sender?.includes('<') ? sender.match(/<([^<>]+)>$/)?.[1] : sender;
  const domain = address?.split('@')[1]?.toLowerCase();
  return Boolean(address && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) &&
    domain && domain !== 'resend.dev' && !/^example\.(com|net|org|test)$/.test(domain) &&
    !/\.(test|invalid|local)$/.test(domain));
}

export function hasResendTestSender(value: string | undefined) {
  const sender = value?.trim();
  const address = sender?.includes('<') ? sender.match(/<([^<>]+)>$/)?.[1] : sender;
  return address?.toLowerCase() === 'onboarding@resend.dev';
}

export function readConfig() {
  const config = z
    .object({
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      PORT: z.coerce.number().int().min(1).max(65535).default(4100),
      HOST: z.string().default('127.0.0.1'),
      DATABASE_URL: z.string().url(),
      WEB_ORIGIN: z.string().url(),
      JWT_SECRET: z.string().min(32).optional(), // Local migration compatibility only.
      BETTER_AUTH_SECRET: z.string().min(32).optional(),
      BETTER_AUTH_URL: z.string().url().optional(),
      AUTH_REQUIRE_STAFF_MFA: z.enum(['true', 'false']).optional(),
      RESEND_API_KEY: z.string().optional(),
      EMAIL_FROM: z.string().default('Fresh Phones <accounts@example.com>'),
      CUSTOMER_REMINDER_DAYS_BEFORE: z.string().default(''),
      REDIS_URL: z.string().url().optional(),
      REDIS_NAMESPACE: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(),
      TRUSTED_PROXY_CIDRS: z.string().refine(value => value.split(',').every(entry => {
        const address = entry.trim();
        try { return address.includes('/') ? ipaddr.parseCIDR(address)[1] > 0 : ipaddr.isValid(address); }
        catch { return false; }
      }), 'Use explicit trusted proxy IPs/CIDRs; blanket trust is prohibited.').optional(),
      ABUSE_STREAM_ACCOUNT_MAX: z.coerce.number().int().min(1).max(100).optional(),
      ABUSE_STREAM_ADDRESS_MAX: z.coerce.number().int().min(1).max(10000).optional(),
      ABUSE_LIMITS: z.string().transform((value, context) => {
        try {
          const parsed = abuseLimitsSchema.safeParse(JSON.parse(value));
          if (parsed.success) return parsed.data;
        } catch { /* Report configuration errors without echoing input. */ }
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use known abuse policies with [maximum, windowSeconds] arrays.' });
        return z.NEVER;
      }).optional(),
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
  if (config.REDIS_URL && !['redis:', 'rediss:'].includes(new URL(config.REDIS_URL).protocol))
    throw new Error('REDIS_URL must use redis:// or rediss://.');
  if (!config.BETTER_AUTH_SECRET && !config.JWT_SECRET)
    throw new Error('Set a generated BETTER_AUTH_SECRET (at least 32 characters).');
  if (config.BETTER_AUTH_URL && !['/', '/api/auth', '/api/auth/'].includes(new URL(config.BETTER_AUTH_URL).pathname))
    throw new Error('BETTER_AUTH_URL must be an origin or end with /api/auth.');
  if (config.NODE_ENV === 'production' && (!config.BETTER_AUTH_SECRET || config.BETTER_AUTH_SECRET.startsWith('replace-') ||
      !config.BETTER_AUTH_URL?.startsWith('https://') || config.AUTH_REQUIRE_STAFF_MFA === 'false'))
    throw new Error('Production requires a generated Better Auth secret, HTTPS auth URL, and staff MFA.');
  if (config.NODE_ENV === 'production' && (!config.REDIS_URL || !new URL(config.REDIS_URL).password || !config.REDIS_NAMESPACE))
    throw new Error('Production requires authenticated Redis and an explicit environment namespace.');
  if (config.NODE_ENV === 'production' && config.REDIS_URL) {
    const url = new URL(config.REDIS_URL), host = url.hostname;
    const privateHost = ['localhost', '127.0.0.1', '[::1]', 'redis'].includes(host) || host.endsWith('.internal') ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);
    if (!privateHost && url.protocol !== 'rediss:') throw new Error('Remote production Redis requires TLS (rediss://).');
  }
  if (config.NODE_ENV === 'production' && new URL(config.BETTER_AUTH_URL!).origin !== config.WEB_ORIGIN)
    throw new Error('Production authentication must use the web origin through the /api reverse proxy.');
  if (
    config.NODE_ENV === 'production' &&
    (!config.WEB_ORIGIN.startsWith('https://') ||
      !config.RESEND_API_KEY?.trim() ||
      config.PRIVATE_STORAGE_PROVIDER !== 's3')
  ) {
    throw new Error(
      'Production requires HTTPS, Resend email and private S3 storage.',
    );
  }
  if (config.NODE_ENV === 'production' && !hasProductionSender(process.env.EMAIL_FROM))
    throw new Error('Production requires an explicit EMAIL_FROM address; verify its sending domain with the email provider.');
  if (config.PRIVATE_STORAGE_PROVIDER === 's3' &&
    (!config.PRIVATE_STORAGE_S3_ENDPOINT || !config.PRIVATE_STORAGE_S3_BUCKET ||
      !config.PRIVATE_STORAGE_S3_ACCESS_KEY || !config.PRIVATE_STORAGE_S3_SECRET_KEY ||
      (config.NODE_ENV === 'production' && !config.PRIVATE_STORAGE_S3_ENDPOINT.startsWith('https://'))))
    throw new Error('Private S3 storage requires endpoint, bucket, credentials, and HTTPS in production.');
  if (config.NODE_ENV === 'production' && Object.values(legalDocuments).some((document) =>
    document.status !== 'PUBLISHED' || !document.publishedAt || !Number.isFinite(Date.parse(document.publishedAt)) ||
    Date.parse(document.publishedAt) > Date.now() || document.reviewItems.length > 0))
    throw new Error('Production requires approved customer, employee and applicant privacy notices and portal terms.');
  return config;
}
export const CONFIG = Symbol('CONFIG');
export type Config = ReturnType<typeof readConfig>;
