import { randomUUID } from "node:crypto";
import type { Client, Prisma } from "../../src/generated/prisma/client";
import { submissionReady } from "../../src/submission-checklists/evidence";

export async function paymentEvidenceFixture(
  tx: Prisma.TransactionClient,
  size = 20,
) {
  const suffix = randomUUID();

  const user = await tx.user.create({
    data: {
      name: "Synthetic evidence recorder",
      email: `evidence-${suffix}@example.test`,
      passwordHash: "synthetic-not-a-login",
      role: "SYSTEM_ADMIN",
    },
  });

  const batch = await tx.batch.create({
    data: {
      code: `EVIDENCE-${suffix}`,
      model: "Synthetic evidence fixture",
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
    },
  });

  const clients: Client[] = [];

  for (let index = 0; index < 2; index++) {
    const member = await tx.member.create({
      data: { name: "Synthetic member", email: "", phone: "" },
    });

    clients.push(
      await tx.client.create({
        data: {
          memberId: member.id,
          batchId: batch.id,
          name: member.name,
          email: "",
          phone: "",
        },
      }),
    );
  }

  const references = [
    null,
    "",
    "Unique",
    "Case",
    "A_B",
    "P%",
    "ÅB",
    "Quoted'--",
  ];

  const payments = [];

  for (let index = 0; index < size; index++) {
    payments.push(
      await tx.payment.create({
        data: {
          clientId: clients[0].id,
          batchId: batch.id,
          amount: "0.30",
          paymentDate: new Date(index % 2 ? "2049-03-01" : "2049-03-02"),
          method: "GCash",
          referenceNumber:
            index < references.length ? references[index] : `Only-${index}`,
          recordedById: user.id,
        },
      }),
    );
  }

  await tx.payment.createMany({
    data: Array.from({ length: 1000 }, (_, index) => {
      return {
        id: randomUUID(),
        clientId: index === 3 ? clients[1].id : clients[0].id,
        batchId: batch.id,
        amount: "0.30",
        paymentDate: new Date("2040-01-01"),
        method: "GCash",
        referenceNumber:
          ["case", "AxB", "Prefix", "Unique", "ÅB"][index] ??
          `History-${index}`,
        status: "REJECTED" as const,
        recordedById: user.id,
      };
    }),
  });

  await tx.evidenceRequirement.create({
    data: {
      batchId: batch.id,
      clientId: clients[0].id,
      kind: "RECEIPT",
      description: "Synthetic missing receipt",
      reason: "Synthetic missing receipt",
      periodStart: new Date("2049-03-01"),
      periodEnd: new Date("2049-03-01"),
    },
  });

  return payments;
}

/** Original list-view lookups, retained as the behavioral baseline. */
export async function legacyPaymentReadEvidence(
  tx: Prisma.TransactionClient,
  payments: Awaited<ReturnType<typeof paymentEvidenceFixture>>,
  customer = false,
) {
  return new Map(
    await Promise.all(
      payments.map(async (payment) => {
        const submissionComplete = customer
          ? null
          : await submissionReady(tx, payment.batchId, payment.paymentDate);

        const duplicateReference = Boolean(
          payment.referenceNumber &&
          (await tx.payment.findFirst({
            where: {
              clientId: payment.clientId,
              referenceNumber: {
                equals: payment.referenceNumber,
                mode: "insensitive",
              },
              id: { not: payment.id },
            },
            select: { id: true },
          })),
        );

        return [
          payment.id,
          { duplicateReference, submissionComplete },
        ] as const;
      }),
    ),
  );
}
