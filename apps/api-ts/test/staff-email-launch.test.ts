import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectStaffEmailLaunch, parseEmailLaunchOptions, sendStaffEmailSmoke } from '../src/staff/email-launch';

const environment = { RESEND_API_KEY: 're_unit-test-placeholder', EMAIL_FROM: 'Fresh Phones PH <updates@freshphones.ph>', WEB_ORIGIN: 'https://staff.freshphones.ph' };
const started = new Date('2026-10-06T08:00:00.000Z');
const to = 'approved.owner@example.test';

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'freshphones-email-launch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'private-smoke');
  const input = { to, runId: randomUUID() };
  const requests: { url: string; options: RequestInit }[] = [];
  const providerId = randomUUID();
  const provider = (async (url, options) => {
    requests.push({ url: String(url), options: options! });
    return Response.json({ id: providerId });
  }) as typeof fetch;
  return { root, directory, input, requests, providerId, provider,
    options: { directory, fetch: provider, now: () => started } };
}

test('email launch requires explicit send, one recipient and a safe run ID; unknown/duplicate flags do not echo values', () => {
  assert.deepEqual(parseEmailLaunchOptions([]), { mode: 'check' });
  assert.deepEqual(parseEmailLaunchOptions(['--help']), { mode: 'help' });
  const id = randomUUID();
  assert.deepEqual(parseEmailLaunchOptions(['--send', `--to=${to}`, `--run-id=${id.toUpperCase()}`]), { mode: 'send', to, runId: id });
  for (const args of [['--send'], [`--to=${to}`, `--run-id=${id}`], ['--send', '--to=one@example.test,two@example.test', `--run-id=${id}`],
    ['--send', `--to=${to}`, '--run-id=../../outside'], ['--send', '--send', `--to=${to}`, `--run-id=${id}`],
    ['--send=true', `--to=${to}`, `--run-id=${id}`], ['--help', '--send'], ['--api-key=private-value']]) {
    assert.throws(() => parseEmailLaunchOptions(args), (error: unknown) => error instanceof Error && !error.message.includes('private-value'));
  }
});

test('readiness keeps credentials private and rejects example senders, header injection and unusable email links', () => {
  assert.equal(inspectStaffEmailLaunch(environment).readyForSmoke, true);
  assert.ok(!JSON.stringify(inspectStaffEmailLaunch(environment)).includes(environment.RESEND_API_KEY));
  for (const patch of [{ RESEND_API_KEY: '' }, { RESEND_API_KEY: 'key\r\nother' }, { EMAIL_FROM: 'Fresh Phones <accounts@example.com>' },
    { EMAIL_FROM: 'Fresh Phones Test <onboarding@resend.dev>' }, { EMAIL_FROM: 'Fresh Phones\r\nBcc: private <updates@freshphones.ph>' },
    ...['http://staff.freshphones.ph', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://example.com',
      'https://staff.example.test', 'https://staff.freshphones.ph/path', 'https://user:private@staff.freshphones.ph'].map(WEB_ORIGIN => ({ WEB_ORIGIN }))])
    assert.equal(inspectStaffEmailLaunch({ ...environment, ...patch }).readyForSmoke, false);
});

test('missing provider configuration fails before a request or private evidence write', async t => {
  const f = await fixture(t);
  await assert.rejects(sendStaffEmailSmoke({ ...environment, RESEND_API_KEY: '' }, f.input, f.options), /Configure RESEND_API_KEY/);
  assert.equal(f.requests.length, 0);
  assert.deepEqual(await readdir(f.root), []);
});

test('smoke sends one synthetic text email and records private provider evidence without credentials or claimed UAT', async t => {
  const f = await fixture(t);
  const result = await sendStaffEmailSmoke(environment, f.input, f.options);
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.method, 'POST');
  const payload = JSON.parse(request.options.body as string);
  assert.deepEqual(Object.keys(payload).sort(), ['from', 'subject', 'text', 'to']);
  assert.deepEqual(payload.to, [to]);
  assert.match(payload.subject, /^TEST/);
  assert.ok(payload.text.includes(`${environment.WEB_ORIGIN}/system/notification-settings`));
  assert.ok(!JSON.stringify(payload).includes(environment.RESEND_API_KEY));
  const saved = await readFile(result.path, 'utf8');
  const evidence = JSON.parse(saved);
  assert.equal(evidence.providerId, f.providerId);
  assert.equal(evidence.acceptedAt, started.toISOString());
  for (const status of ['inboxDelivery', 'authenticatedLink', 'ownerUat']) assert.equal(evidence[status], 'pending');
  assert.ok(!saved.includes(environment.RESEND_API_KEY));
  assert.equal((await stat(f.directory)).mode & 0o777, 0o700);
  assert.equal((await stat(result.path)).mode & 0o777, 0o600);
});

