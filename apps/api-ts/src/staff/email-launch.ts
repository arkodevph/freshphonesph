import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { hasProductionSender } from '../config';

type Environment = Pick<NodeJS.ProcessEnv, 'RESEND_API_KEY' | 'EMAIL_FROM' | 'WEB_ORIGIN'>;
export class EmailLaunchError extends Error {}
export type EmailLaunchOptions = { mode: 'check' | 'help' } | { mode: 'send'; to: string; runId: string };

export function parseEmailLaunchOptions(args: string[]): EmailLaunchOptions {
  if (!args.length) return { mode: 'check' };
  if (args.length === 1 && args[0] === '--help') return { mode: 'help' };
  const values = new Map<string, string>();
  for (const arg of args) {
    const split = arg.indexOf('=');
    const key = split < 0 ? arg : arg.slice(0, split);
    const value = split < 0 ? '' : arg.slice(split + 1);
    if (!['--send', '--to', '--run-id'].includes(key) || values.has(key) || (key === '--send' && split >= 0))
      throw new EmailLaunchError('Use --send, --to=one-approved-address and --run-id=UUID, each once.');
    values.set(key, value);
  }
  const to = z.string().trim().email().max(254).safeParse(values.get('--to'));
  const runId = z.string().uuid().safeParse(values.get('--run-id'));
  if (!values.has('--send') || !to.success || !runId.success)
    throw new EmailLaunchError('Sending requires --send, one valid --to address and a UUID --run-id.');
  return { mode: 'send', to: to.data, runId: runId.data.toLowerCase() };
}

export function inspectStaffEmailLaunch(env: Environment) {
  const apiKey = env.RESEND_API_KEY?.trim() ?? '';
  const from = env.EMAIL_FROM?.trim() ?? '';
  const web = env.WEB_ORIGIN?.trim() ?? '';
  let publicHttpsOrigin = false;
  try {
    const url = new URL(web);
    const hostname = url.hostname.toLowerCase();
    publicHttpsOrigin = url.protocol === 'https:' && url.origin === web && !url.username && !url.password &&
      !/^(localhost|\[::1\]|0\.0\.0\.0|127\..*)$/.test(hostname) &&
      !/(^|\.)(localhost|example\.(com|net|org))$|\.(test|invalid|local)$/.test(hostname);
  } catch { /* Invalid origins are reported without their values. */ }
  const checks = {
    apiKeyConfigured: Boolean(apiKey && !/[\r\n]/.test(apiKey)),
    productionSenderFormat: Boolean(from && !/[\r\n]/.test(from) && hasProductionSender(from)),
    publicHttpsOrigin,
  };
  return { ...checks, readyForSmoke: Object.values(checks).every(Boolean),
    domainVerification: 'Confirm Verified status in the client-owned Resend dashboard.',
    inboxDelivery: 'Pending a named reviewer checking inbox/spam and the authenticated link.' };
}

const payloadSchema = z.object({ from: z.string(), to: z.tuple([z.string().email()]), subject: z.string(), text: z.string() }).strict();
const evidenceSchema = z.object({
  runId: z.string().uuid(), preparedAt: z.string().datetime(), payload: payloadSchema,
  providerId: z.string().uuid().nullable(), acceptedAt: z.string().datetime().nullable(),
  inboxDelivery: z.literal('pending'), authenticatedLink: z.literal('pending'), ownerUat: z.literal('pending'),
}).strict().refine((value) => Boolean(value.providerId) === Boolean(value.acceptedAt));
type Evidence = z.infer<typeof evidenceSchema>;
const retryWindow = 23 * 60 * 60_000;

async function saveEvidence(path: string, evidence: Evidence) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  await rename(temporary, path);
}

/** One explicit synthetic email; never starts workers or changes application records. */
export async function sendStaffEmailSmoke(env: Environment, input: { to: string; runId: string }, options: {
  directory: string; fetch?: typeof fetch; now?: () => Date;
}) {
  const parsed = parseEmailLaunchOptions(['--send', `--to=${input.to}`, `--run-id=${input.runId}`]);
  if (parsed.mode !== 'send' || !inspectStaffEmailLaunch(env).readyForSmoke)
    throw new EmailLaunchError('Configure RESEND_API_KEY, an explicit production EMAIL_FROM and a public HTTPS WEB_ORIGIN before sending.');
  const now = options.now ?? (() => new Date());
  const payload: z.infer<typeof payloadSchema> = {
    from: env.EMAIL_FROM!.trim(), to: [parsed.to], subject: 'TEST · Fresh Phones PH staff email setup',
    text: `This is a synthetic staff email setup test for the approved test inbox.\n\nOpen Owner notification settings: ${env.WEB_ORIGIN!.trim()}/system/notification-settings\n\nSmoke run: ${parsed.runId}\n\nThe Owner should check inbox/spam placement and the link while signed in. Owner acceptance remains pending.`,
  };
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const path = join(options.directory, `${parsed.runId}.json`);
  let evidence: Evidence = { runId: parsed.runId, preparedAt: now().toISOString(), payload,
    providerId: null, acceptedAt: null, inboxDelivery: 'pending', authenticatedLink: 'pending', ownerUat: 'pending' };
  try {
    await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
    try { evidence = evidenceSchema.parse(JSON.parse(await readFile(path, 'utf8'))); }
    catch { throw new EmailLaunchError('Existing smoke evidence is invalid. Review it before attempting another message.'); }
    if (evidence.runId !== parsed.runId || JSON.stringify(evidence.payload) !== JSON.stringify(payload))
      throw new EmailLaunchError('This run already has a different sender, recipient or web origin. Restore its original configuration to retry.');
  }
  if (evidence.providerId && evidence.acceptedAt) return { providerId: evidence.providerId, path, reused: true };
  const age = now().getTime() - new Date(evidence.preparedAt).getTime();
  if (age < 0 || age >= retryWindow)
    throw new EmailLaunchError('The smoke retry window expired or its timestamp is invalid. Check provider history before preparing a new run.');
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `staff-email-smoke/${parsed.runId}` }, body: JSON.stringify(evidence.payload),
    });
  } catch {
    throw new EmailLaunchError('Provider response was unavailable. Retry this same run ID and configuration within 23 hours.');
  }
  if (!response.ok)
    throw new EmailLaunchError(`Provider rejected the smoke request (HTTP ${response.status}). Check its dashboard; retry the same run ID and configuration.`);
  let providerId: string;
  try { providerId = z.object({ id: z.string().uuid() }).parse(await response.json()).id; }
  catch {
    throw new EmailLaunchError('Provider acceptance could not be recorded. Check its dashboard or retry the same run ID and configuration.');
  }
  try { await saveEvidence(path, { ...evidence, providerId, acceptedAt: now().toISOString() }); }
  catch {
    throw new EmailLaunchError('Provider accepted the message, but private evidence could not be saved. Retry this same run ID and configuration within 23 hours.');
  }
  return { providerId, path, reused: false };
}
