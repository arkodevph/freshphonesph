import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  cadenceSchema,
  type PortalApplicationSummary,
  type User,
} from "@freshphones/contracts";
import { z } from "zod";
import type { Database } from "../database";
import { Prisma } from "../generated/prisma/client";

const membershipPlanSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  cadence: cadenceSchema,
});

const date = (value: Date) => {
  return value.toISOString().slice(0, 10);
};

export async function portalApplicationSummary(
  db: Database,
  user: User,
): Promise<PortalApplicationSummary> {
  if (user.role !== "CUSTOMER" || !user.clientId) {
    throw new ForbiddenException("A customer membership is required.");
  }

  const membershipId = user.clientId;

  return db.$transaction(
    async (tx) => {
      const membership = await tx.client.findFirst({
        where: {
          id: membershipId,
          retentionErasedAt: null,
          member: { account: { id: user.id, active: true, role: "CUSTOMER" } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          joinedAt: true,
          status: true,
          replacementCompletedAt: true,
          unitModel: true,
          membershipPlan: true,
          batch: {
            select: {
              id: true,
              code: true,
              model: true,
              status: true,
              startDate: true,
              endDate: true,
              cadence: true,
            },
          },
          schedule: {
            select: { dueDate: true, expectedAmount: true },
            orderBy: [{ dueDate: "asc" }, { sequenceNo: "asc" }],
          },
        },
      });

      if (!membership) {
        throw new NotFoundException(
          "Membership not found. Choose one of your batches.",
        );
      }

      const individual = membership.membershipPlan !== null;

      const individualPlan = individual
        ? membershipPlanSchema.safeParse(membership.membershipPlan)
        : null;

      if (individualPlan && !individualPlan.success) {
        throw new ConflictException(
          "The recorded membership plan needs review. Please contact support.",
        );
      }

      const plan = individualPlan?.success ? individualPlan.data : null;

      const firstInstallment = membership.schedule[0];

      const lastInstallment = membership.schedule.at(-1);

      return {
        title: "Application summary",
        generatedAt: new Date().toISOString(),
        notice:
          "A summary of your current membership record. Your application and signed agreement are handled separately.",
        membership: {
          id: membership.id,
          name: membership.name,
          email: membership.email,
          phone: membership.phone,
          joinedAt: membership.joinedAt ? date(membership.joinedAt) : null,
          status: membership.status,
          replacementCompletedAt:
            membership.replacementCompletedAt?.toISOString() ?? null,
          unitModel: membership.unitModel,
        },
        batch: {
          id: membership.batch.id,
          code: membership.batch.code,
          model: membership.batch.model,
          status: membership.batch.status,
          startDate: date(membership.batch.startDate),
          endDate: date(membership.batch.endDate),
        },
        plan: {
          individual,
          startDate: plan?.startDate ?? date(membership.batch.startDate),
          endDate: plan?.endDate ?? date(membership.batch.endDate),
          cadence: plan?.cadence ?? membership.batch.cadence,
          issuedSchedule:
            firstInstallment && lastInstallment
              ? {
                  installmentCount: membership.schedule.length,
                  firstDueDate: date(firstInstallment.dueDate),
                  lastDueDate: date(lastInstallment.dueDate),
                  originalTotal: membership.schedule
                    .reduce((sum, item) => {
                      return sum.add(item.expectedAmount);
                    }, new Prisma.Decimal(0))
                    .toFixed(2),
                }
              : null,
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
