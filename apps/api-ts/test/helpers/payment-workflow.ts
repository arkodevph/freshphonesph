import { randomUUID } from "node:crypto";
import type { Database } from "../../src/database";

/** Synthetic, pre-reviewed receipt fixture for tests of downstream Finance behavior. */
export async function prepareFinanceReview(db: Database, id: string) {
  return db.$transaction(async (tx) => {
    // Keep parallel downstream fixtures on one batch from invalidating each other.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id },
      include: { batch: true },
    });

    const eligible = async (
      role: "RECORDS" | "BATCH_MANAGER",
      preferred?: string | null,
    ) => {
      const where = { active: true, role, id: { not: payment.recordedById } };

      const existing =
        (preferred
          ? await tx.user.findFirst({
              where: { ...where, AND: [{ id: preferred }] },
            })
          : null) ?? (await tx.user.findFirst({ where }));

      if (existing) {
        return existing;
      }

      const template = await tx.user.findFirstOrThrow();

      return tx.user.create({
        data: {
          name: `Synthetic ${role}`,
          role,
          email: `workflow-${randomUUID()}@example.test`,
          passwordHash: template.passwordHash,
        },
      });
    };

    const records = await eligible("RECORDS");

    const manager = await eligible("BATCH_MANAGER", payment.batch.managerId);

    if (payment.batch.managerId !== manager.id) {
      await tx.batch.update({
        where: { id: payment.batchId },
        data: { managerId: manager.id, version: { increment: 1 } },
      });
    }

    if (!payment.proofFileId) {
      const file = await tx.storedFile.create({
        data: {
          storageKey: `synthetic-${randomUUID()}`,
          originalName: "synthetic-receipt.png",
          mimeType: "image/png",
          size: 8,
          uploadedById: payment.recordedById,
        },
      });

      await tx.payment.update({
        where: { id },
        data: { proofFileId: file.id },
      });
    }

    const batch = await tx.batch.findUniqueOrThrow({
      where: { id: payment.batchId },
    });

    // These tests start with already reviewed synthetic evidence. Version progression
    // and review authorization are exercised through HTTP in payment-workflow.integration.test.ts.
    await tx.paymentOperationalReview.createMany({
      data: [
        { stage: "RECORDS", reviewerId: records.id },
        { stage: "MANAGER", reviewerId: manager.id },
      ].map((review) => {
        return {
          ...review,
          paymentId: id,
          decision: "APPROVED",
          notes: "Synthetic pre-reviewed receipt fixture.",
          evidenceVersion: payment.evidenceVersion,
          paymentVersion: payment.version,
          batchVersion: batch.version,
        };
      }),
      skipDuplicates: true,
    });

    return tx.payment.findUniqueOrThrow({ where: { id } });
  });
}
