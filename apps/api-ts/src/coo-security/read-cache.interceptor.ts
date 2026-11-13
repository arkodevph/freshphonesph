import {
  Inject,
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { defer, lastValueFrom } from "rxjs";
import { effectivePermissions } from "@freshphones/contracts";
import type { AuthRequest } from "../auth/access";
import type { Response } from "express";
import { CooReadCache } from "./read-cache.service";

export const CooCachedRead = () => {
  return SetMetadata("cooCachedRead", true);
};

@Injectable()
export class CooReadCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(CooReadCache) private readonly cache: CooReadCache,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    const enabled = this.reflector.getAllAndOverride<boolean>("cooCachedRead", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!enabled || request.method !== "GET" || request.user?.role !== "COO") {
      return next.handle();
    }

    // Global guards have authenticated the current account, MFA, notices and permissions.
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader("Cache-Control", "private, no-store");

    return defer(() => {
      return this.cache.read(
        {
          account: request.user.id,
          role: request.user.role,
          permissions: effectivePermissions(request.user).slice().sort(),
          path: request.path,
          query: request.query,
        },
        () => {
          return lastValueFrom(next.handle());
        },
      );
    });
  }
}
