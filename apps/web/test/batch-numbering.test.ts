import { after, test } from "node:test";
import assert from "node:assert/strict";
import { batchCreateSchema } from "@freshphones/contracts";
import { createBatch } from "../lib/api";

const agentId = "c6816029-d134-48b8-85bd-61699140a917";

const terms = {
  agentId,
  model: "iPhone 16",
  status: "PLANNED",
  startDate: "2026-10-01",
  endDate: "2027-04-01",
  contractPrice: "1200.00",
  installmentCount: 6,
  cadence: "MONTHLY",
};

test("batch creation requires an Agent, rejects client-supplied codes and validates all existing plan rules", () => {
  assert.equal(batchCreateSchema.safeParse(terms).success, true);

  for (const invalid of [
    { ...terms, agentId: "" },
    { ...terms, code: "MANUAL-001" },
    { ...terms, numberSequence: 50 },
    { ...terms, endDate: "2025-01-01" },
    { ...terms, contractPrice: "0.001" },
    { ...terms, installmentCount: undefined },
  ]) {
    assert.equal(batchCreateSchema.safeParse(invalid).success, false);
  }
});

const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

test("the creation form sends only the chosen Agent and terms, then displays the server-assigned code", async () => {
  const calls: { path: string; options?: RequestInit }[] = [];

  globalThis.fetch = async (input, options) => {
    calls.push({ path: new URL(String(input)).pathname, options });

    return Response.json({
      ...terms,
      id: "b8cb5997-3b2e-4673-9f34-de84bc66d1f6",
      code: "AB-027",
      version: 1,
      createdAt: "2026-10-28T00:00:00Z",
      updatedAt: "2026-10-28T00:00:00Z",
      _count: { clients: 0 },
    });
  };

  const result = await createBatch({
    agent_id: agentId,
    unit_model: "iPhone 16",
    status: "forming",
    contract_price: "1200.00",
    num_installments: 6,
    cadence: "monthly",
    start_date: "2026-10-01",
  });

  assert.equal(calls.length, 1);

  assert.equal(calls[0].path, "/api/batches");

  assert.equal(calls[0].options?.method, "POST");

  const body = JSON.parse(String(calls[0].options?.body));

  assert.equal(body.agentId, agentId);

  assert.equal("code" in body, false);

  assert.equal(result.batch_number, "AB-027");
});
