import { after, test } from "node:test";
import assert from "node:assert/strict";
import { previewInstallments, type Batch } from "@freshphones/contracts";
import { createBatch } from "../lib/api";
import {
  batchSchedulePlan,
  defaultBatchForm,
  nextInstallmentDate,
} from "../lib/batch-schedule";
import { batchEditInput, recordDraft } from "../lib/record-edit";

const fetchBefore = globalThis.fetch;

const calls: Record<string, unknown>[] = [];

const id = "7e091b36-b584-4b09-a8ca-f2a8eb30cb9a";

const form = {
  agent_id: id,
  unit_model: "Synthetic phone",
  status: "forming",
  contract_price: "100.00",
  num_installments: 3,
  cadence: "monthly",
  start_date: "2026-01-01",
  first_due_date: "2026-01-31",
  month_end: true,
};

globalThis.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body));

  calls.push(body);

  return new Response(
    JSON.stringify({
      id,
      ...body,
      code: "AB-001",
      _count: { clients: 0 },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 1,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
};

after(() => {
  globalThis.fetch = fetchBefore;
});

test("calendar batch creation sends the manually chosen first date and the preview's exact final date", async () => {
  calls.length = 0;

  const preview = previewInstallments(batchSchedulePlan(form));

  const batch = await createBatch(form);

  assert.equal(calls.length, 1);

  assert.equal(calls[0].firstDueDate, "2026-01-31");

  assert.equal(calls[0].monthEnd, true);

  assert.equal(calls[0].endDate, preview.at(-1)!.dueDate);

  assert.equal(calls[0].endDate, "2026-03-31");

  assert.equal(batch.first_due_date, "2026-01-31");

  assert.equal(batch.month_end, true);
});

test("older callers without calendar fields retain fixed-day plans", async () => {
  calls.length = 0;

  const { first_due_date, month_end, ...legacy } = form;

  await createBatch(legacy);

  assert.equal(calls[0].endDate, "2026-04-01");

  assert.equal("firstDueDate" in calls[0], false);

  assert.equal("monthEnd" in calls[0], false);
});

test("invalid calendar selections are rejected before a network write", async () => {
  calls.length = 0;

  for (const changes of [
    { first_due_date: "" },
    { first_due_date: "2026-01-15", month_end: true },
    { cadence: "semimonthly", first_due_date: "2026-01-14", month_end: false },
    { first_due_date: "2025-12-31" },
  ]) {
    await assert.rejects(createBatch({ ...form, ...changes }));
  }

  assert.equal(calls.length, 0);
});

test("calendar shortcuts cover start-of-month, mid-month, month end and supported year boundaries", () => {
  assert.equal(nextInstallmentDate("2026-12-31", 1), "2027-01-01");

  assert.equal(nextInstallmentDate("2026-12-31", 15), "2027-01-15");

  assert.equal(nextInstallmentDate("2026-02-16", "bi"), "2026-02-28");

  assert.equal(nextInstallmentDate("2028-02-28", "bi"), "2028-02-29");

  assert.equal(nextInstallmentDate("2026-02-15", "bi"), "2026-02-15");

  assert.equal(nextInstallmentDate("9999-12-31", 1), "");

  assert.equal(nextInstallmentDate("invalid", "end"), "");

  const defaults = defaultBatchForm();

  assert.equal(defaults.month_end, true);

  assert.ok(defaults.first_due_date >= defaults.start_date);
});

test("editing status retains the original calendar policy and first due date", () => {
  const record: Batch = {
    id,
    code: "AB-001",
    model: "Test phone",
    status: "PLANNED",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    contractPrice: "100.00",
    installmentCount: 3,
    cadence: "MONTHLY",
    firstDueDate: "2026-01-31",
    monthEnd: true,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    _count: { clients: 0 },
  };

  const draft = recordDraft(record);

  draft.status = "ACTIVE";

  const edited = batchEditInput(draft);

  assert.equal(edited.firstDueDate, record.firstDueDate);

  assert.equal(edited.monthEnd, true);

  assert.equal(edited.status, "ACTIVE");
});
