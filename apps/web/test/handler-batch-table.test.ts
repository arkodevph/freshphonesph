import assert from "node:assert/strict";
import { test } from "node:test";
import type { Batch } from "../lib/api";
import {
  batchCadenceLabel,
  batchText,
  newestBatchSort,
  nextBatchSort,
} from "../lib/handler-batch-table";

test("column selection starts ascending and only the active column reverses direction", () => {
  const price = nextBatchSort(newestBatchSort, "contractPrice");

  assert.deepEqual(price, { key: "contractPrice", direction: "asc" });

  assert.deepEqual(nextBatchSort(price, "contractPrice"), {
    key: "contractPrice",
    direction: "desc",
  });

  assert.deepEqual(nextBatchSort(price, "model"), {
    key: "model",
    direction: "asc",
  });
});

test("missing text is explicit and a present zero is preserved", () => {
  for (const value of [null, undefined, "", "   "]) {
    assert.equal(batchText(value), "—");
  }

  assert.equal(batchText("0"), "0");
});

test("single-line cadence keeps legacy and calendar meanings distinct", () => {
  const batch = { cadence: "monthly", first_due_date: null } as Batch;

  assert.equal(batchCadenceLabel(batch), "Every 30 days (existing plan)");

  batch.first_due_date = "2049-01-15";

  assert.equal(batchCadenceLabel(batch), "Monthly");

  batch.cadence = "semimonthly";

  assert.equal(batchCadenceLabel(batch), "Bi-monthly");

  batch.first_due_date = null;

  assert.equal(batchCadenceLabel(batch), "Every 15 days (existing plan)");
});
