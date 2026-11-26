import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  businessRole,
  type Permission,
  type PioneerTaskCounts,
  type PioneerTaskOverview,
  type PioneerTeamOverview,
  type User,
} from "@freshphones/contracts";
import { requireCurrentUser } from "../auth/access";
import { Database } from "../database";
import type { Prisma, TaskStatus } from "../generated/prisma/client";
import { enrollmentScope } from "./enrollment-scope";
import { staffScope, taskScope } from "./scope";

async function currentPioneer(
  tx: Prisma.TransactionClient,
  user: User,
  permission: Permission,
) {
  const current = await requireCurrentUser(tx, user, permission);

  if (businessRole(current.role) !== "PIONEER_AGENT") {
    throw new ForbiddenException("Pioneer workspace access required.");
  }

  return current;
}

async function taskCounts(
  tx: Prisma.TransactionClient,
  where: Prisma.TaskWhereInput,
  asOf: Date,
): Promise<PioneerTaskCounts> {
  const rows = await tx.task.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  const overdue = await tx.task.count({
    where: {
      AND: [
        where,
        { status: { in: ["TODO", "IN_PROGRESS"] }, deadline: { lt: asOf } },
      ],
    },
  });

  const count = (status: TaskStatus) => {
    return (
      rows.find((row) => {
        return row.status === status;
      })?._count ?? 0
    );
  };

  const todo = count("TODO");

  const inProgress = count("IN_PROGRESS");

  const submitted = count("SUBMITTED");

  const done = count("DONE");

  return {
    todo,
    inProgress,
    submitted,
    done,
    total: rows.reduce((sum, row) => {
      return sum + row._count;
    }, 0),
    outstanding: todo + inProgress + submitted,
    overdue,
  };
}

@Injectable()
export class PioneerOverviewService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async team(user: User): Promise<PioneerTeamOverview> {
    return this.db.$transaction(
      async (tx) => {
        const current = await currentPioneer(tx, user, "AGENT_NETWORK_READ");

        const where: Prisma.UserWhereInput = {
          AND: [staffScope(current), { role: "AGENT", active: true }],
        };

        const total = await tx.user.count({ where });

        const missingProfile = await tx.user.count({
          where: { AND: [where, { agentProfileId: null }] },
        });

        const inactiveProfile = await tx.user.count({
          where: { AND: [where, { agentProfile: { active: false } }] },
        });

        const preview = await tx.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            agentProfile: { select: { code: true, active: true } },
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: 4,
        });

        const rows = await tx.enrollmentRequest.groupBy({
          by: ["status"],
          where: enrollmentScope(current),
          _count: true,
        });

        const count = (status: string) => {
          return (
            rows.find((row) => {
              return row.status === status;
            })?._count ?? 0
          );
        };

        return {
          agents: {
            total,
            ready: total - missingProfile - inactiveProfile,
            missingProfile,
            inactiveProfile,
          },
          enrollments: {
            pending: count("PENDING"),
            approved: count("APPROVED"),
            rejected: count("REJECTED"),
            total: rows.reduce((sum, row) => {
              return sum + row._count;
            }, 0),
          },
          preview,
          updatedAt: new Date().toISOString(),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async tasks(user: User): Promise<PioneerTaskOverview> {
    return this.db.$transaction(
      async (tx) => {
        const current = await currentPioneer(tx, user, "TASK_READ");

        const asOf = new Date();

        const scope = taskScope(current);

        const own = await taskCounts(
          tx,
          { AND: [scope, { assigneeId: current.id }] },
          asOf,
        );

        const team = await taskCounts(
          tx,
          {
            AND: [
              scope,
              {
                assignee: {
                  role: "AGENT",
                  supervisorId: current.id,
                  active: true,
                },
              },
            ],
          },
          asOf,
        );

        return { own, team, updatedAt: asOf.toISOString() };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
