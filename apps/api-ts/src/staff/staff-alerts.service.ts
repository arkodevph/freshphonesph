import {
  captureHandlerInbox,
  handlerInboxPage,
  isHandlerInbox,
  readHandlerInbox,
  deleteHandlerInbox,
} from "./handler-inbox";
import { staffAlertView, type AlertRow } from "./staff-alert-view";
import { safeUser } from "../auth/auth.service";
import { batchScope } from "../records/scope";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PaymentResultDetail,
  PaymentReviewDetail,
  StaffAlertPage,
  StaffAlertReadInput,
  StaffAlertScope,
  User,
} from "@freshphones/contracts";
import { allowed } from "../auth/access";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { FinanceAlertsService } from "../finance/finance-alerts.service";
import {
  alertScopeSql,
  financeAlertRows,
  markFinanceAlertsRead,
  paymentResultRows,
  taskAlertKind,
  taskAlertRows,
  taskStageSql,
  utcTimestamp,
} from "./alert-queries";
import {
  canReadPaymentReviews,
  paymentReviewAlertRows,
  markPaymentReviewsRead,
} from "./payment-review-alerts";
import { canReadPaymentResults } from "./payment-results";
import { supportAlertIsVisible, supportAlertRows } from "./support-alerts";
import { accountAlertIsVisible, accountAlertRows } from "./account-alerts";
import {
  enrollmentAlertRows,
  markEnrollmentAlertsRead,
} from "./enrollment-alerts";

const pageSize = 20;

