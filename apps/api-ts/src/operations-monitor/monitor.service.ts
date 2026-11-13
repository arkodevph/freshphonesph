import { replayCooWrite } from "../coo-security/request-replay";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  businessRole,
  type MonitorDetail,
  type MonitorFollowUpInput,
  type MonitorItem,
  type MonitorPage,
  type MonitorQuery,
  type MonitorSource,
  type User,
} from "@freshphones/contracts";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { requireCurrentUser, allowed } from "../auth/access";
import { monitorRows } from "./monitor-query";

type Row = {
  id: string;
  source: MonitorSource;
  sourceVersion: number;
  batchId: string;
  batchCode: string;
  stage: MonitorItem["stage"];
  status: string;
  waitingSince: Date;
  responsibleId: string | null;
  staffName: string | null;
  staffActive: boolean | null;
  staffRole: string | null;
  missingReceipt: boolean;
  incomplete: boolean;
  returned: boolean;
  overdue: boolean;
  followUpId: string | null;
  followUpVersion: number | null;
  followUpStatus: "OPEN" | "RESOLVED" | null;
  followUpNote: string | null;
  dueAt: Date | null;
};

const json = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const pageSize = 20;

// Stable audit identity for the singleton policy (whose storage key is "global").
const policyAuditId = "3fd43627-269d-4ca1-98c9-38bc41a7d26c";

