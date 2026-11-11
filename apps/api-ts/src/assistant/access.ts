import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Permission } from "@freshphones/contracts";

type Grant = {
  actorId: string;
  cookieHash: string;
  method: string;
  path: string;
  bodyHash: string;
  permissions: readonly Permission[];
  expiresAt: number;
};

const context = new AsyncLocalStorage<Grant>();

const grants = new Map<string, Grant>();

const hash = (value: string) => {
  return createHash("sha256").update(value).digest("hex");
};

/** Assistant-only operational delegation; never included in /auth/me or navigation. */
export const assistantPermissions: readonly Permission[] = [
  "REPORT_VIEW",
  "BATCH_READ",
  "BATCH_CREATE",
  "BATCH_MANAGE",
  "CLIENT_READ",
  "CLIENT_MANAGE",
  "ENROLLMENT_REVIEW",
  "AGENT_MANAGE",
  "CATALOG_MANAGE",
  "TASK_READ",
  "TASK_ASSIGN",
  "SUPPORT_READ",
  "SUPPORT_CREATE",
  "SUPPORT_MANAGE",
  "RECRUITMENT_MANAGE",
  "RETENTION_MANAGE",
];

export function assistantAccess(
  user: { id?: string; role: string },
  permission: Permission,
) {
  const grant = context.getStore();

  return Boolean(
    grant &&
    grant.actorId === user.id &&
    ["CEO", "OWNER"].includes(user.role) &&
    grant.permissions.includes(permission),
  );
}

export function issueAssistantCall(
  actorId: string,
  cookie: string,
  method: string,
  path: string,
  body: unknown,
  permissions: readonly Permission[],
) {
  for (const [token, grant] of grants) {
    if (grant.expiresAt < Date.now()) {
      grants.delete(token);
    }
  }

  const token = randomBytes(32).toString("hex");

  grants.set(token, {
    actorId,
    cookieHash: hash(cookie),
    method,
    path,
    bodyHash: hash(JSON.stringify(body ?? {})),
    permissions,
    expiresAt: Date.now() + 30_000,
  });

  return token;
}

/** Only in-process issued, single-use calls can enter the delegated context.
 * Every other request retains the original role policy. Session guards still
 * authenticate the cookie and enforce MFA/legal/current identity normally.
 */
export function assistantCallContext(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const token = request.headers["x-fresh-ai-call"];

  const grant = typeof token === "string" ? grants.get(token) : undefined;

  if (typeof token === "string") {
    grants.delete(token);
  }

  if (
    !grant ||
    grant.expiresAt < Date.now() ||
    grant.cookieHash !== hash(request.headers.cookie ?? "") ||
    grant.method !== request.method ||
    grant.path !== request.path ||
    grant.bodyHash !== hash(JSON.stringify(request.body ?? {}))
  ) {
    next();

    return;
  }

  context.run(grant, next);
}