@Injectable()
export class StaffAlertsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(FinanceAlertsService)
    private readonly finance: FinanceAlertsService,
  ) {}

  private access(user: Pick<User, "role">, scope: StaffAlertScope = "all") {
    if (user.role === "CUSTOMER") {
      throw new ForbiddenException("Staff access required.");
    }

    if (scope === "finance" && !allowed(user, "PAYMENT_VERIFY")) {
      throw new ForbiddenException("Finance verification access required.");
    }

    if (scope === "results" && !canReadPaymentResults(user)) {
      throw new ForbiddenException(
        "Payment recording and read access required.",
      );
    }

    if (scope === "reviews" && !canReadPaymentReviews(user)) {
      throw new ForbiddenException("Handler payment review access required.");
    }

    if (scope === "support" && !allowed(user, "SUPPORT_MANAGE")) {
      throw new ForbiddenException("Customer Service access required.");
    }

    if (scope === "accounts" && !allowed(user, "ACCOUNT_MANAGE")) {
      throw new ForbiddenException("Account administration access required.");
    }

    if (
      scope === "enrollments" &&
      !allowed(user, "ENROLLMENT_SUBMIT") &&
      !allowed(user, "ENROLLMENT_REVIEW")
    ) {
      throw new ForbiddenException("Enrollment access required.");
    }
  }
  async list(
    user: User,
    query: { page: number; unreadOnly: boolean; scope: StaffAlertScope },
  ): Promise<StaffAlertPage> {
    this.access(user, query.scope);

    if (isHandlerInbox(user.role)) {
      return this.db.$transaction(async (tx) => {
        const current = await tx.user.findUnique({ where: { id: user.id } });

        if (!current?.active || !isHandlerInbox(current.role)) {
          throw new ForbiddenException("Your access has changed.");
        }

        this.access(safeUser(current), query.scope);

        await captureHandlerInbox(tx, current.id);

        return handlerInboxPage(tx, current.id, query);
      });
    }

    const now = new Date();

    let source = taskAlertRows(user.id, now);

    if (allowed(user, "PAYMENT_VERIFY")) {
      source = Prisma.sql`${source} UNION ALL ${financeAlertRows(user.id)}`;
    }

    if (canReadPaymentResults(user)) {
      source = Prisma.sql`${source} UNION ALL ${paymentResultRows(user.id)}`;
    }

    if (canReadPaymentReviews(user)) {
      source = Prisma.sql`${source} UNION ALL ${paymentReviewAlertRows(user.id)}`;
    }

    if (allowed(user, "SUPPORT_MANAGE")) {
      source = Prisma.sql`${source} UNION ALL ${supportAlertRows(user.id)}`;
    }

    if (allowed(user, "ACCOUNT_MANAGE")) {
      source = Prisma.sql`${source} UNION ALL ${accountAlertRows(user.id)}`;
    }

    if (
      allowed(user, "ENROLLMENT_SUBMIT") ||
      allowed(user, "ENROLLMENT_REVIEW")
    ) {
      source = Prisma.sql`${source} UNION ALL ${enrollmentAlertRows(user.id)}`;
    }

    const scope = alertScopeSql(query.scope);

    const [rows, counts] = await this.db.$transaction(
      [
        this.db.$queryRaw<
          AlertRow[]
        >`WITH alerts AS (${source}) SELECT * FROM alerts
        WHERE ${scope} ${query.unreadOnly ? Prisma.sql`AND "readAt" IS NULL` : Prisma.empty}
        ORDER BY "occurredAt" DESC, id DESC, entity DESC LIMIT ${pageSize} OFFSET ${(query.page - 1) * pageSize}`,
        this.db.$queryRaw<
          {
            active: bigint;
            unread: bigint;
            filtered: bigint;
            filteredUnread: bigint;
            tasks: bigint;
            finance: bigint;
            results: bigint;
            reviews: bigint;
            support: bigint;
            accounts: bigint;
            enrollments: bigint;
          }[]
        >`
        WITH alerts AS (${source}) SELECT COUNT(*) AS active, COUNT(*) FILTER (WHERE "readAt" IS NULL) AS unread,
          COUNT(*) FILTER (WHERE ${scope}) AS filtered, COUNT(*) FILTER (WHERE ${scope} AND "readAt" IS NULL) AS "filteredUnread",
          COUNT(*) FILTER (WHERE entity = 'task') AS tasks, COUNT(*) FILTER (WHERE entity = 'payment') AS finance,
          COUNT(*) FILTER (WHERE entity = 'payment-result') AS results,
          COUNT(*) FILTER (WHERE entity = 'payment-review') AS reviews, COUNT(*) FILTER (WHERE entity = 'support') AS support,
          COUNT(*) FILTER (WHERE entity = 'account') AS accounts,
          COUNT(*) FILTER (WHERE entity = 'enrollment') AS enrollments FROM alerts`,
      ],
      { isolationLevel: "RepeatableRead" },
    );

    const count = counts[0];

    return {
      items: rows.map(staffAlertView),
      page: query.page,
      pageSize,
      total: Number(query.unreadOnly ? count.filteredUnread : count.filtered),
      activeCount: Number(count.active),
      unreadCount: Number(count.unread),
      filteredCount: Number(count.filtered),
      filteredUnreadCount: Number(count.filteredUnread),
      taskCount: Number(count.tasks),
      financeCount: Number(count.finance),
      resultCount: Number(count.results),
      reviewCount: Number(count.reviews),
      supportCount: Number(count.support),
      accountCount: Number(count.accounts),
      enrollmentCount: Number(count.enrollments),
    };
  }
  private async write<T>(
    user: User,
    scope: StaffAlertScope,
    run: (tx: Prisma.TransactionClient, current: User, now: Date) => Promise<T>,
  ) {
    this.access(user, scope);

    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await tx.user.findUnique({
        where: { id: user.id },
      });

      if (!current?.active) {
        throw new ForbiddenException("Your access has changed.");
      }

      this.access(current, scope);

      if (isHandlerInbox(current.role)) {
        await captureHandlerInbox(tx, current.id);
      }

      const result = await run(tx, safeUser(current), new Date());

      if (isHandlerInbox(current.role)) {
        await captureHandlerInbox(tx, current.id);
      }

      return result;
    });
  }
  async read(user: User, id: string, input: StaffAlertReadInput) {
    this.access(user);

    if (input.entity === "enrollment") {
      return this.write(user, "enrollments", async (tx, current, now) => {
        const [alert] = await tx.$queryRaw<
          { version: number; readAt: Date | null }[]
        >`
          SELECT version, "readAt" FROM (${enrollmentAlertRows(current.id)}) visible WHERE id = ${id}::uuid`;

        if (!alert) {
          throw new NotFoundException("Enrollment alert not found.");
        }

        if (alert.version !== input.version) {
          throw new ConflictException(
            "This enrollment changed. Refresh the alerts and open the current request.",
          );
        }

        if (alert.readAt) {
          return { id, readAt: alert.readAt.toISOString() };
        }

        await markEnrollmentAlertsRead(tx, current.id, now, id);

        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: current.id },
        });

        return { id, readAt: now.toISOString() };
      });
    }

    if (input.entity === "payment-review") {
      return this.write(user, "reviews", async (tx, current, now) => {
        const [review] = await tx.$queryRaw<
          { version: number; readAt: Date | null }[]
        >`
          SELECT version, "readAt" FROM (${paymentReviewAlertRows(current.id)}) visible WHERE id = ${id}::uuid`;

        if (!review) {
          throw new NotFoundException("Payment review alert not found.");
        }

        if (review.version !== input.version) {
          throw new ConflictException(
            "This review reference changed. Refresh the alerts and open it again.",
          );
        }

        if (review.readAt) {
          return { id, readAt: review.readAt.toISOString() };
        }

        await markPaymentReviewsRead(tx, current.id, now, id);

        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: current.id },
        });

        return { id, readAt: now.toISOString() };
      });
    }

    if (input.entity === "payment") {
      return this.finance.read(user, id, input.version);
    }

    if (input.entity === "account") {
      return this.write(user, "accounts", async (tx, _current, now) => {
        if (!(await accountAlertIsVisible(tx, user.id, id))) {
          throw new NotFoundException("Account alert not found.");
        }

        const alert = await tx.accountAlert.findUniqueOrThrow({
          where: { id },
        });

        if (alert.readAt) {
          return { id, readAt: alert.readAt.toISOString() };
        }

        await tx.accountAlert.update({ where: { id }, data: { readAt: now } });

        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: user.id },
        });

        return { id, readAt: now.toISOString() };
      });
    }

    if (input.entity === "support") {
      return this.write(user, "support", async (tx, _current, now) => {
        if (!(await supportAlertIsVisible(tx, user.id, id))) {
          throw new NotFoundException("Active Support alert not found.");
        }

        const alert = await tx.supportAlert.findUniqueOrThrow({
          where: { id },
        });

        if (alert.readAt) {
          return { id, readAt: alert.readAt.toISOString() };
        }

        await tx.supportAlert.update({ where: { id }, data: { readAt: now } });

        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: user.id },
        });

        return { id, readAt: now.toISOString() };
      });
    }

    if (input.entity === "payment-result") {
      return this.write(user, "results", async (tx, current, now) => {
        const result = await tx.paymentResultAlert.findFirst({
          where: {
            id,
            userId: user.id,
            payment: { batch: batchScope(current) },
          },
        });

        if (!result) {
          throw new NotFoundException("Finance result alert not found.");
        }

        if (result.readAt) {
          return { id, readAt: result.readAt.toISOString() };
        }

        const updated = await tx.paymentResultAlert.update({
          where: { id },
          data: { readAt: now },
        });

        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: user.id },
        });

        return { id, readAt: updated.readAt!.toISOString() };
      });
    }

    return this.write(user, "tasks", async (tx, _current, now) => {
      const task = await tx.task.findFirst({
        where: {
          id,
          assigneeId: user.id,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        select: { deadline: true },
      });

      if (!task) {
        throw new NotFoundException("Active task alert not found.");
      }

      if (
        task.deadline.getTime() !== new Date(input.deadline).getTime() ||
        taskAlertKind(task.deadline, now) !== input.kind
      ) {
        throw new ConflictException(
          "This task alert changed. Refresh the alerts and open the current task.",
        );
      }

      const where = {
        userId_taskId_kind: { userId: user.id, taskId: id, kind: input.kind },
      };

      const previous = await tx.taskAlertRead.findUnique({ where });

      if (previous?.deadline.getTime() === task.deadline.getTime()) {
        return { id, readAt: previous.readAt.toISOString() };
      }

      const receipt = await tx.taskAlertRead.upsert({
        where,
        create: {
          userId: user.id,
          taskId: id,
          kind: input.kind,
          deadline: task.deadline,
          readAt: now,
        },
        update: { deadline: task.deadline, readAt: now },
      });

      await tx.changeEvent.create({
        data: { entity: "staff-alert-read", recordId: user.id },
      });

      return { id, readAt: receipt.readAt.toISOString() };
    });
  }
  async readAll(user: User, scope: StaffAlertScope) {
    return this.write(user, scope, async (tx, current, now) => {
      const tasks =
        scope === "all" || scope === "tasks"
          ? await tx.$executeRaw`
        INSERT INTO "TaskAlertRead" ("userId", "taskId", kind, deadline, "readAt")
        SELECT ${user.id}::uuid, t.id, (${taskStageSql(now)})::"TaskAlertKind", t.deadline, ${utcTimestamp(now)}::timestamp
        FROM "Task" t WHERE t."assigneeId" = ${user.id}::uuid AND t.status IN ('TODO', 'IN_PROGRESS')
        ON CONFLICT ("userId", "taskId", kind) DO UPDATE SET deadline = EXCLUDED.deadline, "readAt" = EXCLUDED."readAt"
          WHERE "TaskAlertRead".deadline <> EXCLUDED.deadline`
          : 0;

      const finance =
        (scope === "all" || scope === "finance") &&
        allowed(current, "PAYMENT_VERIFY")
          ? await markFinanceAlertsRead(tx, user.id)
          : 0;

      const results =
        (scope === "all" || scope === "results") &&
        canReadPaymentResults(current)
          ? (
              await tx.paymentResultAlert.updateMany({
                where: {
                  userId: user.id,
                  readAt: null,
                  payment: { batch: batchScope(current) },
                },
                data: { readAt: now },
              })
            ).count
          : 0;

      const reviews =
        (scope === "all" || scope === "reviews") &&
        canReadPaymentReviews(current)
          ? await markPaymentReviewsRead(tx, current.id, now)
          : 0;

      const support =
        (scope === "all" || scope === "support") &&
        allowed(current, "SUPPORT_MANAGE")
          ? await tx.$executeRaw`
        UPDATE "SupportAlert" SET "readAt" = ${utcTimestamp(now)}::timestamp WHERE "readAt" IS NULL
          AND id IN (SELECT id FROM (${supportAlertRows(user.id)}) visible)`
          : 0;

      const accounts =
        (scope === "all" || scope === "accounts") &&
        allowed(current, "ACCOUNT_MANAGE")
          ? (
              await tx.accountAlert.updateMany({
                where: { userId: user.id, readAt: null },
                data: { readAt: now },
              })
            ).count
          : 0;

      const enrollments =
        (scope === "all" || scope === "enrollments") &&
        (allowed(current, "ENROLLMENT_SUBMIT") ||
          allowed(current, "ENROLLMENT_REVIEW"))
          ? await markEnrollmentAlertsRead(tx, current.id, now)
          : 0;

      if (
        tasks +
        finance +
        results +
        reviews +
        support +
        accounts +
        enrollments
      ) {
        await tx.changeEvent.create({
          data: { entity: "staff-alert-read", recordId: user.id },
        });
      }

      let historical = 0;

      if (isHandlerInbox(current.role)) {
        await captureHandlerInbox(tx, current.id, now);

        historical = (
          await readHandlerInbox(tx, current.id, now, undefined, scope)
        ).updated;
      }

      return {
        updated:
          historical +
          tasks +
          finance +
          results +
          reviews +
          support +
          accounts +
          enrollments,
      };
    });
  }
  async readInbox(user: User, id: string) {
    return this.write(user, "all", async (tx, current, now) => {
      if (!isHandlerInbox(current.role)) {
        throw new ForbiddenException("Handler inbox access required.");
      }

      return readHandlerInbox(tx, current.id, now, id);
    });
  }

  async deleteInbox(user: User, id: string) {
    return this.write(user, "all", async (tx, current, now) => {
      if (!isHandlerInbox(current.role)) {
        throw new ForbiddenException("Handler inbox access required.");
      }

      return deleteHandlerInbox(tx, current.id, id, now);
    });
  }

  async review(user: User, id: string): Promise<PaymentReviewDetail> {
    this.access(user, "reviews");

    return this.db.$transaction(
      async (tx) => {
        const [visible] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM (${paymentReviewAlertRows(user.id)}) visible WHERE id = ${id}::uuid`;

        if (!visible) {
          throw new NotFoundException("Payment review alert not found.");
        }

        const review = await tx.paymentOperationalReview.findUniqueOrThrow({
          where: { id },
          include: {
            reviewer: { select: { name: true } },
            payment: {
              select: {
                id: true,
                status: true,
                version: true,
                client: { select: { name: true } },
                batch: { select: { code: true } },
              },
            },
          },
        });

        return {
          id: review.id,
          paymentId: review.paymentId,
          stage: review.stage as PaymentReviewDetail["stage"],
          decision: review.decision as PaymentReviewDetail["decision"],
          notes: review.notes,
          reviewerName: review.reviewer.name,
          occurredAt: review.createdAt.toISOString(),
          paymentVersion: review.paymentVersion,
          evidenceVersion: review.evidenceVersion,
          clientName: review.payment.client.name,
          batchCode: review.payment.batch.code,
          currentStatus: review.payment.status,
          currentVersion: review.payment.version,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async result(user: User, id: string): Promise<PaymentResultDetail> {
    this.access(user, "results");

    const result = await this.db.paymentResultAlert.findFirst({
      where: { id, userId: user.id, payment: { batch: batchScope(user) } },
      include: { payment: { select: { status: true, version: true } } },
    });

    if (!result) {
      throw new NotFoundException("Finance result alert not found.");
    }

    return {
      id: result.id,
      paymentId: result.paymentId,
      version: result.paymentVersion,
      decision: result.decision as PaymentResultDetail["decision"],
      amount: result.amount.toFixed(2),
      clientName: result.clientName,
      batchCode: result.batchCode,
      notes: result.notes,
      verifierName: result.verifierName,
      occurredAt: result.createdAt.toISOString(),
      currentStatus: result.payment.status,
      currentVersion: result.payment.version,
    };
  }
}