test('an accepted run is reused without another provider request, including after key rotation and the retry window', async t => {
  const f = await fixture(t);
  await sendStaffEmailSmoke(environment, f.input, f.options);
  const result = await sendStaffEmailSmoke({ ...environment, RESEND_API_KEY: 'rotated-unit-test-key' }, f.input,
    { ...f.options, now: () => new Date(started.getTime() + 48 * 60 * 60_000) });
  assert.equal(result.reused, true);
  assert.equal(result.providerId, f.providerId);
  assert.equal(f.requests.length, 1);
});

test('an uncertain response retries the original payload and idempotency key, with no provider error contents', async t => {
  const f = await fixture(t);
  const unavailable = (async (url, options) => {
    f.requests.push({ url: String(url), options: options! });
    throw new Error('Provider timeout with private key and recipient details');
  }) as typeof fetch;
  await assert.rejects(sendStaffEmailSmoke(environment, f.input, { ...f.options, fetch: unavailable }),
    (error: unknown) => error instanceof Error && /same run ID/.test(error.message) && !error.message.includes('private key'));
  await sendStaffEmailSmoke(environment, f.input, { ...f.options, now: () => new Date(started.getTime() + 60_000) });
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].options.body, f.requests[1].options.body);
  assert.equal(new Headers(f.requests[0].options.headers).get('Idempotency-Key'), `staff-email-smoke/${f.input.runId}`);
  assert.equal(new Headers(f.requests[0].options.headers).get('Idempotency-Key'), new Headers(f.requests[1].options.headers).get('Idempotency-Key'));
});

test('retry cannot redirect a saved smoke run to a different sender, address or web origin', async t => {
  const f = await fixture(t);
  await sendStaffEmailSmoke(environment, f.input, f.options);
  for (const changes of [
    { env: { ...environment, EMAIL_FROM: 'Fresh Phones PH <other@freshphones.ph>' }, input: f.input },
    { env: { ...environment, WEB_ORIGIN: 'https://staging.freshphones.ph' }, input: f.input },
    { env: environment, input: { ...f.input, to: 'another@example.test' } },
  ]) await assert.rejects(sendStaffEmailSmoke(changes.env, changes.input, f.options), /different sender, recipient or web origin/);
  assert.equal(f.requests.length, 1);
});

test('unknown sends cannot be retried at 23 hours or after a backwards clock change', async t => {
  const f = await fixture(t);
  const unavailable = (async () => { throw new Error('timeout'); }) as typeof fetch;
  await assert.rejects(sendStaffEmailSmoke(environment, f.input, { ...f.options, fetch: unavailable }));
  for (const delta of [23 * 60 * 60_000, 24 * 60 * 60_000, -1])
    await assert.rejects(sendStaffEmailSmoke(environment, f.input, { ...f.options, now: () => new Date(started.getTime() + delta) }), /window expired or its timestamp is invalid/);
  assert.equal(f.requests.length, 0);
});

test('provider rejections and malformed acceptance leave the evidence pending and omit response contents', async t => {
  const f = await fixture(t);
  for (const response of [Response.json({ message: 'secret provider contents' }, { status: 403 }), Response.json({ id: 'private-invalid-id' })]) {
    await assert.rejects(sendStaffEmailSmoke(environment, f.input, { ...f.options, fetch: (async () => response) as typeof fetch }),
      (error: unknown) => error instanceof Error && !/secret|private-invalid/.test(error.message));
    const evidence = JSON.parse(await readFile(join(f.directory, `${f.input.runId}.json`), 'utf8'));
    assert.equal(evidence.providerId, null);
    assert.equal(evidence.acceptedAt, null);
  }
});

test('corrupt evidence stops before a provider call instead of silently preparing another email', async t => {
  const f = await fixture(t);
  const result = await sendStaffEmailSmoke(environment, f.input, f.options);
  await writeFile(result.path, '{}');
  await assert.rejects(sendStaffEmailSmoke(environment, f.input, f.options), /Existing smoke evidence is invalid/);
  assert.equal(f.requests.length, 1);
});

test('default launch CLI is read only even with configured provider values, and help does not require credentials', async t => {
  const f = await fixture(t);
  const cli = join(process.cwd(), 'scripts/staff-email-launch-check.ts');
  const tsx = join(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  const check = spawnSync(process.execPath, [tsx, cli], { cwd: f.root, env: { ...process.env, ...environment }, encoding: 'utf8', timeout: 20_000 });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /14 staff email types/);
  assert.match(check.stdout, /No provider request or application write/);
  assert.ok(!check.stdout.includes(environment.RESEND_API_KEY));
  assert.deepEqual(await readdir(f.root), []);
  const help = spawnSync(process.execPath, [tsx, cli, '--help'], { cwd: f.root, env: { ...process.env, RESEND_API_KEY: '' }, encoding: 'utf8', timeout: 20_000 });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--send --to=APPROVED_TEST_INBOX --run-id=UUID/);
});
