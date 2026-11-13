import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac } from "node:crypto";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../auth/access";
import type { Config } from "../config";
import type { Prisma } from "../generated/prisma/client";

type ReplayContext = {
  request: AuthRequest;
  response: Response;
  secret: string;
  namespace: string;
  transaction?: Prisma.TransactionClient;
};

const requests = new AsyncLocalStorage<ReplayContext>();

/** Canonical JSON without assigning caller-controlled property names to an object. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 40) {
    throw new BadRequestException("Request structure is too deeply nested.");
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => {
        return canonicalJson(item, depth + 1);
      })
      .join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return `{${Object.keys(record)
      .sort()
      .filter((key) => {
        return record[key] !== undefined;
      })
      .map((key) => {
        return `${JSON.stringify(key)}:${canonicalJson(record[key], depth + 1)}`;
      })
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

export function cooRequestContext(config: Config) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    requests.run(
      {
        request,
        response,
        secret: config.BETTER_AUTH_SECRET ?? config.JWT_SECRET!,
        namespace: config.REDIS_NAMESPACE ?? "freshphones-local",
      },
      next,
    );
  };
}

/** Call after current authorization, inside the same transaction as the business write. */
export async function replayCooWrite<T>(
  tx: Prisma.TransactionClient,
  actorId: string,
  run: () => Promise<T>,
): Promise<T> {
  const context = requests.getStore();

  if (
    !context ||
    context.request.user?.role !== "COO" ||
    ["GET", "HEAD", "OPTIONS"].includes(context.request.method) ||
    (context.request.headers["content-type"] !== undefined &&
      !context.request.is("application/json"))
  ) {
    return run();
  }

  const key = context.request.headers["idempotency-key"];

  // Existing API clients keep their contract; keyed clients receive atomic replay protection.
  if (key === undefined) {
    return run();
  }

  if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new BadRequestException(
      "Idempotency-Key must contain 16–128 letters, digits, underscores or hyphens.",
    );
  }

  if (context.transaction) {
    if (context.transaction !== tx) {
      throw new ConflictException(
        "This command must complete in one transaction.",
      );
    }

    return run();
  }

  if (actorId !== context.request.user.id) {
    throw new ForbiddenException("The request account changed.");
  }

  // A role change cannot overtake this command. RepeatableRead also rejects a
  // changed actor rather than authorizing against an older transaction snapshot.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId}::uuid FOR SHARE`;

  const current = await tx.user.findUnique({ where: { id: actorId } });

  if (!current?.active || current.role !== "COO") {
    throw new ForbiddenException("Your COO access has changed.");
  }

  const digest = (value: string) => {
    return createHmac("sha256", context.secret)
      .update(`${context.namespace}:coo-replay:v1:${value}`)
      .digest();
  };

  // Stable through auth-secret/cache-namespace rotation: old keys must never run again.
  const keyDigest = createHash("sha256")
    .update(`coo-replay-key:v1:${actorId}:${key}`)
    .digest();

  const keyHash = keyDigest.toString("hex");

  const fingerprint = digest(
    canonicalJson({
      method: context.request.method,
      path: context.request.path,
      query: context.request.query,
      body: context.request.body,
      hrConfidentialAccess: current.hrConfidentialAccess,
    }),
  ).toString("hex");

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${keyDigest.readBigInt64BE()}::bigint)`;

  const [existing] = await tx.$queryRaw<
    {
      fingerprint: string;
      result: { defined: boolean; value?: T } | null;
      expired: boolean;
    }[]
  >`SELECT fingerprint, result, ("expiresAt" <= clock_timestamp()) AS expired
    FROM "CooRequestReplay" WHERE "actorId" = ${actorId}::uuid AND "keyHash" = ${keyHash}`;

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new ConflictException(
        "This idempotency key was already used for a different request.",
      );
    }

    if (existing.expired || !existing.result) {
      throw new ConflictException(
        "This replay has expired. Check the record before starting a new action.",
      );
    }

    context.transaction = tx;

    context.response.setHeader("Idempotency-Replayed", "true");

    return (existing.result.defined ? existing.result.value : undefined) as T;
  }

  context.transaction = tx;

  const result = await run();

  const serialized = JSON.stringify({
    defined: result !== undefined,
    value: result,
  });

  if (Buffer.byteLength(serialized, "utf8") > 1024 * 1024) {
    throw new ServiceUnavailableException(
      "This result is too large to store safely for retries.",
    );
  }

  await tx.$executeRaw`INSERT INTO "CooRequestReplay" ("actorId", "keyHash", fingerprint, result, "expiresAt")
    VALUES (${actorId}::uuid, ${keyHash}, ${fingerprint}, ${serialized}::jsonb, clock_timestamp() + INTERVAL '24 hours')`;

  context.response.setHeader("Idempotency-Replayed", "false");

  return result;
}
