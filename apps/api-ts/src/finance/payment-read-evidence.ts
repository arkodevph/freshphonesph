import { Prisma } from "../generated/prisma/client";

type PaymentEvidenceInput = {
  id: string;
  clientId: string;
  batchId: string;
  referenceNumber: string | null;
  paymentDate: Date;
};

export type PaymentReadEvidence = {
  duplicateReference: boolean;
  submissionComplete: boolean | null;
};

/** Enrich only the authorized page; duplicate evidence still spans its clients' full histories. */
export async function paymentReadEvidence(
  tx: Prisma.TransactionClient,
  payments: PaymentEvidenceInput[],
  customer = false,
) {
  if (!payments.length) {
    return new Map<string, PaymentReadEvidence>();
  }

  const input = payments.map((payment) => {
    return {
      id: payment.id,
      clientId: payment.clientId,
      batchId: payment.batchId,
      referenceNumber: payment.referenceNumber,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
    };
  });

  const rows = await tx.$queryRaw<
    (PaymentReadEvidence & { id: string })[]
  >(Prisma.sql`
    WITH input AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(input)}::jsonb)
        AS r(id uuid, "clientId" uuid, "batchId" uuid, "referenceNumber" text, "paymentDate" date)
    )
    SELECT r.id,
      CASE WHEN r."referenceNumber" IS NULL OR r."referenceNumber" = '' THEN false
        ELSE EXISTS (
          SELECT 1 FROM "Payment" p
          WHERE p."clientId" = r."clientId" AND p.id <> r.id
            AND p."referenceNumber" ILIKE r."referenceNumber"
        ) END AS "duplicateReference",
      ${
        customer
          ? Prisma.sql`NULL::boolean`
          : Prisma.sql`NOT EXISTS (
        SELECT 1 FROM submission_evidence_blockers(r."batchId", r."paymentDate")
      )`
      } AS "submissionComplete"
    FROM input r
  `);

  return new Map(
    rows.map((row) => {
      return [row.id, row];
    }),
  );
}
