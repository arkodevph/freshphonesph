import "dotenv/config";
import { createHash } from "node:crypto";
import { effectivePermissions } from "@freshphones/contracts";
import { readConfig } from "../src/config";
import { Database } from "../src/database";
import type { Prisma } from "../src/generated/prisma/client";
import { generateSchedule } from "../src/records/schedule";

const day = 86_400_000;

function identity(key: string) {
  const hex = createHash("sha256")
    .update(`freshphones-report-preview:${key}`)
    .digest("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const config = readConfig();

  const url = new URL(config.DATABASE_URL);

  if (
    config.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.pathname.endsWith("_preview")
  ) {
    throw new Error(
      "Report sample data requires a local development database ending in _preview.",
    );
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (name: string) => {
    return parts.find((item) => {
      return item.type === name;
    })!.value;
  };

  const dateTo = `${part("year")}-${part("month")}-${part("day")}`;

  const dateFrom = `${dateTo.slice(0, 7)}-01`;

  const start = Date.parse(`${dateFrom}T00:00:00Z`);

  const days =
    Math.round((Date.parse(`${dateTo}T00:00:00Z`) - start) / day) + 1;

  const previousStart = start - days * day;

  const stamp = dateTo.replaceAll("-", "");

  const prefix = `DEMO-REPORTS-${stamp}`;

  const db = new Database(config);

  try {
    const admin = await db.user.findUniqueOrThrow({
      where: { email: "system_admin@demo.freshphones.test" },
    });

    const handler = await db.user.findUniqueOrThrow({
      where: { email: "core_handler@demo.freshphones.test" },
    });

    const finance = await db.user.findUniqueOrThrow({
      where: { email: "finance_officer@demo.freshphones.test" },
    });

    if (
      !admin.active ||
      !effectivePermissions(admin).includes("BATCH_CREATE") ||
      !effectivePermissions(admin).includes("CLIENT_MANAGE") ||
      !handler.active ||
      !finance.active ||
      !effectivePermissions(handler).includes("PAYMENT_RECORD") ||
      finance.role !== "FINANCE_OFFICER" ||
      !effectivePermissions(finance).includes("PAYMENT_VERIFY")
    ) {
      throw new Error(
        "Active demo administrator, payment recorder and Finance verifier are required.",
      );
    }

    const created = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740106)`;

        const counts = { batches: 0, members: 0, payments: 0 };

        const plans = [
          { model: "iPhone 13", price: "36000.00", installment: 3000 },
          { model: "iPhone 14", price: "42000.00", installment: 3500 },
          { model: "iPhone 15", price: "48000.00", installment: 4000 },
        ];

        const names = [
          "Ana Reyes",
          "Miguel Santos",
          "Bea Cruz",
          "Carlo Ramos",
          "Dani Garcia",
          "Paolo Mendoza",
        ];

        const planStart = new Date(start);

        planStart.setUTCMonth(planStart.getUTCMonth() - 1);

        for (const [index, plan] of plans.entries()) {
          const beforeCount = counts.batches + counts.members + counts.payments;

          const code = `${prefix}-${index + 1}`;

          const batchId = identity(code);

          if (!(await tx.batch.findUnique({ where: { id: batchId } }))) {
            const schedule = generateSchedule({
              contractPrice: plan.price,
              installmentCount: 12,
              cadence: "MONTHLY",
              startDate: planStart,
            });

            const batch = await tx.batch.create({
              data: {
                id: batchId,
                code,
                model: plan.model,
                status: "ACTIVE",
                startDate: planStart,
                endDate: schedule[schedule.length - 1].dueDate,
                contractPrice: plan.price,
                installmentCount: 12,
                cadence: "MONTHLY",
                handlerId: handler.id,
              },
            });

            await tx.auditEntry.create({
              data: {
                actorId: admin.id,
                action: "batch.created",
                entity: "batch",
                recordId: batchId,
                after: json({ ...batch, sample: true }),
              },
            });

            counts.batches++;
          }

          for (const [memberIndex, name] of names.entries()) {
            const key = `${code}-MEMBER-${memberIndex + 1}`;

            const clientId = identity(key);

            if (!(await tx.client.findUnique({ where: { id: clientId } }))) {
              const contact = {
                name: `Demo ${name} ${index + 1}`,
                email: `reports-${stamp}-${index + 1}-${memberIndex + 1}@demo.freshphones.test`,
                phone: "",
              };

              const member = await tx.member.create({
                data: { id: identity(`${key}-PERSON`), ...contact },
              });

              const schedule = generateSchedule({
                contractPrice: plan.price,
                installmentCount: 12,
                cadence: "MONTHLY",
                startDate: planStart,
              });

              const client = await tx.client.create({
                data: {
                  id: clientId,
                  memberId: member.id,
                  batchId,
                  ...contact,
                  joinedAt: planStart,
                  unitModel: plan.model,
                  schedule: { create: schedule },
                },
              });

              await tx.auditEntry.create({
                data: {
                  actorId: admin.id,
                  action: "client.created",
                  entity: "client",
                  recordId: clientId,
                  after: json({ ...client, sample: true }),
                },
              });

              await tx.auditEntry.create({
                data: {
                  actorId: admin.id,
                  action: "schedule.generated",
                  entity: "client",
                  recordId: clientId,
                  after: json({ items: schedule, sample: true }),
                },
              });

              counts.members++;
            }

            for (const period of ["previous", "current"] as const) {
              const paymentDate = new Date(
                (period === "current" ? start : previousStart) +
                  (memberIndex % days) * day,
              );

              for (const target of ["VERIFIED", "PENDING"] as const) {
                const paymentKey = `${key}-${period}-${target}`;

                const id = identity(paymentKey);

                if (await tx.payment.findUnique({ where: { id } })) {
                  continue;
                }

                const amount =
                  target === "VERIFIED"
                    ? plan.installment * (period === "current" ? 1.25 : 1)
                    : period === "current"
                      ? 700
                      : 1000;

                const payment = await tx.payment.create({
                  data: {
                    id,
                    clientId,
                    batchId,
                    amount: amount.toFixed(2),
                    paymentDate,
                    method: "GCash",
                    referenceNumber: `DEMO-${stamp}-${index + 1}-${memberIndex + 1}-${period}-${target}`,
                    notes:
                      "Fictional local-preview report sample; no actual payment or transfer.",
                    recordedById: handler.id,
                    createdAt: paymentDate,
                  },
                });

                await tx.auditEntry.create({
                  data: {
                    actorId: handler.id,
                    action: "payment.recorded",
                    entity: "payment",
                    recordId: id,
                    after: json(payment),
                    createdAt: paymentDate,
                  },
                });

                if (target === "VERIFIED") {
                  const verifiedAt = new Date(
                    paymentDate.getTime() + 3_600_000,
                  );

                  const verified = await tx.payment.update({
                    where: { id },
                    data: {
                      status: "VERIFIED",
                      verifierId: finance.id,
                      verifiedAt,
                      version: { increment: 1 },
                      verificationNotes:
                        "Finance-attributed fictional preview seed; no real transaction.",
                    },
                  });

                  await tx.auditEntry.create({
                    data: {
                      actorId: finance.id,
                      action: "payment.verified",
                      entity: "payment",
                      recordId: id,
                      before: json(payment),
                      after: json(verified),
                      createdAt: verifiedAt,
                    },
                  });
                }

                await tx.changeEvent.create({
                  data: { entity: "payment", recordId: id },
                });

                counts.payments++;
              }
            }
          }

          if (counts.batches + counts.members + counts.payments > beforeCount) {
            await tx.changeEvent.create({
              data: { entity: "batch", recordId: batchId },
            });
          }
        }

        return counts;
      },
      { timeout: 60_000 },
    );

    console.log(
      JSON.stringify({
        prefix,
        currentPeriod: { dateFrom, dateTo },
        previousPeriod: {
          dateFrom: new Date(previousStart).toISOString().slice(0, 10),
          dateTo: new Date(start - day).toISOString().slice(0, 10),
        },
        created,
        expectedSampleTotals: {
          currentVerified: "78750.00",
          previousVerified: "63000.00",
          currentPending: "12600.00",
          previousPending: "18000.00",
          verifiedChange: "+25%",
          pendingChange: "-30%",
        },
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Preview report seeding failed.",
  );

  process.exitCode = 1;
});
