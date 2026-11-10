import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  effectivePermissions,
  reportKindsFor,
  type Permission,
  type User,
} from "@freshphones/contracts";
import type { Request } from "express";
import { AuthService, safeUser } from "./auth.service";
import type { Database } from "../database";
import { LegalService } from "../legal/legal.service";
import { selectMembership } from "./membership";

export interface AuthRequest extends Request {
  user: User;
  sessionId: string;
  accessToken: string;
}

export const Public = () => {
  return SetMetadata("public", true);
};

export const LegalExempt = () => {
  return SetMetadata("legalExempt", true);
};

export const MfaExempt = () => {
  return SetMetadata("mfaExempt", true);
};

/** Own-account identity, security and required notice actions; no business records. */
export const PersonalAccess = () => {
  return SetMetadata("personalAccess", true);
};

export const Requires = (...permissions: Permission[]) => {
  return SetMetadata("permission", permissions);
};

export const ReportFamily = (family: string) => {
  return SetMetadata("reportFamily", family);
};

export const RequiresAny = (...permissions: Permission[]) => {
  return SetMetadata("anyPermission", permissions);
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context.switchToHttp().getRequest<AuthRequest>().user;
  },
);

export function allowed(
  user: Pick<User, "role" | "hrConfidentialAccess">,
  permission: Permission,
) {
  return effectivePermissions(user).includes(permission);
}

export async function requireCurrentUser(
  db: Pick<Database, "user" | "client">,
  user: User,
  ...permissions: Permission[]
) {
  const current = await db.user.findUnique({ where: { id: user.id } });

  if (
    !current?.active ||
    !permissions.every((permission) => {
      return allowed(current, permission);
    })
  ) {
    throw new ForbiddenException("Your access has changed.");
  }

  const identity = safeUser(current);

  return identity.role === "CUSTOMER" && user.clientId
    ? selectMembership(db, identity, user.clientId)
    : identity;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(LegalService) private readonly legal: LegalService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const publicRoute = this.reflector.getAllAndOverride<boolean>("public", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (publicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();

    const token = request.headers.cookie;

    if (!token) {
      throw new UnauthorizedException("Sign in to continue.");
    }

    const session = await this.auth.authenticate(token);

    request.user = session.user;

    const personalAccess = this.reflector.getAllAndOverride<boolean>(
      "personalAccess",
      [context.getHandler(), context.getClass()],
    );

    const membership =
      request.headers["x-membership-id"] ??
      (request.path === "/api/events" ? request.query.membership : undefined);

    if (membership !== undefined && !personalAccess) {
      if (
        typeof membership !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          membership,
        )
      ) {
        throw new BadRequestException("Invalid membership selection.");
      }

      request.user = await this.auth.selectMembership(session.user, membership);
    }

    request.sessionId = session.sessionId;

    request.accessToken = token;

    const mfaExempt = this.reflector.getAllAndOverride<boolean>("mfaExempt", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!mfaExempt && session.mfaRequired) {
      throw new HttpException(
        "Set up two-factor authentication before continuing.",
        412,
      );
    }

    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      "permission",
      [context.getHandler(), context.getClass()],
    );

    const anyPermissions = this.reflector.getAllAndOverride<Permission[]>(
      "anyPermission",
      [context.getHandler(), context.getClass()],
    );

    if (!personalAccess && !permissions?.length && !anyPermissions?.length) {
      throw new ForbiddenException(
        "This action has no authorized business access.",
      );
    }

    if (
      permissions &&
      !permissions.every((permission) => {
        return allowed(session.user, permission);
      })
    ) {
      throw new ForbiddenException(
        "Your role does not have access to this action.",
      );
    }

    if (
      anyPermissions &&
      !anyPermissions.some((permission) => {
        return allowed(session.user, permission);
      })
    ) {
      throw new ForbiddenException(
        "Your role does not have access to this action.",
      );
    }

    const reportFamily = this.reflector.getAllAndOverride<string>(
      "reportFamily",
      [context.getHandler(), context.getClass()],
    );

    if (reportFamily) {
      const family =
        reportFamily === "query" ? request.query.kind : reportFamily;

      if (
        typeof family === "string" &&
        [
          "PAYMENTS",
          "COLLECTIONS",
          "RECONCILIATION",
          "TASKS",
          "SUPPORT",
        ].includes(family.toUpperCase()) &&
        !reportKindsFor(session.user).includes(family.toUpperCase())
      ) {
        throw new ForbiddenException(
          "This report family is outside your role's responsibilities.",
        );
      }
    }

    const legalExempt = this.reflector.getAllAndOverride<boolean>(
      "legalExempt",
      [context.getHandler(), context.getClass()],
    );

    if (!legalExempt && (await this.legal.hasPending(session.user))) {
      throw new HttpException(
        "Review the current privacy notice and terms before continuing.",
        428,
      );
    }

    return true;
  }
}
