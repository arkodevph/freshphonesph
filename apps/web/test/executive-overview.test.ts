import assert from "node:assert/strict";
import test from "node:test";
import type { ExecutiveChartData } from "@freshphones/contracts";
import { collectionLines } from "../lib/executive-overview";

function chart(amounts: [string, string][]): ExecutiveChartData {
  return {
    dateFrom: "2026-01-01",
    dateTo: "2026-03-31",
    months: amounts.map(([verifiedAmount, pendingAmount], index) => {
      return {
        month: `2026-0${index + 1}`,
        verifiedAmount,
        pendingAmount,
        verifiedPayments: 0,
        pendingPayments: 0,
        clarificationPayments: 0,
        rejectedPayments: 0,
      };
    }),
    verifiedAmount: "0",
    pendingAmount: "0",
    paymentCounts: { verified: 0, pending: 0, clarification: 0, rejected: 0 },
    batches: { total: 0, items: [] },
  };
}

test("signed Finance corrections extend below the shared zero baseline", () => {
  const { bars, zero } = collectionLines(
    chart([
      ["100", "50"],
      ["-25", "0"],
    ]),
  );

  assert.ok(bars[0].verified.y < zero);

  assert.equal(bars[1].verified.y, zero);

  assert.ok(bars[1].verified.height > 0);

  assert.equal(bars[0].pending.height, bars[0].verified.height / 2);

  assert.ok(bars[1].verified.y + bars[1].verified.height <= 154.001);
});

test("empty reports have no invented bar height or invalid coordinates", () => {
  for (const input of [chart([]), chart([["0", "0"]])]) {
    const result = collectionLines(input);

    assert.equal(result.empty, true);

    assert.ok(Number.isFinite(result.zero));

    assert.ok(
      result.bars.every((bar) => {
        return bar.verified.height === 0 && bar.pending.height === 0;
      }),
    );
  }
});

test("fractional peso amounts retain their relative sizes", () => {
  const { bars, empty } = collectionLines(chart([["0.01", "0.005"]]));

  assert.equal(empty, false);

  assert.equal(bars[0].pending.height, bars[0].verified.height / 2);
});

test("sparse collection charts use rounded ticks and zero months stay empty", () => {
  const result = collectionLines(
    chart([
      ["0", "0"],
      ["78750", "12600"],
    ]),
  );

  assert.deepEqual(
    result.ticks.map(({ amount }) => {
      return amount;
    }),
    [80000, 60000, 40000, 20000, 0],
  );

  assert.equal(result.bars[0].verified.height, 0);

  assert.equal(result.bars[0].pending.height, 0);

  assert.ok(result.barWidth > 14);
});

test("twelve-month columns fit their own month group without touching", () => {
  const result = collectionLines(
    chart(
      Array.from({ length: 12 }, () => {
        return ["100", "20"];
      }),
    ),
  );

  assert.ok(result.barWidth > 0);

  assert.ok(result.barWidth * 2 + 4 < 476 / 12);
});
