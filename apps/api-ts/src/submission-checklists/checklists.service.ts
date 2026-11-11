import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  businessRole,
  type ChecklistQuery,
  type EvidenceRequirementInput,
  type SubmissionChecklist,
  type User,
} from "@freshphones/contracts";
import { requireCurrentUser } from "../auth/access";
import { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { batchScope } from "../records/scope";
import { queryChecklist } from "./checklist-query";

const canManage = (user: User) => {
  return ["COO", "RECORDS"].includes(businessRole(user.role));
};

@Injectable()
export class SubmissionChecklistsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async batch(tx: Prisma.TransactionClient, user: User, id: string) {
    const current = await requireCurrentUser(tx, user, "PAYMENT_READ");

    if (businessRole(current.role) === "CUSTOMER") {
      throw new ForbiddenException(
        "Submission checklists are for authorized staff.",
      );
    }

    if (
      !(await tx.batch.findFirst({
        where: { id, ...batchScope(current) },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Batch not found.");
    }

    return current;
  }

  async checklist(
    user: User,
    query: ChecklistQuery,
  ): Promise<SubmissionChecklist> {
    return this.db.$transaction(
      async (tx) => {
        const current = await this.batch(tx, user, query.batchId);

        return queryChecklist(tx, current, query);
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async save(
    user: User,
    id: string,
    version: number,
    input: EvidenceRequirementInput,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

      const current = await this.batch(tx, user, input.batchId);

      if (!canManage(current)) {
        throw new ForbiddenException(
          "Records or COO maintains expected submissions.",
        );
      }

      const before = await tx.evidenceRequirement.findUnique({ where: { id } });

      if (before && before.batchId !== input.batchId) {
        throw new NotFoundException("Requirement not found.");
      }

      if (version !== (before?.version ?? 0)) {
        throw new ConflictException(
          "This checklist changed. Reload it before saving.",
        );
      }

      if (
        before &&
        (before.kind !== input.kind ||
          before.periodStart.getTime() !==
            new Date(input.periodStart).getTime() ||
          before.periodEnd.getTime() !== new Date(input.periodEnd).getTime() ||
          before.clientId !== input.clientId)
      ) {
        throw new BadRequestException(
          "Keep the original member, type and reporting period. Cancel with a reason and declare a corrected requirement.",
        );
      }

      if (!before && input.cancelled) {
        throw new BadRequestException("New requirements must be active.");
      }

      if (
        !input.cancelled &&
        input.clientId &&
        !(await tx.client.findFirst({
          where: {
            id: input.clientId,
            batchId: input.batchId,
            retentionErasedAt: null,
          },
        }))
      ) {
        throw new BadRequestException("Choose a member in this batch.");
      }

      if (
        !input.cancelled &&
        input.paymentId &&
        !(await tx.payment.findFirst({
          where: {
            id: input.paymentId,
            batchId: input.batchId,
            clientId: input.clientId!,
            paymentDate: {
              gte: new Date(input.periodStart),
              lte: new Date(input.periodEnd),
            },
            status: { not: "REJECTED" },
          },
        }))
      ) {
        throw new BadRequestException(
          "Choose this member's payment in the required period.",
        );
      }

      if (
        !input.cancelled &&
        input.historyId &&
        !(await tx.gcashHistory.findFirst({
          where: {
            id: input.historyId,
            batchId: input.batchId,
            archivedAt: null,
            periodStart: { lte: new Date(input.periodStart) },
            periodEnd: { gte: new Date(input.periodEnd) },
          },
        }))
      ) {
        throw new BadRequestException(
          "Choose a statement covering this batch and reporting period.",
        );
      }

      if (
        !input.cancelled &&
        input.paymentId &&
        (await tx.evidenceRequirement.findFirst({
          where: {
            id: { not: id },
            paymentId: input.paymentId,
            cancelled: false,
          },
          select: { id: true },
        }))
      ) {
        throw new ConflictException(
          "This receipt already fulfills another active expectation. Review the duplicate requirement before linking it again.",
        );
      }

      const data = {
        ...input,
        ...(input.cancelled && before
          ? { paymentId: before.paymentId, historyId: before.historyId }
          : {}),
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
      };

      const after = before
        ? await tx.evidenceRequirement.update({
            where: { id, version },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.evidenceRequirement.create({ data: { id, ...data } });

      const snapshot = (value: unknown): Prisma.InputJsonValue => {
        return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
      };

      await tx.auditEntry.create({
        data: {
          actorId: current.id,
          entity: "evidence_requirement",
          recordId: id,
          action: before
            ? "evidence_requirement.updated"
            : "evidence_requirement.created",
          ...(before ? { before: snapshot(before) } : {}),
          after: snapshot(after),
        },
      });

      await tx.changeEvent.create({
        data: { entity: "batch", recordId: input.batchId },
      });

      return { id, version: after.version };
    });
  }
}
