import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentStatusRows, reportHighlights } from "../lib/report-summary";
import type { PaymentReport } from "@freshphones/contracts";

const payment = (): { kind: "payments"; data: PaymentReport } => {
  return {
    kind: "payments",
    data: {
      total: 10,
      verifiedPayments: 4,
      verifiedAmount: "950.25",
      originalVerifiedAmount: "1000.25",
      adjustmentAmount: "-50.00",
      pendingVerification: 3,
      pendingAmount: "500.00",
      needsClarification: 2,
      rejectedPayments: 1,
    },
  };
};

test("the overview uses net verified credit without adding pending claims or applying Finance corrections twice", () => {
  const cards = reportHighlights(payment());

  assert.equal(cards[0].value, "₱950.25");

  assert.equal(cards[1].value, "₱500.00");

  assert.match(cards[1].note, /excluded from balances/);
});

test("payment status categories account for every recorded status without double-counting corrections", () => {
  const rows = paymentStatusRows(payment());

  assert.equal(
    rows.reduce((total, row) => {
      return total + row.value;
    }, 0),
    10,
  );

  assert.equal(rows.length, 4);
});

test("an old saved report distinguishes an uncaptured rejected count from an observed zero", () => {
  const report = payment();

  report.data.rejectedPayments = 0;

  assert.equal(reportHighlights(report)[3].value, 0);

  Reflect.deleteProperty(report.data, "rejectedPayments");

  assert.equal(reportHighlights(report)[3].value, "Not captured");

  assert.equal(paymentStatusRows(report).length, 3);
});

test("zero activity preserves an empty chart with no invented nonzero categories", () => {
  const report = payment();

  report.data.verifiedPayments = 0;

  report.data.pendingVerification = 0;

  report.data.needsClarification = 0;

  report.data.rejectedPayments = 0;

  assert.ok(
    paymentStatusRows(report).every((row) => {
      return row.value === 0;
    }),
  );
});
