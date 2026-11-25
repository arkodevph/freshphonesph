import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  NetworkAgent,
  NetworkAgentsQuery,
  NetworkBatchesQuery,
  NetworkRequestsQuery,
  NetworkRequestCounts,
  User,
} from "@freshphones/contracts";
import { Database } from "../database";
import { requireCurrentUser } from "../auth/access";
import { Prisma } from "../generated/prisma/client";
import { currentBatchPositionWhere } from "./batch-capacity";
import { batchScope, staffScope } from "./scope";
import { enrollmentScope } from "./enrollment-scope";

const agentSelect = {
  id: true,
  name: true,
  supervisor: { select: { name: true } },
  agentProfile: { select: { code: true, active: true } },
} satisfies Prisma.UserSelect;

const pageSize = 20;

function counts(
  rows: { status: string; _count: number }[],
): NetworkRequestCounts {
  const count = (status: string) => {
    return (
      rows.find((row) => {
        return row.status === status;
      })?._count ?? 0
    );
  };

  const pending = count("PENDING");

  const approved = count("APPROVED");

  const rejected = count("REJECTED");

  return { pending, approved, rejected, total: pending + approved + rejected };
}

function agentScope(user: User): Prisma.UserWhereInput {
  return { AND: [staffScope(user), { active: true, role: "AGENT" }] };
}

function lastPage(page: number, total: number) {
  return Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
}