@Injectable()
export class OperationsMonitorService {
  constructor(@Inject(Database) private readonly db: Database) {}
  private async access(tx: Prisma.TransactionClient, user: User) {
    const current = await requireCurrentUser(tx, user, "OPERATIONS_MONITOR");

    if (
      !["COO", "OPERATIONS_COORDINATOR", "SYSTEM_ADMIN"].includes(
        businessRole(current.role),
      )
    ) {
      throw new ForbiddenException("Operations monitoring access required.");
    }

    await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${current.id}, true)`;

    return current;
  }
  private async policy(tx: Prisma.TransactionClient) {
    const row = await tx.operationsMonitorPolicy.findUnique({
      where: { id: "global" },
    });

    return {
      reviewDueHours: row?.reviewDueHours ?? 24,
      version: row?.version ?? 0,
    };
  }
  private view(row: Row, user: User): MonitorItem {
    const role =
      row.stage === "HANDLER"
        ? "Handler"
        : row.stage === "MANAGER"
          ? "Manager"
          : row.stage === "FINANCE"
            ? "Finance"
            : "Records";

    const validStaff =
      row.staffActive &&
      (row.stage === "HANDLER"
        ? ["BATCH_HANDLER", "CORE_HANDLER"].includes(row.staffRole ?? "")
        : ["BATCH_MANAGER", "GENERAL_MANAGER"].includes(row.staffRole ?? ""));

    return {
      id: row.id,
      source: row.source,
      sourceVersion: row.sourceVersion,
      batchId: row.batchId,
      batchCode: row.batchCode,
      stage: row.stage,
      status: row.status,
      waitingSince: row.waitingSince.toISOString(),
      responsibleId: row.responsibleId,
      responsibleName:
        row.stage === "COMPLETE"
          ? "No review pending"
          : row.stage === "RECORDS" || row.stage === "FINANCE"
            ? `${role} team`
            : validStaff
              ? row.staffName!
              : `${role} unavailable / unassigned`,
      missingReceipt: row.missingReceipt,
      incomplete: row.incomplete,
      returned: row.returned,
      overdue: Boolean(row.overdue),
      href:
        row.source === "PAYMENT"
          ? allowed(user, "PAYMENT_READ")
            ? `/system/payments?payment=${row.id}`
            : null
          : allowed(user, "GCASH_HISTORY_READ")
            ? `/system/gcash-history?history=${row.id}`
            : null,
      followUp: row.followUpId
        ? {
            version: row.followUpVersion!,
            status: row.followUpStatus!,
            dueAt: row.dueAt?.toISOString() ?? null,
            note: row.followUpNote!,
          }
        : null,
    };
  }
  async list(user: User, query: MonitorQuery): Promise<MonitorPage> {
    return this.db.$transaction(
      async (tx) => {
        const current = await this.access(tx, user);

        const policy = await this.policy(tx);

        const now = new Date();

        const base = monitorRows(current, now, policy.reviewDueHours);

        const filters = Prisma.sql`
        ${query.view === "RESOLVED" ? Prisma.sql`"followUpStatus" = 'RESOLVED'` : Prisma.sql`(stage <> 'COMPLETE' OR "followUpStatus" = 'OPEN')`}
        ${query.batchId ? Prisma.sql`AND "batchId" = ${query.batchId}::uuid` : Prisma.empty}
        ${query.staffId ? Prisma.sql`AND "responsibleId" = ${query.staffId}::uuid` : Prisma.empty}
        ${query.stage ? Prisma.sql`AND stage = ${query.stage}` : Prisma.empty}
        ${query.q ? Prisma.sql`AND ("batchCode" ILIKE ${`%${query.q.replace(/[\\%_]/g, "\\$&")}%`} OR "staffName" ILIKE ${`%${query.q.replace(/[\\%_]/g, "\\$&")}%`})` : Prisma.empty}
        AND "waitingSince" <= ${now}::timestamp - ${query.minAgeHours} * INTERVAL '1 hour'`;

        const kind = {
          all: Prisma.sql`TRUE`,
          missing_receipt: Prisma.sql`"missingReceipt"`,
          incomplete: Prisma.sql`incomplete`,
          overdue: Prisma.sql`overdue`,
          returned: Prisma.sql`returned`,
          follow_up: Prisma.sql`"followUpStatus" = 'OPEN'`,
        }[query.kind];

        const selected = Prisma.sql`${base}, filtered AS (SELECT * FROM observed WHERE ${filters})`;

        const [items, totals, counts, batches, staff] = await Promise.all([
          tx.$queryRaw<
            Row[]
          >`${selected} SELECT * FROM filtered WHERE ${kind} ORDER BY overdue DESC NULLS LAST, "waitingSince", source, id LIMIT ${pageSize} OFFSET ${(query.page - 1) * pageSize}`,
          tx.$queryRaw<
            { total: number }[]
          >`${selected} SELECT COUNT(*)::int AS total FROM filtered WHERE ${kind}`,
          tx.$queryRaw<
            MonitorPage["counts"][]
          >`${selected} SELECT COUNT(*)::int AS "all", COUNT(*) FILTER (WHERE "missingReceipt")::int AS missing_receipt, COUNT(*) FILTER (WHERE incomplete)::int AS incomplete, COUNT(*) FILTER (WHERE overdue)::int AS overdue, COUNT(*) FILTER (WHERE returned)::int AS returned, COUNT(*) FILTER (WHERE "followUpStatus" = 'OPEN')::int AS follow_up FROM filtered`,
          tx.$queryRaw<
            { id: string; code: string }[]
          >`${base} SELECT DISTINCT "batchId" AS id, "batchCode" AS code FROM observed ORDER BY code, id`,
          tx.$queryRaw<
            { id: string; name: string }[]
          >`${base} SELECT DISTINCT "responsibleId" AS id, "staffName" AS name FROM observed WHERE "staffName" IS NOT NULL ORDER BY name, id`,
        ]);

        return {
          items: items.map((row) => {
            return this.view(row, current);
          }),
          total: totals[0].total,
          page: query.page,
          pageSize,
          counts: counts[0],
          policy,
          batches,
          staff,
          asOf: now.toISOString(),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  private async source(
    tx: Prisma.TransactionClient,
    user: User,
    source: MonitorSource,
    id: string,
  ) {
    const policy = await this.policy(tx);

    const query = monitorRows(user, new Date(), policy.reviewDueHours, {
      source,
      id,
    });

    const rows = await tx.$queryRaw<Row[]>`${query} SELECT * FROM observed`;

    if (!rows[0]) {
      throw new NotFoundException("Monitoring item not found.");
    }

    return rows[0];
  }
  async detail(
    user: User,
    source: MonitorSource,
    id: string,
    page: number,
  ): Promise<MonitorDetail> {
    return this.db.$transaction(
      async (tx) => {
        const current = await this.access(tx, user);

        const row = await this.source(tx, current, source, id);

        const history = row.followUpId
          ? await tx.operationsFollowUpEvent.findMany({
              where: { followUpId: row.followUpId },
              include: { actor: { select: { id: true, name: true } } },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              skip: (page - 1) * pageSize,
              take: pageSize + 1,
            })
          : [];

        return {
          item: this.view(row, current),
          history: history.slice(0, pageSize).map((event) => {
            return {
              id: event.id,
              actor: event.actor,
              note: event.note,
              status: event.status,
              dueAt: event.dueAt?.toISOString() ?? null,
              createdAt: event.createdAt.toISOString(),
            };
          }),
          historyPage: page,
          historyHasNext: history.length > pageSize,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async followUp(
    user: User,
    source: MonitorSource,
    id: string,
    input: MonitorFollowUpInput,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await this.access(tx, user);

      const row = await this.source(tx, current, source, id);

      return replayCooWrite(tx, user.id, async () => {
        if (
          (row.followUpVersion ?? 0) !== input.version ||
          row.sourceVersion !== input.sourceVersion
        ) {
          throw new ConflictException(
            "This item changed. Refresh it before saving your follow-up.",
          );
        }

        if (!row.followUpId && input.status === "RESOLVED") {
          throw new ConflictException(
            "Flag this item before resolving a follow-up.",
          );
        }

        const data = {
          status: input.status,
          note: input.note,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        };

        const after = row.followUpId
          ? await tx.operationsFollowUp.update({
              where: { id: row.followUpId },
              data: { ...data, version: { increment: 1 } },
            })
          : await tx.operationsFollowUp.create({
              data: {
                ...data,
                ...(source === "PAYMENT"
                  ? { paymentId: id }
                  : { historyId: id }),
              },
            });

        await tx.operationsFollowUpEvent.create({
          data: { ...data, followUpId: after.id, actorId: current.id },
        });

        await tx.auditEntry.create({
          data: {
            actorId: current.id,
            entity: "operations_follow_up",
            recordId: after.id,
            action:
              input.status === "OPEN"
                ? "operations.follow_up_opened"
                : "operations.follow_up_resolved",
            before: json(row),
            after: json(after),
          },
        });

        await tx.changeEvent.createMany({
          data: [
            {
              entity: source === "PAYMENT" ? "payment" : "gcash-history",
              recordId: id,
            },
            { entity: "operations-monitor", recordId: row.batchId },
          ],
        });

        return { version: after.version };
      });
    });
  }
  async setPolicy(
    user: User,
    input: { version: number; reviewDueHours: number },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await this.access(tx, user);

      if (businessRole(current.role) !== "COO") {
        throw new ForbiddenException(
          "Only COO can change the review deadline.",
        );
      }

      return replayCooWrite(tx, user.id, async () => {
        const before = await this.policy(tx);

        if (before.version !== input.version) {
          throw new ConflictException(
            "The review rule changed. Refresh before saving.",
          );
        }

        const after = await tx.operationsMonitorPolicy.upsert({
          where: { id: "global" },
          create: { reviewDueHours: input.reviewDueHours },
          update: {
            reviewDueHours: input.reviewDueHours,
            version: { increment: 1 },
          },
        });

        await tx.auditEntry.create({
          data: {
            actorId: current.id,
            entity: "operations_monitor_policy",
            recordId: policyAuditId,
            action: "operations.review_policy_changed",
            before: json(before),
            after: json(after),
          },
        });

        return after;
      });
    });
  }
}
