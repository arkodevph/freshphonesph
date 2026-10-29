import { AbusePolicy } from "../abuse/policies";
import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { User } from "@freshphones/contracts";
import { AuthService } from "../auth/auth.service";
import {
  allowed,
  type AuthRequest,
  RequiresAny,
  Requires,
} from "../auth/access";
import { Database } from "../database";
import {
  batchScope,
  clientScope,
  taskScope,
  staffScope,
} from "../records/scope";
import { supportAlertIsVisible } from "../staff/support-alerts";
import { accountAlertIsVisible } from "../staff/account-alerts";
import { notificationVisibilitySql } from "../staff/enrollment-alerts";
import {
  RedisEventsService,
  type LiveHint,
} from "../redis/redis-events.service";

@AbusePolicy("stream")
@Controller("events")
export class RealtimeController {
  private async membershipSession(request: AuthRequest) {
    const session = await this.auth.authenticate(request.accessToken);

    return request.user.role === "CUSTOMER" && request.user.clientId
      ? {
          ...session,
          user: await this.auth.selectMembership(
            session.user,
            request.user.clientId,
          ),
        }
      : session;
  }
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RedisEventsService) private readonly live: RedisEventsService,
  ) {}
  private async visible(
    user: User,
    event: { entity: string; recordId: string },
  ) {
    if (event.entity === "member") {
      return (
        (allowed(user, "CLIENT_READ") || user.role === "CUSTOMER") &&
        Boolean(
          await this.db.client.findFirst({
            where: {
              memberId: event.recordId,
              retentionErasedAt: null,
              ...clientScope(user),
            },
            select: { id: true },
          }),
        )
      );
    }

    if (event.entity === "retention") {
      return allowed(user, "RETENTION_MANAGE");
    }

    if (event.entity === "gcash-history") {
      if (!allowed(user, "GCASH_HISTORY_READ")) {
        return false;
      }

      return Boolean(
        await this.db.gcashHistory.findFirst({
          where: { id: event.recordId, batch: batchScope(user) },
          select: { id: true },
        }),
      );
    }

    if (event.entity === "catalog") {
      return allowed(user, "CATALOG_MANAGE");
    }

    if (event.entity === "hr_action_request") {
      if (!allowed(user, "HR_CONFIDENTIAL")) {
        return false;
      }

      if (user.role === "SYSTEM_ADMIN") {
        return true;
      }

      return Boolean(
        await this.db.hrActionRequest.findFirst({
          where: {
            id: event.recordId,
            proposedById: user.id,
          },
          select: { id: true },
        }),
      );
    }

    if (event.entity === "account-alert") {
      if (!allowed(user, "ACCOUNT_MANAGE")) {
        return false;
      }

      return accountAlertIsVisible(this.db, user.id, event.recordId);
    }

    if (event.entity === "support-alert") {
      if (user.role === "CUSTOMER" || !allowed(user, "SUPPORT_MANAGE")) {
        return false;
      }

      return supportAlertIsVisible(this.db, user.id, event.recordId);
    }

    if (event.entity === "payment-result") {
      if (
        user.role === "CUSTOMER" ||
        (!allowed(user, "PAYMENT_RECORD") && user.role !== "RECORDS") ||
        !allowed(user, "PAYMENT_READ")
      ) {
        return false;
      }

      return Boolean(
        await this.db.paymentResultAlert.findFirst({
          where: {
            id: event.recordId,
            userId: user.id,
            payment: { batch: batchScope(user) },
          },
          select: { id: true },
        }),
      );
    }

    if (event.entity === "staff-alert-read") {
      return user.id === event.recordId && user.role !== "CUSTOMER";
    }

    if (event.entity === "task") {
      return (
        allowed(user, "TASK_READ") &&
        Boolean(
          await this.db.task.findFirst({
            where: { id: event.recordId, ...taskScope(user) },
            select: { id: true },
          }),
        )
      );
    }

    if (event.entity === "enrollment_request") {
      if (
        !allowed(user, "ENROLLMENT_SUBMIT") &&
        !allowed(user, "ENROLLMENT_REVIEW") &&
        !allowed(user, "AGENT_NETWORK_READ")
      ) {
        return false;
      }

      const scope = ["SYSTEM_ADMIN", "COO"].includes(user.role)
        ? {}
        : ["BATCH_MANAGER", "GENERAL_MANAGER"].includes(user.role)
          ? { batch: batchScope(user) }
          : { submittedBy: staffScope(user) };

      return Boolean(
        await this.db.enrollmentRequest.findFirst({
          where: { id: event.recordId, ...scope },
          select: { id: true },
        }),
      );
    }

    if (event.entity === "finance-alert-read") {
      return user.id === event.recordId && allowed(user, "PAYMENT_VERIFY");
    }

    if (event.entity === "record-access") {
      return user.id === event.recordId;
    }

    if (event.entity === "applicant") {
      return (
        allowed(user, "RECRUITMENT_MANAGE") && allowed(user, "HR_CONFIDENTIAL")
      );
    }

    if (event.entity === "job_opening") {
      return allowed(user, "RECRUITMENT_MANAGE");
    }

    if (event.entity === "agent") {
      return allowed(user, "AGENT_MANAGE");
    }

    if (event.entity === "account") {
      return (
        user.id === event.recordId ||
        (allowed(user, "ACCOUNT_MANAGE") &&
          Boolean(
            await this.db.user.findFirst({
              where: {
                id: event.recordId,
                ...(user.role === "SYSTEM_ADMIN"
                  ? {}
                  : { role: { not: "SYSTEM_ADMIN" } }),
              },
              select: { id: true },
            }),
          ))
      );
    }

    if (event.entity === "client") {
      return (
        (allowed(user, "CLIENT_READ") || user.role === "CUSTOMER") &&
        Boolean(
          await this.db.client.findFirst({
            where: { id: event.recordId, ...clientScope(user) },
            select: { id: true },
          }),
        )
      );
    }

    if (event.entity === "batch") {
      return (
        (allowed(user, "BATCH_READ") || user.role === "CUSTOMER") &&
        Boolean(
          await this.db.batch.findFirst({
            where: { id: event.recordId, ...batchScope(user) },
            select: { id: true },
          }),
        )
      );
    }

    if (event.entity === "payment") {
      return (
        allowed(user, "PAYMENT_READ") &&
        Boolean(
          await this.db.payment.findFirst({
            where: {
              id: event.recordId,
              batch: batchScope(user),
              ...(user.role === "CUSTOMER"
                ? {
                    clientId:
                      user.clientId ?? "00000000-0000-0000-0000-000000000000",
                    status: "VERIFIED",
                  }
                : {}),
            },
            select: { id: true },
          }),
        )
      );
    }

    if (event.entity === "support") {
      if (allowed(user, "SUPPORT_MANAGE")) {
        return true;
      }

      if (user.role === "CUSTOMER" && user.clientId) {
        return Boolean(
          await this.db.supportCase.findFirst({
            where: { id: event.recordId, clientId: user.clientId },
            select: { id: true },
          }),
        );
      }
    }

    if (event.entity === "notification") {
      return Boolean(
        (await this.db.notification.findFirst({
          where: { id: event.recordId, userId: user.id },
          select: { id: true },
        })) ||
        (
          await this.db.$queryRaw<{ id: string }[]>`
          SELECT n.id FROM "StaffNotification" n
          WHERE n.id = ${event.recordId}::uuid AND ${notificationVisibilitySql(user.id)}`
        )[0],
      );
    }

    if (event.entity === "document") {
      if (user.role === "SYSTEM_ADMIN" || user.role === "RECORDS") {
        return true;
      }

      if (user.role === "CUSTOMER" && user.clientId) {
        return Boolean(
          await this.db.customerDocument.findFirst({
            where: { id: event.recordId, clientId: user.clientId },
            select: { id: true },
          }),
        );
      }
    }

    return false;
  }
  @Get()
  @RequiresAny(
    "BATCH_READ",
    "CLIENT_READ",
    "PAYMENT_READ",
    "TASK_READ",
    "SUPPORT_MANAGE",
    "ACCOUNT_MANAGE",
    "NOTIFICATION_READ",
    "DOCUMENT_READ",
  )
  async stream(@Req() request: AuthRequest, @Res() response: Response) {
    if (this.live.enabled) {
      return this.redisStream(request, response);
    }

    // A fresh snapshot on ready/reconnect closes the gap before this cursor.
    let cursor =
      (await this.db.changeEvent.findFirst({ orderBy: { id: "desc" } }))?.id ??
      0n;

    response.setHeader("Content-Type", "text/event-stream");

    response.setHeader("Cache-Control", "no-cache, no-transform");

    response.setHeader("X-Accel-Buffering", "no");

    response.flushHeaders();

    response.write("retry: 2000\nevent: ready\ndata: {}\n\n");

    let closed = false;

    let timer: ReturnType<typeof setTimeout> | undefined;

    let heartbeat = 0;

    const stop = () => {
      closed = true;

      if (timer) {
        clearTimeout(timer);
      }

      if (!response.writableEnded) {
        response.end();
      }
    };

    request.on("close", stop);

    response.on("error", stop);

    const tick = async () => {
      if (closed) {
        return;
      }

      try {
        const { user, mfaRequired } = await this.membershipSession(request);

        if (mfaRequired) {
          stop();

          return;
        }

        const events = await this.db.changeEvent.findMany({
          where: { id: { gt: cursor } },
          orderBy: { id: "asc" },
          take: 100,
        });

        for (const event of events) {
          if (closed) {
            return;
          }

          if (await this.visible(user, event)) {
            if (
              !response.write(
                `event: change\ndata: ${JSON.stringify({ entity: event.entity, recordId: event.recordId })}\n\n`,
              )
            ) {
              stop();

              return;
            }
          }

          cursor = event.id;
        }

        if (++heartbeat % 15 === 0 && !response.write(": keepalive\n\n")) {
          stop();

          return;
        }
      } catch {
        stop();

        return;
      }

      if (!closed) {
        timer = setTimeout(() => {
          void tick();
        }, 1000);
      }
    };

    timer = setTimeout(() => {
      void tick();
    }, 1000);
  }
  private redisStream(request: AuthRequest, response: Response) {
    response.setHeader("Content-Type", "text/event-stream");

    response.setHeader("Cache-Control", "no-cache, no-transform");

    response.setHeader("X-Accel-Buffering", "no");

    response.flushHeaders();

    let closed = false,
      draining = false,
      checking = false,
      heartbeat = 0;

    const pending: LiveHint[] = [];

    const stop = () => {
      if (closed) {
        return;
      }

      closed = true;

      unsubscribe();

      clearInterval(timer);

      pending.length = 0;

      if (!response.writableEnded) {
        response.end();
      }
    };

    const write = (frame: string) => {
      if (!closed && !response.write(frame)) {
        stop();
      }
    };

    const drain = async () => {
      if (closed || draining) {
        return;
      }

      draining = true;

      try {
        while (!closed && pending.length) {
          const hint = pending.shift()!;

          const { user, mfaRequired } = await this.membershipSession(request);

          if (mfaRequired) {
            stop();

            break;
          }

          if (hint === null) {
            write("event: ready\ndata: {}\n\n");
          } else if (await this.visible(user, hint)) {
            write(`event: change\ndata: ${JSON.stringify(hint)}\n\n`);
          }
        }
      } catch {
        stop();
      } finally {
        draining = false;
      }
    };

    const unsubscribe = this.live.subscribe((hint) => {
      if (closed) {
        return;
      }

      if (hint === null) {
        pending.length = 0;
      }

      // Bound slow browsers; a reconnect fetches the current authorized snapshot.
      if (pending.length >= 100) {
        stop();

        return;
      }

      pending.push(hint);

      void drain();
    });

    const timer = setInterval(() => {
      if (closed || checking) {
        return;
      }

      checking = true;

      void this.membershipSession(request)
        .then(({ mfaRequired }) => {
          if (mfaRequired) {
            stop();
          } else if (++heartbeat % 15 === 0) {
            write(": keepalive\n\n");
          }
        })
        .catch(stop)
        .finally(() => {
          checking = false;
        });
    }, 1000);

    timer.unref();

    response.on("close", stop);

    response.on("error", stop);

    request.on("aborted", stop);

    write("retry: 2000\nevent: ready\ndata: {}\n\n");
  }
}
