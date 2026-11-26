import "reflect-metadata";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { Database } from "../src/database";
import { paymentReadEvidence } from "../src/finance/payment-read-evidence";
import {
  legacyPaymentReadEvidence,
  paymentEvidenceFixture,
} from "./helpers/payment-read-evidence";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Dedicated TEST_DATABASE_URL ending in _test required.");
}

const db = new Database({
  NODE_ENV: "test",
  DATABASE_URL: url,
  HOST: "127.0.0.1",
  PORT: 4100,
  WEB_ORIGIN: "http://localhost:3100",
  LOCAL_DEMO_AUTH: false,
  EMAIL_FROM: "synthetic@example.test",
  CUSTOMER_REMINDER_DAYS_BEFORE: "",
  PRIVATE_STORAGE_PROVIDER: "local",
  PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
});

after(async () => {
  await db.$disconnect();
});

const rollback = new Error("rollback synthetic fixtures");

test("page evidence preserves Prisma matching and whole-history checklist behavior", async () => {
  await assert.rejects(
    db.$transaction(
      async (tx) => {
        const payments = await paymentEvidenceFixture(tx);

        for (const customer of [false, true]) {
          const before = await legacyPaymentReadEvidence(
            tx,
            payments,
            customer,
          );

          const after = await paymentReadEvidence(tx, payments, customer);

          assert.equal(after.size, payments.length);

          for (const payment of payments) {
            const expected = before.get(payment.id)!;

            const actual = after.get(payment.id)!;

            assert.equal(
              actual.duplicateReference,
              expected.duplicateReference,
              String(payment.referenceNumber),
            );

            assert.equal(
              actual.submissionComplete,
              expected.submissionComplete,
            );
          }

          assert.equal(after.get(payments[0].id)!.duplicateReference, false);

          assert.equal(after.get(payments[1].id)!.duplicateReference, false);

          assert.equal(after.get(payments[2].id)!.duplicateReference, false);

          for (const index of [3, 4, 5, 6]) {
            assert.equal(
              after.get(payments[index].id)!.duplicateReference,
              true,
            );
          }

          assert.equal(
            after.get(payments[0].id)!.submissionComplete,
            customer ? null : true,
          );

          assert.equal(
            after.get(payments[1].id)!.submissionComplete,
            customer ? null : false,
          );
        }

        assert.equal((await paymentReadEvidence(tx, [])).size, 0);

        // Reserved order and subset differ from the page used above.
        const heldOut = [...payments].reverse().filter((_, index) => {
          return index % 3 === 0;
        });

        const actual = await paymentReadEvidence(tx, heldOut);

        const expected = await legacyPaymentReadEvidence(tx, heldOut);

        for (const payment of heldOut) {
          assert.equal(
            actual.get(payment.id)!.duplicateReference,
            expected.get(payment.id)!.duplicateReference,
          );

          assert.equal(
            actual.get(payment.id)!.submissionComplete,
            expected.get(payment.id)!.submissionComplete,
          );
        }

        throw rollback;
      },
      { timeout: 30_000 },
    ),
    (error) => {
      return error === rollback;
    },
  );
});
