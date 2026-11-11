import { readToolResponse } from "./guardrails";
import { issueAssistantCall } from "./access";
import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AssistantAction, User } from "@freshphones/contracts";
import { Database } from "../database";
import { CONFIG, type Config } from "../config";
import type { AuthRequest } from "../auth/access";
import { operationsFor, type Operation } from "./operations";
import { buildEditBody, partialEditSchema, validateEditFields } from "./edits";
import type { Prisma } from "../generated/prisma/client";

type ActorRequest = Pick<AuthRequest, "user" | "sessionId" | "headers"> & {
  socket?: { localPort?: number };
};

const sessionHash = (sessionId: string) => {
  return createHash("sha256").update(sessionId).digest("hex");
};

const confirmedWrite = Symbol("claimed-assistant-confirmation");

@Injectable()
export class AssistantToolsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  operation(user: User, name: string) {
    const operation = operationsFor(user).find((operation) => {
      return operation.name === name;
    });

    if (!operation) {
      throw new ForbiddenException(
        "This operation is not available to your account.",
      );
    }

    return operation;
  }

  async call(
    request: ActorRequest,
    operation: Operation,
    input: unknown,
    signal?: AbortSignal,
    authorization?: typeof confirmedWrite,
  ) {
    if (operation !== this.operation(request.user, operation.name)) {
      throw new ForbiddenException(
        "Only canonical allowlisted operations may be dispatched.",
      );
    }

    if (!operation.readOnly && authorization !== confirmedWrite) {
      throw new ForbiddenException(
        "A write requires a claimed confirmation before execution.",
      );
    }

    const parsed = operation.schema.parse(input);

    const path = operation.path.replace(
      ":id",
      encodeURIComponent(parsed.id ?? ""),
    );

    const url = new URL(
      `/api${path}`,
      `http://127.0.0.1:${request.socket?.localPort ?? this.config.PORT}`,
    );

    for (const [key, value] of Object.entries(parsed.query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    // Loopback target is server-owned. The original session re-enters every API
    // guard (live permissions, MFA, legal, record scope, validation and audit).
    const grant = issueAssistantCall(
      request.user.id,
      request.headers.cookie ?? "",
      operation.method,
      url.pathname,
      parsed.body ?? {},
      operation.permissions,
    );

    const response = await fetch(url, {
      method: operation.method,
      redirect: "error",
      headers: {
        Cookie: request.headers.cookie ?? "",
        "X-Fresh-AI-Call": grant,
        Origin: this.config.WEB_ORIGIN,
        "Content-Type": "application/json",
      },
      ...(operation.method === "GET"
        ? {}
        : { body: JSON.stringify(parsed.body ?? {}) }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(25_000)])
        : AbortSignal.timeout(25_000),
    });

    if (!response.headers.get("content-type")?.includes("application/json")) {
      await response.body?.cancel();

      throw new BadRequestException("This operation did not return JSON data.");
    }

    const data = await readToolResponse(response);

    if (!response.ok) {
      throw new BadRequestException(
        typeof data.message === "string"
          ? data.message
          : "The API rejected this operation.",
      );
    }

    return data;
  }

  async read(
    request: ActorRequest,
    name: string,
    input: unknown,
    signal?: AbortSignal,
  ) {
    const operation = this.operation(request.user, name);

    if (!operation.readOnly) {
      throw new BadRequestException(
        "Changes must be proposed and confirmed first.",
      );
    }

    return this.call(request, operation, input, signal);
  }

  async proposeEdit(
    request: ActorRequest,
    name: string,
    input: unknown,
    signal?: AbortSignal,
  ) {
    this.operation(request.user, name);

    const parsed = partialEditSchema.parse(input);

    const definition = validateEditFields(name, parsed.changes);

    const current = await this.read(
      request,
      definition.read,
      { id: parsed.id },
      signal,
    );

    const body = buildEditBody(name, current, parsed.changes);

    signal?.throwIfAborted();

    return this.propose(request, name, { id: parsed.id, body });
  }

  async propose(
    request: ActorRequest,
    name: string,
    input: unknown,
  ): Promise<AssistantAction> {
    const operation = this.operation(request.user, name);

    if (operation.readOnly) {
      throw new BadRequestException("Use the read tool for this operation.");
    }

    const parsed = operation.schema.parse(input);

    const pending = await this.db.assistantAction.count({
      where: {
        actorId: request.user.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (pending >= 10) {
      throw new BadRequestException(
        "Review your pending actions before proposing more.",
      );
    }

    const action = await this.db.assistantAction.create({
      data: {
        actorId: request.user.id,
        sessionHash: sessionHash(request.sessionId),
        operation: name,
        input: parsed as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await this.db.auditEntry.create({
      data: {
        actorId: request.user.id,
        action: "ASSISTANT_PROPOSED",
        entity: "AssistantAction",
        recordId: action.id,
        after: { operation: name },
      },
    });

    return {
      id: action.id,
      operation: name,
      description: operation.description,
      input: parsed,
      expiresAt: action.expiresAt.toISOString(),
      status: "pending",
    };
  }

  async decide(
    request: ActorRequest,
    id: string,
    decision: "confirm" | "cancel",
  ) {
    const action = await this.db.assistantAction.findFirst({
      where: {
        id,
        actorId: request.user.id,
        sessionHash: sessionHash(request.sessionId),
      },
    });

    if (!action) {
      throw new NotFoundException("Action not found in this session.");
    }

    if (decision === "confirm") {
      this.operation(request.user, action.operation);
    }

    const claimed = await this.db.assistantAction.updateMany({
      where: {
        id,
        actorId: request.user.id,
        sessionHash: sessionHash(request.sessionId),
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      data: { status: decision === "cancel" ? "cancelled" : "executing" },
    });

    if (claimed.count !== 1) {
      throw new ConflictException(
        "This action expired or was already handled. Request a fresh proposal.",
      );
    }

    if (decision === "cancel") {
      await this.db.auditEntry.create({
        data: {
          actorId: request.user.id,
          action: "ASSISTANT_CANCELLED",
          entity: "AssistantAction",
          recordId: id,
        },
      });

      return {
        id,
        status: "cancelled" as const,
        message: "Action cancelled. No change was made.",
      };
    }

    await this.db.auditEntry.create({
      data: {
        actorId: request.user.id,
        action: "ASSISTANT_CONFIRMED",
        entity: "AssistantAction",
        recordId: id,
      },
    });

    try {
      const result = await this.call(
        request,
        this.operation(request.user, action.operation),
        action.input,
        undefined,
        confirmedWrite,
      );

      await this.db.assistantAction.update({
        where: { id },
        data: {
          status: "succeeded",
          finishedAt: new Date(),
          message: "The API confirmed the change.",
        },
      });

      await this.db.auditEntry.create({
        data: {
          actorId: request.user.id,
          action: "ASSISTANT_SUCCEEDED",
          entity: "AssistantAction",
          recordId: id,
        },
      });

      return {
        id,
        status: "succeeded" as const,
        message: "The API confirmed the change.",
        result,
      };
    } catch (error) {
      // Never replay an ambiguous write automatically. A timeout may follow a
      // committed change; the user must inspect the record before trying again.
      const message =
        error instanceof BadRequestException
          ? error.message
          : "Execution could not be confirmed. Check the record before proposing another change.";

      await this.db.assistantAction.update({
        where: { id },
        data: { status: "failed", finishedAt: new Date(), message },
      });

      await this.db.auditEntry.create({
        data: {
          actorId: request.user.id,
          action: "ASSISTANT_FAILED",
          entity: "AssistantAction",
          recordId: id,
        },
      });

      return { id, status: "failed" as const, message };
    }
  }
}
