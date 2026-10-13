import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { AuthRequest } from '../auth/access';
import { AbuseService } from './abuse.service';
import { addressGroup, type AbusePolicyName } from './policies';

@Injectable()
export class PublicAbuseGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector, @Inject(AbuseService) private readonly abuse: AbuseService) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>('public', targets);
    if (isPublic) {
      const policy = this.reflector.getAllAndOverride<AbusePolicyName>('abusePolicy', targets) ?? 'publicRead';
      const request = context.switchToHttp().getRequest<AuthRequest>();
      await this.abuse.consume(policy, `ip:${addressGroup(request.ip)}`, context.switchToHttp().getResponse<Response>());
    }
    return true;
  }
}

@Injectable()
export class AccountAbuseGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector, @Inject(AbuseService) private readonly abuse: AbuseService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user) return true;
    const response = context.switchToHttp().getResponse<Response>(), address = addressGroup(request.ip);
    await this.abuse.consume(['GET', 'HEAD'].includes(request.method) ? 'accountRead' : 'accountWrite', `account:${request.user.id}`, response);
    const configured = this.reflector.getAllAndOverride<AbusePolicyName>('abusePolicy', [context.getHandler(), context.getClass()]);
    const policy = configured === 'auth' && ['GET', 'HEAD'].includes(request.method) ? undefined : configured;
    if (policy) {
      await this.abuse.consume(policy, `ip:${address}`, response);
      await this.abuse.consume(policy === 'stream' ? 'streamAccount' : policy, `account:${request.user.id}`, response);
      if (policy === 'stream') await this.abuse.openStream(request.user.id, address, response);
    }
    return true;
  }
}
