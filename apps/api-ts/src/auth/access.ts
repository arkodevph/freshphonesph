import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { effectivePermissions, type Permission, type User } from '@freshphones/contracts';
import type { Request } from 'express';
import { AuthService, safeUser } from './auth.service';
import type { Database } from '../database';
import { LegalService } from '../legal/legal.service';

export interface AuthRequest extends Request {
  user: User;
  sessionId: string;
  accessToken: string;
}
export const Public = () => SetMetadata('public', true);
export const LegalExempt = () => SetMetadata('legalExempt', true);
export const MfaExempt = () => SetMetadata('mfaExempt', true);
export const Requires = (...permissions: Permission[]) => SetMetadata('permission', permissions);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
export function allowed(user: Pick<User, 'role' | 'hrConfidentialAccess'>, permission: Permission) {
  return effectivePermissions(user).includes(permission);
}
export async function requireCurrentUser(db: Database, user: User, ...permissions: Permission[]) {
  const current = await db.user.findUnique({ where: { id: user.id } });
  if (!current?.active || !permissions.every((permission) => allowed(current, permission)))
    throw new ForbiddenException('Your access has changed.');
  return safeUser(current);
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(LegalService) private readonly legal: LegalService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const publicRoute = this.reflector.getAllAndOverride<boolean>('public', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publicRoute) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.headers.cookie;
    if (!token) throw new UnauthorizedException('Sign in to continue.');
    const session = await this.auth.authenticate(token);
    request.user = session.user;
    request.sessionId = session.sessionId;
    request.accessToken = token;
    const mfaExempt = this.reflector.getAllAndOverride<boolean>('mfaExempt', [context.getHandler(), context.getClass()]);
    if (!mfaExempt && session.mfaRequired)
      throw new HttpException('Set up two-factor authentication before continuing.', 412);
    const permissions = this.reflector.getAllAndOverride<Permission[]>('permission', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permissions && !permissions.every((permission) => allowed(session.user, permission)))
      throw new ForbiddenException('Your role does not have access to this action.');
    const legalExempt = this.reflector.getAllAndOverride<boolean>('legalExempt', [
      context.getHandler(), context.getClass(),
    ]);
    if (!legalExempt && await this.legal.hasPending(session.user))
      throw new HttpException('Review the current privacy notice and terms before continuing.', 428);
    return true;
  }
}
