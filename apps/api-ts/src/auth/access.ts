import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { rolePermissions, type Permission, type User } from '@freshphones/contracts';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export interface AuthRequest extends Request {
  user: User;
  sessionId: string;
  accessToken: string;
}
export const Public = () => SetMetadata('public', true);
export const Requires = (permission: Permission) => SetMetadata('permission', permission);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
export function allowed(user: Pick<User, 'role'>, permission: Permission) {
  return rolePermissions[user.role].includes(permission);
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const publicRoute = this.reflector.getAllAndOverride<boolean>('public', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publicRoute) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token: unknown = request.cookies?.fp_access;
    if (typeof token !== 'string') throw new UnauthorizedException('Sign in to continue.');
    const session = await this.auth.authenticate(token);
    request.user = session.user;
    request.sessionId = session.sessionId;
    request.accessToken = token;
    const permission = this.reflector.getAllAndOverride<Permission>('permission', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permission && !allowed(session.user, permission))
      throw new ForbiddenException('Your role does not have access to this action.');
    return true;
  }
}
