import { after, test } from "node:test";
import assert from "node:assert/strict";
import type { Batch, Client } from "@freshphones/contracts";
import { batchEditInput, clientEditInput, recordChanged, recordDraft } from "../lib/record-edit";
import { updateClientDetails, updateBatchDetails, updateBatchAssignments } from "../lib/api";
import { ApiError } from "../lib/ts-api";

const batch: Batch = { id: "019f807d-e69c-4f9b-8603-662d716741fb", code: "B-LEGACY", model: "iPhone",
  status: "PLANNED", startDate: "2026-09-01", endDate: "2027-03-01", contractPrice: null,
  installmentCount: null, cadence: null, version: 7, createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z", _count: { clients: 0 }, termsLocked: false };
const client: Client = { id: "7e091b36-b584-4b09-a8ca-f2a8eb30cb9a", name: "Sample client", email: "client@example.test",
  phone: "+63 900 000 0001", batchId: batch.id, unitModel: "", status: "ON_HOLD", releaseStatus: "READY", joinedAt: null,
  version: 9, createdAt: batch.createdAt, updatedAt: batch.updatedAt, scheduleIssued: true,
  batch: { id: batch.id, code: batch.code, model: batch.model, startDate: batch.startDate, endDate: batch.endDate }, account: null };

test("editing a legacy client preserves its phone, release state and absent dates/model", () => {
  const draft = recordDraft(client);
  draft.name = "Corrected client";
  assert.deepEqual(clientEditInput(draft), { name: "Corrected client", email: client.email, phone: client.phone,
    batchId: client.batchId, unitModel: "", status: "ON_HOLD", releaseStatus: "READY" });
  assert.equal(client.name, "Sample client");
});
test("editing legacy batch status leaves missing terms absent and keeps its agreed end date", () => {
  const draft = recordDraft(batch);
  draft.status = "ACTIVE";
  assert.deepEqual(batchEditInput(draft), { code: "B-LEGACY", model: "iPhone", status: "ACTIVE",
    startDate: "2026-09-01", endDate: "2027-03-01" });
});
test("issuing a schedule invalidates an open editor even when the record version is unchanged", () => {
  assert.equal(recordChanged(batch, { ...batch, termsLocked: true }), true);
  assert.equal(recordChanged({ ...client, scheduleIssued: false }, client), true);
  assert.equal(recordChanged(batch, { ...batch, version: batch.version + 1 }), true);
  assert.equal(recordChanged(batch, { ...batch }), false);
});
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
test("record writes send the captured version directly without fetching a replacement version", async () => {
  const requests: { path: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ path: new URL(String(input)).pathname, options }); return Response.json({}); };
  await updateClientDetails(client.id, client.version, clientEditInput(recordDraft(client)));
  await updateBatchDetails(batch.id, batch.version, batchEditInput(recordDraft(batch)));
  assert.deepEqual(requests.map((request) => request.path), [`/api/clients/${client.id}`, `/api/batches/${batch.id}`]);
  assert.deepEqual(requests.map((request) => JSON.parse(String(request.options?.body)).version), [9, 7]);
  assert.ok(requests.every((request) => request.options?.method === "PATCH" && request.options.credentials === "include"));
});
test("a conflicting record write reaches the editor without silently retrying or overwriting", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ message: "Record changed" }, { status: 409 }); };
  await assert.rejects(updateClientDetails(client.id, 9, clientEditInput(recordDraft(client))),
    (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.equal(requests, 1);
});
test("assignment saves preserve the captured version and deliberate unassignment, with no conflict retry", async () => {
  const requests: { path: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => { requests.push({ path: new URL(String(input)).pathname, options });
    return Response.json({ message: "Batch changed" }, { status: 409 }); };
  await assert.rejects(updateBatchAssignments(batch.id, { version: 7, handlerId: null, agentId: client.id }),
    (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, `/api/batches/${batch.id}/assignments`);
  assert.deepEqual(JSON.parse(String(requests[0].options?.body)), { version: 7, handlerId: null, agentId: client.id });
});