@Injectable()
export class AgentNetworkService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async requestCounts(
    tx: Prisma.TransactionClient,
    where: Prisma.EnrollmentRequestWhereInput,
  ) {
    const rows = await tx.enrollmentRequest.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    return counts(rows);
  }

  private async summary(tx: Prisma.TransactionClient, user: User) {
    const [agents, batches, requests] = await Promise.all([
      tx.user.count({ where: agentScope(user) }),
      tx.batch.count({ where: batchScope(user) }),
      this.requestCounts(tx, enrollmentScope(user)),
    ]);

    return { agents, batches, requests };
  }

  private async readAgent(
    tx: Prisma.TransactionClient,
    user: User,
    id: string,
  ): Promise<NetworkAgent> {
    const agent = await tx.user.findFirst({
      where: { AND: [agentScope(user), { id }] },
      select: agentSelect,
    });

    if (!agent) {
      throw new NotFoundException(
        "This Agent is no longer in your current team scope.",
      );
    }

    const requests = await this.requestCounts(tx, {
      AND: [enrollmentScope(user), { submittedById: agent.id }],
    });

    return { ...agent, requests };
  }

  agent(user: User, id: string) {
    return this.db.$transaction(
      async (tx) => {
        return this.readAgent(
          tx,
          await requireCurrentUser(tx, user, "AGENT_NETWORK_READ"),
          id,
        );
      },
      {
        isolationLevel: "RepeatableRead",
      },
    );
  }

  agents(user: User, query: NetworkAgentsQuery) {
    return this.db.$transaction(
      async (tx) => {
        const current = await requireCurrentUser(
          tx,
          user,
          "AGENT_NETWORK_READ",
        );

        const where: Prisma.UserWhereInput = {
          AND: [
            agentScope(current),
            query.q
              ? {
                  OR: [
                    { name: { contains: query.q, mode: "insensitive" } },
                    {
                      agentProfile: {
                        code: { contains: query.q, mode: "insensitive" },
                      },
                    },
                    {
                      supervisor: {
                        name: { contains: query.q, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {},
          ],
        };

        const total = await tx.user.count({ where });

        const page = lastPage(query.page, total);

        const direction = query.sort.endsWith("desc") ? "desc" : "asc";

        const order: Prisma.UserOrderByWithRelationInput =
          query.sort.startsWith("code")
            ? { agentProfile: { code: direction } }
            : { name: direction };

        const rows = await tx.user.findMany({
          where,
          select: agentSelect,
          orderBy: [order, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        const progress = rows.length
          ? await tx.enrollmentRequest.groupBy({
              by: ["submittedById", "status"],
              where: {
                AND: [
                  enrollmentScope(current),
                  {
                    submittedById: {
                      in: rows.map((row) => {
                        return row.id;
                      }),
                    },
                  },
                ],
              },
              _count: true,
            })
          : [];

        return {
          items: rows.map((row) => {
            return {
              ...row,
              requests: counts(
                progress.filter((item) => {
                  return item.submittedById === row.id;
                }),
              ),
            };
          }),
          total,
          page,
          pageSize,
          summary: await this.summary(tx, current),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  batches(user: User, query: NetworkBatchesQuery) {
    return this.db.$transaction(
      async (tx) => {
        const current = await requireCurrentUser(
          tx,
          user,
          "AGENT_NETWORK_READ",
        );

        const where: Prisma.BatchWhereInput = {
          AND: [
            batchScope(current),
            query.q
              ? {
                  OR: [
                    { code: { contains: query.q, mode: "insensitive" } },
                    { model: { contains: query.q, mode: "insensitive" } },
                  ],
                }
              : {},
          ],
        };

        const total = await tx.batch.count({ where });

        const page = lastPage(query.page, total);

        const direction = query.sort.endsWith("desc") ? "desc" : "asc";

        const order: Prisma.BatchOrderByWithRelationInput =
          query.sort.startsWith("model")
            ? { model: direction }
            : { code: direction };

        const rows = await tx.batch.findMany({
          where,
          select: {
            id: true,
            code: true,
            model: true,
            status: true,
            _count: {
              select: { clients: { where: currentBatchPositionWhere } },
            },
          },
          orderBy: [order, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        return {
          items: rows.map(({ _count, ...row }) => {
            return {
              ...row,
              memberCount: _count.clients,
            };
          }),
          total,
          page,
          pageSize,
          summary: await this.summary(tx, current),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  requests(user: User, query: NetworkRequestsQuery) {
    return this.db.$transaction(
      async (tx) => {
        const current = await requireCurrentUser(
          tx,
          user,
          "AGENT_NETWORK_READ",
        );

        // The selected account is checked independently; filters never replace scope.
        const agent = query.agentId
          ? await this.readAgent(tx, current, query.agentId)
          : null;

        const scope: Prisma.EnrollmentRequestWhereInput = {
          AND: [
            enrollmentScope(current),
            agent ? { submittedById: agent.id } : {},
          ],
        };

        const where: Prisma.EnrollmentRequestWhereInput = {
          AND: [
            scope,
            query.status ? { status: query.status } : {},
            query.requestId ? { id: query.requestId } : {},
            query.q
              ? {
                  OR: [
                    {
                      applicant: {
                        path: ["name"],
                        string_contains: query.q,
                        mode: "insensitive",
                      },
                    },
                    {
                      batch: {
                        code: { contains: query.q, mode: "insensitive" },
                      },
                    },
                    {
                      submittedBy: {
                        name: { contains: query.q, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {},
          ],
        };

        const total = await tx.enrollmentRequest.count({ where });

        const page = lastPage(query.page, total);

        const direction = query.sort === "oldest" ? "asc" : "desc";

        const rows = await tx.enrollmentRequest.findMany({
          where,
          select: {
            id: true,
            applicant: true,
            status: true,
            reason: true,
            version: true,
            submittedById: true,
            createdAt: true,
            reviewedAt: true,
            batch: { select: { code: true } },
            submittedBy: { select: { name: true } },
            reviewedBy: { select: { name: true } },
          },
          orderBy: [{ createdAt: direction }, { id: direction }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });

        return {
          items: rows.map((row) => {
            return {
              id: row.id,
              kind: (row.applicant as { withdrawalId?: string }).withdrawalId
                ? "REPLACEMENT"
                : "NEW_MEMBER",
              name:
                (row.applicant as { name?: string }).name ??
                "Unnamed applicant",
              batchCode: row.batch.code,
              status: row.status,
              reason: row.reason,
              version: row.version,
              submittedBy: row.submittedBy.name,
              submittedById: row.submittedById,
              reviewedBy: row.reviewedBy?.name ?? null,
              createdAt: row.createdAt.toISOString(),
              reviewedAt: row.reviewedAt?.toISOString() ?? null,
            };
          }),
          total,
          page,
          pageSize,
          agent,
          scopeCounts: await this.requestCounts(tx, scope),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
}
