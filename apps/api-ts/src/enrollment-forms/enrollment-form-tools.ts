import {
  businessRole,
  enrollmentAnswersSchema,
  enrollmentFormDefinitionSchema,
  type PublicEnrollmentApplication,
  type User,
} from "@freshphones/contracts";
import { NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";

export const receivingAgentWhere = {
  active: true,
  role: "AGENT",
  retentionErasedAt: null,
  agentProfile: { active: true },
} as const;

export const applicationInclude = {
  assignedAgent: { select: { id: true, name: true } },
  revision: { select: { id: true, number: true, definition: true } },
  enrollmentRequest: { select: { id: true, status: true, clientId: true } },
} as const;

export function applicationScope(
  user: User,
): Prisma.PublicEnrollmentApplicationWhereInput {
  const role = businessRole(user.role);

  if (role === "COO" || role === "SYSTEM_ADMIN") {
    return {};
  }

  if (role === "AGENT") {
    return { assignedAgentId: user.id };
  }

  if (role === "BATCH_MANAGER") {
    return { enrollmentRequest: { batch: { managerId: user.id } } };
  }

  throw new NotFoundException("Enrollment application not found.");
}

export function applicationView(
  row: Prisma.PublicEnrollmentApplicationGetPayload<{
    include: typeof applicationInclude;
  }>,
): PublicEnrollmentApplication {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    version: row.version,
    assignedAgent: row.assignedAgent,
    contact: { name: row.name, email: row.email, phone: row.phone },
    revision: {
      id: row.revision.id,
      number: row.revision.number,
      definition: enrollmentFormDefinitionSchema.parse(row.revision.definition),
    },
    answers: enrollmentAnswersSchema.parse(row.answers),
    enrollmentRequest: row.enrollmentRequest,
    closeReason: row.closeReason,
  };
}

export function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export function canonicalAnswers(value: unknown): string {
  const answers = enrollmentAnswersSchema.parse(value);

  return JSON.stringify(
    Object.entries(answers)
      .sort(([left], [right]) => {
        return left.localeCompare(right);
      })
      .map(([key, answer]) => {
        return [key, Array.isArray(answer) ? [...answer].sort() : answer];
      }),
  );
}

export async function applicationChanged(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string | null,
  action: string,
  evidence: object = {},
) {
  if (actorId) {
    await tx.auditEntry.create({
      data: {
        actorId,
        entity: "public_enrollment_application",
        recordId: id,
        action,
        after: json(evidence),
      },
    });
  }

  await tx.changeEvent.create({
    data: { entity: "public_enrollment_application", recordId: id },
  });
}

export async function notifyReceivingAgent(
  tx: Prisma.TransactionClient,
  application: { id: string; assignedAgentId: string; version: number },
) {
  const notification = await tx.staffNotification.create({
    data: {
      recipientId: application.assignedAgentId,
      eventKey: "public_enrollment.received",
      title: "Membership application awaiting review",
      body: "A membership application is assigned to you. Review it before selecting a batch.",
      link: `/system/enrollments?view=applications&application=${application.id}`,
      dedupeKey: `public-enrollment:${application.id}:${application.version}:${application.assignedAgentId}`,
    },
  });

  await tx.changeEvent.create({
    data: { entity: "notification", recordId: notification.id },
  });
}
