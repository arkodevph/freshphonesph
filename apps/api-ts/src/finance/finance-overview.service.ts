import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  businessRole,
  type FinanceOverview,
  type FinanceOverviewPeriod,
  type User,
} from "@freshphones/contracts";
import { allowed } from "../auth/access";
import { Database } from "../database";
import { financeStageSql } from "./payment-workflow-query";
import { verifiedTotals } from "./ledger";
import { outstandingRefundSql, refundRemainingSql } from "./refund-queue-query";

export function financePeriod(period: FinanceOverviewPeriod, now = new Date()) {
  const manila = new Date(now.getTime() + 8 * 3_600_000);

  const year = manila.getUTCFullYear();

  const month = manila.getUTCMonth();

  const today = Date.UTC(year, month, manila.getUTCDate());

  const from = new Date(
    period === "last_month"
      ? Date.UTC(year, month - 1, 1)
      : Date.UTC(year, period === "year_to_date" ? 0 : month, 1),
  );

  const to = new Date(
    period === "last_month" ? Date.UTC(year, month, 0) : today,
  );

  return { from, to };
}

@Injectable()
export class FinanceOverviewService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async overview(
    user: User,
    period: FinanceOverviewPeriod,
  ): Promise<FinanceOverview> {
    if (
      businessRole(user.role) !== "FINANCE_OFFICER" ||
      !allowed(user, "PAYMENT_VERIFY")
    ) {
      throw new ForbiddenException("Finance workspace access required.");
    }

    const { from, to } = financePeriod(period);

    return this.db.$transaction(
      async (tx) => {
        const stages = await tx.$queryRaw<{ stage: string; count: bigint }[]>`
        WITH stages AS MATERIALIZED (
          SELECT ${financeStageSql()} AS stage FROM "Payment" p JOIN "Batch" b ON b.id = p."batchId"
          WHERE p.status IN ('PENDING', 'NEEDS_CLARIFICATION')
        ) SELECT stage, COUNT(*) AS count FROM stages GROUP BY stage`;

        const queues: FinanceOverview["queues"] = {
          ready: 0,
          waiting: 0,
          waiting_records: 0,
          waiting_manager: 0,
          waiting_evidence: 0,
          membership_closed: 0,
          clarification: 0,
        };

        for (const row of stages) {
          if (row.stage in queues) {
            queues[row.stage as keyof typeof queues] = Number(row.count);
          }
        }

        queues.waiting =
          queues.waiting_records +
          queues.waiting_manager +
          queues.waiting_evidence +
          queues.membership_closed;

        const collected = await verifiedTotals(tx, {
          paymentDate: { gte: from, lte: to },
        });

        const [refunds] = await tx.$queryRaw<
          { count: bigint; remaining: string }[]
        >`
        SELECT COUNT(*) AS count, COALESCE(SUM(${refundRemainingSql()}), 0)::text AS remaining
        FROM "WithdrawalRequest" w WHERE ${outstandingRefundSql()}`;

        const taskWhere = {
          assigneeId: user.id,
          status: { in: ["TODO", "IN_PROGRESS"] as ("TODO" | "IN_PROGRESS")[] },
        };

        const count = await tx.task.count({ where: taskWhere });

        const tasks = await tx.task.findMany({
          where: taskWhere,
          orderBy: [{ deadline: "asc" }, { id: "asc" }],
          take: 5,
          select: { id: true, title: true, deadline: true, status: true },
        });

        return {
          queues,
          collections: {
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
            amount: collected.effective.toFixed(2),
            payments: collected.count,
          },
          refunds: {
            count: Number(refunds.count),
            remaining: refunds.remaining,
          },
          tasks: {
            count,
            items: tasks.map((task) => {
              return { ...task, deadline: task.deadline.toISOString() };
            }),
          },
          updatedAt: new Date().toISOString(),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
