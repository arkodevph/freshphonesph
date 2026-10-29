import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { businessRole, clientSchema, type User } from "@freshphones/contracts";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { allowed } from "../auth/access";
import { safeUser } from "../auth/auth.service";
import { batchScope, staffScope } from "./scope";
import { RecordsService } from "./records.service";

@Injectable()
export class RoleWorkspaceService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(RecordsService) private readonly records: RecordsService,
  ) {}

  async staff(user: User) {
    const rows = await this.db.user.findMany({
      where: staffScope(user),
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        supervisor: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 500,
    });

    return rows;
  }

  async assignmentOptions(user: User) {
    const [staff, profiles] = await this.db.$transaction([
      this.db.user.findMany({
        where: {
          active: true,
          ...(user.role === "SYSTEM_ADMIN"
            ? {}
            : { role: { not: "SYSTEM_ADMIN" as const } }),
        },
        select: {
          id: true,
          name: true,
          role: true,
          supervisorId: true,
          agentProfileId: true,
        },
        orderBy: { name: "asc" },
      }),
      this.db.agent.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          code: true,
          account: { select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return { staff, profiles };
  }

  private enrollmentScope(user: User): Prisma.EnrollmentRequestWhereInput {
    const role = businessRole(user.role);

    if (role === "SYSTEM_ADMIN" || role === "COO") {
      return {};
    }

    if (role === "BATCH_MANAGER") {
      return { batch: batchScope(user) };
    }

    if (role === "PIONEER_AGENT" || role === "OPERATIONS_COORDINATOR") {
      return { submittedBy: { ...staffScope(user), role: "AGENT" } };
    }

    return { submittedById: user.id };
  }

  async network(user: User) {
    const agents = await this.db.user.findMany({
      where: { ...staffScope(user), role: "AGENT", active: true },
      select: {
        id: true,
        name: true,
        supervisor: { select: { name: true } },
        agentProfile: { select: { id: true, code: true, active: true } },
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    const batches = await this.db.batch.findMany({
      where: batchScope(user),
      select: {
        id: true,
        code: true,
        model: true,
        status: true,
        _count: { select: { clients: true } },
      },
      orderBy: { code: "asc" },
      take: 100,
    });

    const counts = await this.db.enrollmentRequest.groupBy({
      by: ["status"],
      where: this.enrollmentScope(user),
      _count: true,
    });

    return {
      agents,
      batches,
      enrollmentCounts: counts.map((row) => {
        return { status: row.status, count: row._count };
      }),
    };
  }

  async enrollmentBatches(user: User) {
    return this.db.batch.findMany({
      where: {
        AND: [batchScope(user), { status: { in: ["PLANNED", "ACTIVE"] } }],
      },
      select: { id: true, code: true, model: true },
      orderBy: { code: "asc" },
      take: 500,
    });
  }

  async memberOptions(user: User, q: string) {
    const clients = await this.db.client.findMany({
      where: {
        retentionErasedAt: null,
        batch: batchScope(user),
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      distinct: ["memberId"],
      select: {
        memberId: true,
        name: true,
        email: true,
        phone: true,
        batch: { select: { code: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 20,
    });

    return clients;
  }

  async enrollments(
    user: User,
    page: number,
    status?: "PENDING" | "APPROVED" | "REJECTED",
    requestId?: string,
  ) {
    const where: Prisma.EnrollmentRequestWhereInput = {
      AND: [
        this.enrollmentScope(user),
        status ? { status } : {},
        requestId ? { id: requestId } : {},
      ],
    };

    const [items, total] = await this.db.$transaction([
      this.db.enrollmentRequest.findMany({
        where,
        include: {
          batch: { select: { code: true } },
          submittedBy: { select: { name: true } },
          reviewedBy: { select: { name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.db.enrollmentRequest.count({ where }),
    ]);

    return {
      items: items.map((row) => {
        const applicant = row.applicant as {
          name: string;
          email: string;
          phone: string;
        };

        return {
          id: row.id,
          batchCode: row.batch.code,
          name: applicant.name,
          status: row.status,
          reason: row.reason,
          version: row.version,
          clientId: row.clientId,
          submittedBy: row.submittedBy.name,
          reviewedBy: row.reviewedBy?.name ?? null,
          createdAt: row.createdAt,
          reviewedAt: row.reviewedAt,
        };
      }),
      total,
      page,
      pageSize: 20,
    };
  }

  private async write<T>(
    user: User,
    permission: "ENROLLMENT_SUBMIT" | "ENROLLMENT_REVIEW",
    run: (tx: Prisma.TransactionClient, current: User) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await tx.user.findUnique({ where: { id: user.id } });

      if (!current?.active || !allowed(current, permission)) {
        throw new ForbiddenException("Your enrollment access has changed.");
      }

      return run(tx, safeUser(current));
    });
  }

  async submit(
    user: User,
    input: {
      submissionId: string;
      batchId: string;
      name: string;
      email: string;
      phone: string;
      memberId?: string;
    },
  ) {
    return this.write(user, "ENROLLMENT_SUBMIT", async (tx, current) => {
      const existing = await tx.enrollmentRequest.findUnique({
        where: { submissionId: input.submissionId },
      });

      if (existing) {
        const applicant = existing.applicant as {
          name: string;
          email: string;
          phone: string;
          memberId?: string;
        };

        if (
          existing.submittedById !== user.id ||
          existing.batchId !== input.batchId ||
          applicant.name !== input.name ||
          applicant.email !== input.email ||
          applicant.phone !== input.phone ||
          applicant.memberId !== input.memberId
        ) {
          throw new ConflictException(
            "This submission reference has already been used.",
          );
        }

        return {
          id: existing.id,
          status: existing.status,
          version: existing.version,
        };
      }

      const batch = await tx.batch.findFirst({
        where: {
          id: input.batchId,
          ...batchScope(current),
          status: { in: ["PLANNED", "ACTIVE"] },
        },
        select: { id: true, managerId: true },
      });

      if (!batch) {
        throw new NotFoundException(
          "Choose one of your assigned, open batches.",
        );
      }

      const applicant = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        ...(input.memberId ? { memberId: input.memberId } : {}),
      };

      if (input.memberId) {
        const membership = await tx.client.findFirst({
          where: {
            memberId: input.memberId,
            retentionErasedAt: null,
            batch: batchScope(current),
          },
          select: { name: true, email: true, phone: true },
        });

        if (!membership) {
          throw new NotFoundException(
            "Choose an existing member from your assigned batches.",
          );
        }

        if (
          membership.name !== input.name ||
          membership.email !== input.email ||
          membership.phone !== input.phone
        ) {
          throw new ConflictException(
            "This member's details changed. Search and select the member again.",
          );
        }

        if (
          await tx.client.count({
            where: { memberId: input.memberId, batchId: input.batchId },
          })
        ) {
          throw new ConflictException(
            "This member already belongs to the selected batch.",
          );
        }
      }

      const request = await tx.enrollmentRequest.create({
        data: {
          submissionId: input.submissionId,
          batchId: input.batchId,
          submittedById: user.id,
          applicant,
        },
      });

      await tx.auditEntry.create({
        data: {
          actorId: user.id,
          entity: "enrollment_request",
          recordId: request.id,
          action: "enrollment.submitted",
          after: { batchId: input.batchId, status: "PENDING" },
        },
      });

      await tx.changeEvent.create({
        data: { entity: "enrollment_request", recordId: request.id },
      });

      const reviewers = await tx.user.findMany({
        where: {
          active: true,
          OR: [
            { role: "COO" },
            ...(batch.managerId
              ? [
                  {
                    id: batch.managerId,
                    role: {
                      in: [
                        "BATCH_MANAGER" as const,
                        "GENERAL_MANAGER" as const,
                      ],
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

      for (const reviewer of reviewers) {
        await tx.staffNotification.create({
          data: {
            recipientId: reviewer.id,
            eventKey: "enrollment.submitted",
            title: "Enrollment request awaiting review",
            body: "An Agent submitted a member enrollment request for your review.",
            link: "/system/enrollments",
            dedupeKey: `enrollment:${request.id}:${reviewer.id}`,
          },
        });
      }

      return {
        id: request.id,
        status: request.status,
        version: request.version,
      };
    });
  }

  async review(
    user: User,
    id: string,
    input: {
      version: number;
      decision: "APPROVED" | "REJECTED";
      reason: string;
    },
  ) {
    return this.write(user, "ENROLLMENT_REVIEW", async (tx, current) => {
      const request = await tx.enrollmentRequest.findFirst({
        where: { id, ...this.enrollmentScope(current) },
      });

      if (!request) {
        throw new NotFoundException("Enrollment request not found.");
      }

      if (request.submittedById === user.id) {
        throw new ForbiddenException(
          "A different authorized reviewer must approve the request.",
        );
      }

      if (request.status !== "PENDING") {
        if (
          request.status === input.decision &&
          request.reason === input.reason &&
          request.reviewedById === user.id
        ) {
          return {
            id,
            status: request.status,
            clientId: request.clientId,
            version: request.version,
          };
        }

        throw new ConflictException(
          "This enrollment has already been reviewed.",
        );
      }

      if (request.version !== input.version) {
        throw new ConflictException(
          "This request changed. Refresh and review it again.",
        );
      }

      let clientId: string | null = null;

      if (input.decision === "APPROVED") {
        const applicant = request.applicant as {
          name: string;
          email: string;
          phone: string;
          memberId?: string;
        };

        let identity = {
          name: applicant.name,
          email: applicant.email,
          phone: applicant.phone,
        };

        if (applicant.memberId) {
          const submitter = await tx.user.findUnique({
            where: { id: request.submittedById },
          });

          const existing =
            submitter?.active && businessRole(submitter.role) === "AGENT"
              ? await tx.client.findFirst({
                  where: {
                    memberId: applicant.memberId,
                    retentionErasedAt: null,
                    batch: batchScope(safeUser(submitter)),
                  },
                  select: { name: true, email: true, phone: true },
                })
              : null;

          if (!existing) {
            throw new ConflictException(
              "The submitting Agent no longer has access to this member. Submit a new request through the current assignment.",
            );
          }

          if (
            await tx.client.count({
              where: { memberId: applicant.memberId, batchId: request.batchId },
            })
          ) {
            throw new ConflictException(
              "This member already belongs to this batch.",
            );
          }

          identity = existing;
        }

        const member = clientSchema.parse({
          ...identity,
          batchId: request.batchId,
          status: "ACTIVE",
          releaseStatus: "NOT_READY",
        });

        clientId = (
          await this.records.enrollApproved(
            tx,
            current,
            member,
            applicant.memberId,
          )
        ).id;
      }

      const after = await tx.enrollmentRequest.update({
        where: { id, version: input.version, status: "PENDING" },
        data: {
          status: input.decision,
          reason: input.reason,
          reviewedById: user.id,
          reviewedAt: new Date(),
          clientId,
          version: { increment: 1 },
        },
      });

      await tx.auditEntry.create({
        data: {
          actorId: user.id,
          entity: "enrollment_request",
          recordId: id,
          action: "enrollment.reviewed",
          before: { status: request.status, version: request.version },
          after: {
            status: after.status,
            reason: after.reason,
            clientId,
            version: after.version,
          },
        },
      });

      await tx.changeEvent.create({
        data: { entity: "enrollment_request", recordId: id },
      });

      await tx.staffNotification.create({
        data: {
          recipientId: request.submittedById,
          eventKey: "enrollment.reviewed",
          title: "Enrollment request reviewed",
          body: `Your enrollment request was ${after.status.toLowerCase()}.`,
          link: "/system/enrollments",
          dedupeKey: `enrollment-review:${id}`,
        },
      });

      return { id, status: after.status, clientId, version: after.version };
    });
  }

  async supportLookup(q: string) {
    const rows = await this.db.client.findMany({
      where: {
        retentionErasedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { batch: { code: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        releaseStatus: true,
        batch: { select: { code: true } },
        payments: {
          select: { status: true },
          orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
      take: 20,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return rows.map((row) => {
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        releaseStatus: row.releaseStatus,
        batchCode: row.batch.code,
        latestPaymentStatus: row.payments[0]?.status ?? "NO_RECORDED_PAYMENT",
      };
    });
  }
}
