import { HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { rolePermissions, type User } from '@freshphones/contracts';
import { Database } from '../database';
import { CONFIG, type Config } from '../config';
import { hashPassword, newToken, tokenHash, verifyPassword } from './password';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const accessSeconds = 15 * 60;
export const refreshSeconds = 7 * 24 * 60 * 60;
const dummyHash = '00000000000000000000000000000000:' + '00'.repeat(64);
export const safeUser = (u: {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  clientId: string | null;
}): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  clientId: u.clientId,
  permissions: [...rolePermissions[u.role]],
});
@Injectable()
export class AuthService {
  private readonly jwt = new JwtService();
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  async limit(key: string, maximum: number) {
    const now = new Date();
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "LoginAttempt" ("key", "count", "resetsAt") VALUES (${tokenHash(key)}, 1, ${new Date(now.getTime() + 900_000)})
      ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "LoginAttempt"."resetsAt" < ${now} THEN 1 ELSE "LoginAttempt"."count" + 1 END,
      "resetsAt" = CASE WHEN "LoginAttempt"."resetsAt" < ${now} THEN ${new Date(now.getTime() + 900_000)} ELSE "LoginAttempt"."resetsAt" END
      RETURNING "count"`;
    if (rows[0].count > maximum)
      throw new HttpException('Too many attempts. Try again in 15 minutes.', 429);
  }
  private access(userId: string, sessionId: string) {
    return this.jwt.signAsync(
      { sub: userId, sid: sessionId },
      {
        secret: this.config.JWT_SECRET,
        algorithm: 'HS256',
        expiresIn: accessSeconds,
        issuer: 'freshphones',
        audience: 'freshphones-web',
      },
    );
  }
  async login(email: string, password: string, ip: string) {
    await this.limit(`login-ip:${ip}`, 50);
    await this.limit(`login-email:${email}`, 15);
    const user = await this.db.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    if (!user?.active || !valid) throw new UnauthorizedException('Email or password is incorrect.');
    const refresh = newToken();
    const session = await this.db.session.create({
      data: {
        userId: user.id,
        refreshHash: tokenHash(refresh),
        expiresAt: new Date(Date.now() + refreshSeconds * 1000),
      },
    });
    return { access: await this.access(user.id, session.id), refresh, user: safeUser(user) };
  }
  async authenticate(token: string) {
    let claims: { sub: string; sid: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: this.config.JWT_SECRET,
        algorithms: ['HS256'],
        issuer: 'freshphones',
        audience: 'freshphones-web',
      });
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    if (typeof claims.sid !== 'string' || typeof claims.sub !== 'string')
      throw new UnauthorizedException();
    const session = await this.db.session.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      throw new UnauthorizedException('Your session is no longer active.');
    return { user: safeUser(session.user), sessionId: session.id };
  }
  async refresh(token: string) {
    const hash = tokenHash(token);
    const session = await this.db.session.findUnique({
      where: { refreshHash: hash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active)
      throw new UnauthorizedException('Please sign in again.');
    const refresh = newToken();
    const updated = await this.db.session.updateMany({
      where: {
        id: session.id,
        refreshHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { active: true },
      },
      data: { refreshHash: tokenHash(refresh) },
    });
    if (updated.count !== 1) throw new UnauthorizedException('Please sign in again.');
    return {
      access: await this.access(session.userId, session.id),
      refresh,
      user: safeUser(session.user),
    };
  }
  async logout(token: string | undefined) {
    if (token)
      await this.db.session.updateMany({
        where: { refreshHash: tokenHash(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
  }
  async forgot(email: string, ip: string) {
    await this.limit(`reset-ip:${ip}`, 20);
    await this.limit(`reset-email:${email}`, 5);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user?.active) return;
    const token = newToken();
    const reset = await this.db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });
    const url = `${this.config.WEB_ORIGIN}/reset-password#${token}`;
    const text = `Hello ${user.name},\n\nReset your Fresh Phones password: ${url}\n\nThis link expires in 30 minutes. If you did not request it, ignore this message.`;
    try {
      if (this.config.NODE_ENV === 'production') {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.config.EMAIL_FROM,
            to: [email],
            subject: 'Reset your Fresh Phones password',
            text,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error('Email delivery failed');
      } else {
        const directory = join(process.cwd(), '.local/mail');
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(join(directory, `${randomUUID()}.txt`), `To: ${email}\n${text}`, {
          mode: 0o600,
        });
      }
    } catch {
      await this.db.passwordReset.delete({ where: { id: reset.id } });
      console.error('Password reset email delivery failed.');
    }
  }
  async reset(token: string, password: string) {
    const hash = await hashPassword(password);
    await this.db.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({
        where: { tokenHash: tokenHash(token) },
        include: { user: true },
      });
      if (!reset || !reset.user.active || reset.usedAt || reset.expiresAt <= new Date())
        throw new UnauthorizedException('This reset link is invalid or expired.');
      const used = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1)
        throw new UnauthorizedException('This reset link has already been used.');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: hash } });
      await tx.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordReset.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.auditEntry.create({
        data: {
          actorId: reset.userId,
          action: 'password.reset',
          entity: 'account',
          recordId: reset.userId,
        },
      });
    });
  }
}
