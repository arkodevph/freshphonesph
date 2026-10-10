import 'reflect-metadata';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { hashPassword, tokenHash } from '../src/auth/password';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Use a migrated dedicated TEST_DATABASE_URL ending in _test.');
const origin = 'http://localhost:3100', password = 'Auth-migration-test-password123!';
let app: INestApplication, enforced: INestApplication, db: Database, base: string, enforcedBase: string;
let hash: string, identity: { id: string; email: string }, enrollment: { totpURI: string; backupCodes: string[] };
function totp(uri: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', secret = new URL(uri).searchParams.get('secret')!;
  const bits = [...secret.toUpperCase()].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map(v => parseInt(v, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', bytes).update(counter).digest(), offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
class Browser {
  cookies = new Map<string, string>();
  async call(path: string, body?: unknown, target = base, extra: Record<string, string> = {}) {
    const res = await fetch(`${target}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin,
      Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body) });
    for (const cookie of res.headers.getSetCookie()) { const first = cookie.split(';')[0], i = first.indexOf('='); this.cookies.set(first.slice(0, i), first.slice(i + 1)); }
    return res;
  }
  async login(user = identity, target = base, secret = password) { const res = await this.call('/auth/login', { email: user.email, password: secret }, target); assert.equal(res.status, 200, await res.clone().text()); return res.json(); }
}
async function person(role: 'OWNER' | 'RECORDS' = 'OWNER') { return db.user.create({ data: { name: 'Synthetic Auth', email: `auth-${randomUUID()}@example.test`, passwordHash: hash, role } }); }
before(async () => {
  const config = { NODE_ENV: 'test' as const, PORT: 4100, HOST: '127.0.0.1', DATABASE_URL: url!, WEB_ORIGIN: origin,
    BETTER_AUTH_SECRET: 'auth-migration-test-secret-at-least-32-characters',
    EMAIL_FROM: 'synthetic@example.test', CUSTOMER_REMINDER_DAYS_BEFORE: '', PRIVATE_STORAGE_PROVIDER: 'local' as const, PRIVATE_STORAGE_S3_REGION: 'ap-southeast-1' };
  app = await createApp(config); enforced = await createApp({ ...config, AUTH_REQUIRE_STAFF_MFA: 'true' });
  await app.listen(0, '127.0.0.1'); await enforced.listen(0, '127.0.0.1'); base = await app.getUrl(); enforcedBase = await enforced.getUrl(); db = app.get(Database);
  hash = await hashPassword(password); identity = await person();
});
beforeEach(async () => { await db.loginAttempt.deleteMany(); await db.abuseBucket.deleteMany(); });
after(async () => { if (app) await app.close(); if (enforced) await enforced.close(); });

test('credentials preserve account IDs and hashes, signed HTTP-only cookies replace JWTs, and CSRF/logout are enforced', async () => {
  const credential = await db.authAccount.findFirstOrThrow({ where: { userId: identity.id, providerId: 'credential' } });
  assert.equal(credential.password, hash); assert.equal(credential.accountId, identity.id);
  const browser = new Browser(); const user = await browser.login(); assert.equal(user.id, identity.id); assert.equal(user.role, 'OWNER'); assert.equal('token' in user, false);
  assert.ok(browser.cookies.get('fp_session')); assert.equal((await browser.call('/auth/me')).status, 200);
  assert.equal((await browser.call('/auth/sessions/revoke', {}, base, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await browser.call('/auth/refresh', {})).status, 200);
  const old = new Browser(); old.cookies = new Map(browser.cookies); await browser.call('/auth/logout', {}); assert.equal((await old.call('/auth/me')).status, 401);
  old.cookies.set('fp_session', 'tampered'); assert.equal((await old.call('/auth/me')).status, 401);
  const raw = new Browser(); raw.cookies.set('fp_access', 'legacy-jwt'); raw.cookies.set('fp_refresh', 'legacy-refresh'); assert.equal((await raw.call('/auth/refresh', {})).status, 401);
  const response = await new Browser().call('/auth/login', { email: identity.email, password });
  assert.ok(response.headers.getSetCookie().filter(c => c.startsWith('fp_session=')).every(c => c.includes('HttpOnly') && c.includes('SameSite=Lax') && c.includes('Path=/api')));
});
test('server requires staff enrollment and blocks business routes and events until MFA is active', async () => {
  const browser = new Browser(); await browser.login(identity, enforcedBase);
  assert.equal((await browser.call('/auth/me', undefined, enforcedBase)).status, 200);
  assert.equal((await browser.call('/batches', undefined, enforcedBase)).status, 412);
  assert.equal((await browser.call('/events', undefined, enforcedBase)).status, 412);
  const state = await (await browser.call('/auth/security', undefined, enforcedBase)).json(); assert.equal(state.required, true); assert.equal(state.enabled, false);
  assert.equal((await browser.call('/auth/mfa/disable', { password }, enforcedBase)).status, 403);
});
test('enrollment requires password and a real TOTP, encrypts secrets/codes, and revokes pre-enrollment sessions', async () => {
  const current = new Browser(), other = new Browser(); await current.login(); await other.login();
  assert.equal((await current.call('/auth/mfa/enable', { password: 'wrong' })).status, 400);
  enrollment = await (await current.call('/auth/mfa/enable', { password })).json(); assert.ok(enrollment.totpURI?.startsWith('otpauth://')); assert.equal(enrollment.backupCodes.length, 10);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: identity.id } })).twoFactorEnabled, false);
  const factor = await db.authTwoFactor.findUniqueOrThrow({ where: { userId: identity.id } });
  assert.notEqual(factor.secret, new URL(enrollment.totpURI).searchParams.get('secret')); assert.ok(!factor.backupCodes.includes(enrollment.backupCodes[0]));
  assert.equal((await current.call('/auth/mfa/verify', { code: 'wrong' })).status, 400);
  assert.equal((await current.call('/auth/mfa/verify', { code: totp(enrollment.totpURI) })).status, 200);
  assert.equal((await current.call('/auth/me')).status, 200); assert.equal((await other.call('/auth/me')).status, 401);
  const state = await (await current.call('/auth/security')).json(); assert.equal(state.enabled, true);
  assert.ok(await db.auditEntry.findFirst({ where: { actorId: identity.id, action: 'mfa.verified' } }));
});
test('password sign-in gives an expiring MFA challenge and grants no access until the second factor is verified', async () => {
  const browser = new Browser(); assert.deepEqual(await browser.login(), { twoFactorRedirect: true });
  assert.equal((await browser.call('/auth/me')).status, 401); assert.equal((await browser.call('/batches')).status, 401);
  assert.equal((await browser.call('/auth/mfa/verify', { code: totp(enrollment.totpURI) })).status, 200);
  assert.equal((await browser.call('/auth/me')).status, 200);
  assert.equal((await browser.call('/auth/mfa/disable', { password }, enforcedBase)).status, 403);
  assert.equal((await browser.call('/auth/mfa/enable', { password })).status, 400);
  const limited = new Browser(); await limited.login(); const wrong = totp(enrollment.totpURI) === '000000' ? '999999' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await limited.call('/auth/mfa/verify', { code: wrong })).status, 401);
  assert.ok((await limited.call('/auth/mfa/verify', { code: totp(enrollment.totpURI) })).status >= 400);
  assert.ok((await db.authTwoFactor.findUniqueOrThrow({ where: { userId: identity.id } })).failedVerificationCount >= 5);
});
test('recovery codes and MFA challenges cannot be reused, including concurrent requests across replicas', async () => {
  const browser = new Browser(); await browser.login(); const duplicate = new Browser(); duplicate.cookies = new Map(browser.cookies);
  const responses = await Promise.all([browser.call('/auth/mfa/backup', { code: enrollment.backupCodes[0] }), duplicate.call('/auth/mfa/backup', { code: enrollment.backupCodes[0] }, enforcedBase)]);
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  const another = new Browser(); await another.login(); assert.equal((await another.call('/auth/mfa/backup', { code: enrollment.backupCodes[0] })).status, 401);
  assert.equal((await another.call('/auth/mfa/backup', { code: enrollment.backupCodes[1] })).status, 200);
  assert.equal((await another.call('/auth/security')).status, 200);
});
test('password recovery uses hashed single-use tokens, revokes sessions, and retains the second factor', async () => {
  const browser = new Browser(); await browser.login(); await browser.call('/auth/mfa/verify', { code: totp(enrollment.totpURI) });
  const unknown = await browser.call('/auth/forgot-password', { email: `missing-${randomUUID()}@example.test` });
  const known = await browser.call('/auth/forgot-password', { email: identity.email }); assert.deepEqual(await known.json(), await unknown.json());
  let token = '';
  for (const file of await readdir('.local/mail')) { const text = await readFile(`.local/mail/${file}`, 'utf8'); if (text.startsWith(`To: ${identity.email}\n`)) token = text.match(/reset-password#([A-Za-z0-9_-]+)/)?.[1] ?? ''; }
  assert.ok(token); const stored = await db.authVerification.findUniqueOrThrow({ where: { identifier: tokenHash(`reset-password:${token}`) } }); assert.equal(stored.userId, identity.id); assert.ok(!stored.identifier.includes(token));
  const next = 'Auth-reset-test-password456!'; assert.equal((await browser.call('/auth/reset-password', { token, password: next })).status, 200);
  assert.equal((await browser.call('/auth/me')).status, 401); assert.equal((await browser.call('/auth/reset-password', { token, password })).status, 401);
  const fresh = new Browser(); assert.deepEqual(await fresh.login(identity, base, next), { twoFactorRedirect: true });
  assert.equal((await fresh.call('/auth/mfa/backup', { code: enrollment.backupCodes[2] })).status, 200);
  assert.equal((await fresh.call('/auth/change-password', { currentPassword: next, newPassword: password })).status, 200);
  assert.equal((await fresh.call('/auth/me')).status, 200);
});
test('expired sessions/challenges deny access and regenerated recovery codes replace the previous set', async () => {
  const user = await person(), browser = new Browser(); await browser.login(user);
  const data = await (await browser.call('/auth/mfa/enable', { password })).json();
  await browser.call('/auth/mfa/verify', { code: totp(data.totpURI) });
  const replacement = await (await browser.call('/auth/mfa/recovery-codes', { password })).json(); assert.equal(replacement.backupCodes.length, 10);
  const challenge = new Browser(); await challenge.login(user);
  assert.equal((await challenge.call('/auth/mfa/backup', { code: data.backupCodes[0] })).status, 401);
  assert.equal((await challenge.call('/auth/mfa/backup', { code: replacement.backupCodes[0] })).status, 200);
  await db.authSession.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  assert.equal((await challenge.call('/auth/me')).status, 401);
  const expired = new Browser(); await expired.login(user);
  await db.authVerification.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  assert.equal((await expired.call('/auth/mfa/verify', { code: totp(data.totpURI) })).status, 401);
  const fresh = new Browser(); await fresh.login(user); await fresh.call('/auth/mfa/backup', { code: replacement.backupCodes[1] });
  assert.equal((await fresh.call('/auth/mfa/disable', { password })).status, 200);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).twoFactorEnabled, false);
  assert.equal(await db.authTwoFactor.count({ where: { userId: user.id } }), 0);
  assert.equal((await fresh.call('/auth/me')).status, 200);
});
test('failed audit writes roll back MFA secret/code mutations in the same transaction', async () => {
  const user = await person(), browser = new Browser(); await browser.login(user);
  const data = await (await browser.call('/auth/mfa/enable', { password })).json(); await browser.call('/auth/mfa/verify', { code: totp(data.totpURI) });
  const before = await db.authTwoFactor.findUniqueOrThrow({ where: { userId: user.id } });
  await db.$executeRawUnsafe(`CREATE FUNCTION reject_auth_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW."actorId" = '${user.id}'::uuid AND NEW.action = 'mfa.recovery_codes_regenerated' THEN RAISE EXCEPTION 'Synthetic audit outage'; END IF;
    RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER reject_auth_test_audit BEFORE INSERT ON "AuditEntry" FOR EACH ROW EXECUTE FUNCTION reject_auth_test_audit()');
  try {
    assert.equal((await browser.call('/auth/mfa/recovery-codes', { password })).status, 500);
    assert.equal((await db.authTwoFactor.findUniqueOrThrow({ where: { userId: user.id } })).backupCodes, before.backupCodes);
  } finally { await db.$executeRawUnsafe('DROP TRIGGER reject_auth_test_audit ON "AuditEntry"'); await db.$executeRawUnsafe('DROP FUNCTION reject_auth_test_audit()'); }
});
test('session revocation, access changes, and inactive accounts invalidate sessions and pending challenges', async () => {
  const user = await person('RECORDS'), browser = new Browser(), other = new Browser(); await browser.login(user); await other.login(user);
  const state = await (await browser.call('/auth/security')).json(); const target = state.sessions.find((s: { current: boolean }) => !s.current);
  assert.ok(target); assert.equal((await browser.call('/auth/sessions/revoke', { sessionId: target.id })).status, 200); assert.equal((await other.call('/auth/me')).status, 401);
  assert.equal((await browser.call('/auth/sessions/revoke', { sessionId: randomUUID() })).status, 404);
  await db.user.update({ where: { id: user.id }, data: { role: 'CS_TEAM' } }); assert.equal((await browser.call('/auth/me')).status, 401);
  await browser.login(user); await db.user.update({ where: { id: user.id }, data: { active: false } }); assert.equal((await browser.call('/auth/login', { email: user.email, password })).status, 401);
  const pending = new Browser(); await pending.login(); await db.user.update({ where: { id: identity.id }, data: { active: false } });
  assert.equal(await db.authVerification.count({ where: { userId: identity.id } }), 0);
  assert.ok((await pending.call('/auth/mfa/verify', { code: totp(enrollment.totpURI) })).status >= 400);
  await assert.rejects(db.authSession.create({ data: { userId: identity.id, token: randomUUID(), expiresAt: new Date(Date.now() + 1000) } }));
});
