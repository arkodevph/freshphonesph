import { BadRequestException, ForbiddenException, HttpException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { effectivePermissions, type User } from '@freshphones/contracts';
import { Database } from '../database';
import { CONFIG, type Config } from '../config';
import { tokenHash, verifyPassword } from './password';
import { createIdentity } from './better-auth';
import type { Request, Response } from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '../generated/prisma/client';
import { addressGroup } from '../abuse/policies';

export const safeUser = (u: { id: string; name: string; email: string; role: User['role']; clientId: string | null; image?: string | null; hrConfidentialAccess?: boolean }): User => ({
  id: u.id, name: u.name, email: u.email, role: u.role, clientId: u.clientId,
  image: u.image ?? null,
  hrConfidentialAccess: u.hrConfidentialAccess === true, permissions: effectivePermissions(u),
});
export function identityHeaders(request: Request) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  // Express resolves req.ip through the explicit trusted proxy allowlist.
  headers.delete('x-forwarded-for'); headers.delete('x-real-ip');
  headers.set('x-forwarded-for', request.ip ?? request.socket.remoteAddress ?? 'unknown');
  return headers;
}
function mergeCookies(headers: Headers, result: globalThis.Response) {
  const cookies = new Map((headers.get('cookie') ?? '').split(';').map(part => {
    const index = part.indexOf('='); return [part.slice(0, index).trim(), part.slice(index + 1)] as const;
  }).filter(([name]) => name));
  for (const cookie of result.headers.getSetCookie()) {
    const part = cookie.split(';')[0], index = part.indexOf('=');
    cookies.set(part.slice(0, index), part.slice(index + 1));
  }
  const next = new Headers(headers); next.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; ')); return next;
}
@Injectable()
export class AuthService {
  private readonly identity: ReturnType<typeof createIdentity>;
  private readonly scope = new AsyncLocalStorage<{ db: Prisma.TransactionClient; identity: ReturnType<typeof createIdentity> }>();
  private get store() { return this.scope.getStore()?.db ?? this.db; }
  private get framework() { return this.scope.getStore()?.identity ?? this.identity; }
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config) {
    this.identity = createIdentity(db, config, (userId, token) => this.sendReset(userId, token));
  }
  requiresMfa(user: Pick<User, 'role'>) {
    return user.role !== 'CUSTOMER' && (this.config.AUTH_REQUIRE_STAFF_MFA === 'true' ||
      (this.config.NODE_ENV === 'production' && this.config.AUTH_REQUIRE_STAFF_MFA !== 'false'));
  }
  async limit(key: string, maximum: number) {
    const now = new Date();
    const rows = await this.store.$queryRaw<{ count: number }[]>`
      INSERT INTO "LoginAttempt" ("key", "count", "resetsAt") VALUES (${tokenHash(key)}, 1, ${new Date(now.getTime() + 900_000)})
      ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."resetsAt" < ${now} THEN 1 ELSE "LoginAttempt"."count" + 1 END,
      "resetsAt" = CASE WHEN "LoginAttempt"."resetsAt" < ${now} THEN ${new Date(now.getTime() + 900_000)} ELSE "LoginAttempt"."resetsAt" END
      RETURNING "count"`;
    if (rows[0].count > maximum) throw new HttpException('Too many attempts. Try again in 15 minutes.', 429);
  }
  // Identity changes and audit entries share a transaction with the existing account/retention write fence.
  // Expected authentication failures commit the library's failure counters before returning the error.
  private async locked<T>(work: () => Promise<T>) {
    const result = await this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const identity = createIdentity(tx, this.config, (id, token) => this.sendReset(id, token), false);
      return this.scope.run({ db: tx, identity }, async () => {
        try { return { value: await work() }; } catch (error) { return { error }; }
      });
    }, { timeout: 30_000, maxWait: 30_000 });
    if ('error' in result) throw result.error;
    return result.value;
  }
  private async call(path: string, headers: Headers, body?: object) {
    const identity = await this.framework;
    const url = `${new URL(this.config.BETTER_AUTH_URL ?? this.config.WEB_ORIGIN).origin}/api/auth${path}`;
    const input = new Headers(headers); if (body) input.set('content-type', 'application/json');
    const result = await identity.handler(new globalThis.Request(url, { method: body ? 'POST' : 'GET', headers: input, body: body ? JSON.stringify(body) : undefined }));
    if (!result.ok) {
      const error = await result.json().catch(() => ({})) as { message?: string };
      throw new HttpException(error.message ?? 'Authentication failed. Please try again.', result.status);
    }
    return result;
  }
  private forward(result: globalThis.Response, response: Response) {
    for (const cookie of result.headers.getSetCookie()) response.append('Set-Cookie', cookie);
    const attributes = { httpOnly: true, sameSite: 'lax' as const, secure: this.config.NODE_ENV === 'production' };
    response.clearCookie('fp_access', { ...attributes, path: '/api' }); response.clearCookie('fp_refresh', { ...attributes, path: '/api/auth' });
  }
  private async rawSession(headers: Headers) {
    return (await this.framework).api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
  }
  async authenticate(cookieHeader: string) {
    const session = await this.rawSession(new Headers({ cookie: cookieHeader }));
    if (!session) throw new UnauthorizedException('Your session has expired. Please sign in again.');
    const current = await this.store.authSession.findUnique({ where: { id: session.session.id }, include: { user: true } });
    if (!current || current.expiresAt <= new Date() || !current.user.active || current.user.retentionErasedAt ||
        (current.user.twoFactorEnabled && !current.mfaVerified)) throw new UnauthorizedException('Your session is no longer active.');
    return { user: safeUser(current.user), sessionId: current.id, mfaRequired: this.requiresMfa(current.user) && !current.user.twoFactorEnabled };
  }
  private async completed(headers: Headers, result: globalThis.Response, response: Response, verified = false) {
    const next = mergeCookies(headers, result);
    const raw = await this.rawSession(next);
    if (!raw) throw new UnauthorizedException('Please sign in again.');
    if (verified) await this.store.authSession.update({ where: { id: raw.session.id }, data: { mfaVerified: true } });
    const current = await this.authenticate(next.get('cookie') ?? '');
    this.forward(result, response);
    return current.user;
  }
  async login(email: string, password: string, req: Request, res: Response) {
    await this.limit(`login-ip:${addressGroup(req.ip)}`, 50); await this.limit(`login-email:${email}`, 15);
    return this.locked(async () => {
      const user = await this.store.user.findUnique({ where: { email } });
      if (user && !user.active) { await verifyPassword(password, user.passwordHash); throw new UnauthorizedException('Email or password is incorrect.'); }
      const result = await this.call('/sign-in/email', identityHeaders(req), { email, password });
      if (!user?.active) throw new UnauthorizedException('Email or password is incorrect.');
      const data = await result.clone().json() as { twoFactorRedirect?: boolean };
      if (data.twoFactorRedirect) { this.forward(result, res); return { twoFactorRedirect: true as const }; }
      return this.completed(identityHeaders(req), result, res);
    });
  }
  async refresh(req: Request) { return (await this.authenticate(req.headers.cookie ?? '')).user; }
  async logout(req: Request, res: Response) {
    const result = await this.call('/sign-out', identityHeaders(req), {}); this.forward(result, res);
  }
  async changePassword(userId: string, currentPassword: string, newPassword: string, req: Request, res: Response) {
    if (currentPassword === newPassword) throw new BadRequestException('Choose a different new password.');
    await this.limit(`change-password:${userId}`, 10);
    return this.locked(async () => {
      const session = await this.authenticate(req.headers.cookie ?? '');
      const previous = await this.store.authSession.findUniqueOrThrow({ where: { id: session.sessionId } });
      const result = await this.call('/change-password', identityHeaders(req), { currentPassword, newPassword, revokeOtherSessions: true });
      await this.completed(identityHeaders(req), result, res, previous.mfaVerified);
      await this.store.auditEntry.create({ data: { actorId: userId, action: 'password.changed', entity: 'account', recordId: userId } });
      return { ok: true };
    });
  }
  private async sendReset(userId: string, token: string) {
    const user = await this.store.user.findUnique({ where: { id: userId } });
    if (!user?.active) return;
    const id = randomUUID();
    const text = `Hello ${user.name},\n\nReset your Fresh Phones password: ${this.config.WEB_ORIGIN}/reset-password#${token}\n\n` +
      (user.role === 'CUSTOMER' ? `Reset in Settings: ${this.config.WEB_ORIGIN}/portal/settings#reset-code=${token}\n\n` : '') +
      `Reset code: ${token}\n\nThis code expires in 30 minutes. Password reset does not remove two-factor authentication. If you did not request it, ignore this message.`;
    try {
      if (this.config.NODE_ENV === 'production') {
        const result = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${this.config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: this.config.EMAIL_FROM, to: [user.email], subject: 'Reset your Fresh Phones password', text }), signal: AbortSignal.timeout(10_000) });
        if (!result.ok) throw new Error('Email delivery failed');
      } else {
        const directory = join(process.cwd(), '.local/mail'); await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(join(directory, `${id}.txt`), `To: ${user.email}\n${text}`, { mode: 0o600 });
      }
    } catch {
      await this.store.authVerification.deleteMany({ where: { identifier: tokenHash(`reset-password:${token}`) } });
      console.error('Password reset email delivery failed.');
    }
  }
  async forgot(email: string, ip: string, req: Request) {
    await this.limit(`reset-ip:${ip}`, 20); await this.limit(`reset-email:${email}`, 5);
    return this.locked(async () => {
      const user = await this.store.user.findUnique({ where: { email } });
      if (user && !user.active) return;
      await this.call('/request-password-reset', identityHeaders(req), { email });
    });
  }
  async reset(token: string, password: string, req: Request) {
    await this.limit(`reset-use:${req.ip}`, 20);
    return this.locked(async () => {
      const record = await this.store.authVerification.findUnique({ where: { identifier: tokenHash(`reset-password:${token}`) }, include: { user: true } });
      if (!record?.user?.active || record.expiresAt <= new Date()) throw new UnauthorizedException('This reset link is invalid or expired.');
      await this.call('/reset-password', identityHeaders(req), { token, newPassword: password });
      await this.store.auditEntry.create({ data: { actorId: record.user.id, action: 'password.reset', entity: 'account', recordId: record.user.id } });
    });
  }
  async security(req: Request) {
    const session = await this.authenticate(req.headers.cookie ?? '');
    const user = await this.store.user.findUniqueOrThrow({ where: { id: session.user.id } });
    return { enabled: user.twoFactorEnabled, required: this.requiresMfa(user), sessions: await this.store.authSession.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true, userAgent: true },
    }).then(rows => rows.map(row => ({ ...row, current: row.id === session.sessionId }))) };
  }
  async mfa(action: 'enable' | 'verify' | 'backup' | 'disable' | 'regenerate', body: { password?: string; code?: string }, req: Request, res: Response) {
    await this.limit(`mfa-ip:${req.ip}`, 30);
    await this.limit(`mfa-cookie:${tokenHash(req.cookies?.['fp_identity.two_factor'] ?? req.headers.cookie ?? 'anonymous')}`, 10);
    return this.locked(async () => {
      const headers = identityHeaders(req), raw = await this.rawSession(headers);
      const wasEnabled = raw ? (await this.store.user.findUniqueOrThrow({ where: { id: raw.user.id } })).twoFactorEnabled : false;
      if (action === 'enable' || action === 'disable' || action === 'regenerate') {
        const current = await this.authenticate(req.headers.cookie ?? '');
        const user = await this.store.user.findUniqueOrThrow({ where: { id: current.user.id } });
        if (action === 'disable' && this.requiresMfa(user)) throw new ForbiddenException('Two-factor authentication is required for staff accounts.');
        if (action === 'enable' && user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is already enabled.');
      }
      const path = { enable: '/two-factor/enable', verify: '/two-factor/verify-totp', backup: '/two-factor/verify-backup-code', disable: '/two-factor/disable', regenerate: '/two-factor/generate-backup-codes' }[action];
      const result = await this.call(path, headers, action === 'verify' || action === 'backup' ? { code: body.code, trustDevice: false } : { password: body.password });
      const data = await result.clone().json() as { totpURI?: string; backupCodes?: string[] };
      if (action === 'enable') { this.forward(result, res); return { totpURI: data.totpURI!, backupCodes: data.backupCodes! }; }
      if (action === 'regenerate') { this.forward(result, res); await this.audit(raw!.user.id, 'mfa.recovery_codes_regenerated'); return { backupCodes: data.backupCodes! }; }
      const user = await this.completed(headers, result, res, true);
      const current = await this.rawSession(mergeCookies(headers, result));
      if (action === 'disable' || (action === 'verify' && raw && !wasEnabled)) {
        await this.store.authSession.deleteMany({ where: { userId: user.id, id: { not: current!.session.id } } });
        await this.store.authVerification.deleteMany({ where: { userId: user.id } });
      }
      await this.audit(user.id, action === 'disable' ? 'mfa.disabled' : action === 'backup' ? 'mfa.recovery_code_used' : 'mfa.verified');
      return user;
    });
  }
  private async audit(userId: string, action: string) {
    await this.store.auditEntry.create({ data: { actorId: userId, action, entity: 'account', recordId: userId } });
  }
  async revokeSessions(req: Request, sessionId?: string) {
    return this.locked(async () => {
      const current = await this.authenticate(req.headers.cookie ?? '');
      if (sessionId === current.sessionId) throw new BadRequestException('Use Sign out to end this session.');
      const removed = await this.store.authSession.deleteMany({ where: { userId: current.user.id,
        id: sessionId ?? { not: current.sessionId } } });
      if (sessionId && !removed.count) throw new NotFoundException('Session is unavailable.');
      await this.audit(current.user.id, 'session.revoked'); return { ok: true };
    });
  }
}
