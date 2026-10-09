import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;

before(() => {
  process.env.NEXT_PUBLIC_API_BACKEND = "typescript";
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";
});

after(() => { globalThis.fetch = originalFetch; });

test("portal documents and support replies retain their API routes and payloads", async () => {
  const requests: { path: string; method: string; body: unknown }[] = [];
  globalThis.fetch = async (input, options) => {
    requests.push({
      path: new URL(String(input)).pathname,
      method: options?.method ?? "GET",
      body: typeof options?.body === "string" ? JSON.parse(options.body) : options?.body,
    });
    return Response.json({});
  };
  const api = await import("../lib/api");
  await api.getCustomerDocuments();
  await api.getCustomerDocuments("client-id");
  await api.getSupportCaseDetail("case-id");
  await api.getSupportCaseDetail("case-id", true);
  await api.replySupportCase("case-id", "Here is the requested detail.");
  await api.replySupportCase("case-id", "Please send a clearer photo.", true, true);
  await api.reviewCustomerDocument("document-id", "NEEDS_CLARIFICATION", 3, "Send a clearer photo.");
  assert.deepEqual(requests, [
    { path: "/api/portal/documents", method: "GET", body: undefined },
    { path: "/api/clients/client-id/documents", method: "GET", body: undefined },
    { path: "/api/portal/support/case-id", method: "GET", body: undefined },
    { path: "/api/support/cases/case-id", method: "GET", body: undefined },
    { path: "/api/portal/support/case-id/replies", method: "POST", body: { body: "Here is the requested detail." } },
    { path: "/api/support/cases/case-id/replies", method: "POST", body: { body: "Please send a clearer photo.", needsReply: true } },
    { path: "/api/documents/document-id/review", method: "POST", body: { status: "NEEDS_CLARIFICATION", version: 3, clarification: "Send a clearer photo." } },
  ]);
});

test("portal payment records preserve pagination, receipt fields, and verifier UUIDs", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/auth/me") return Response.json({ role: "CUSTOMER", clientId: "client-id" });
    if (url.pathname === "/api/payments") {
      assert.equal(url.searchParams.get("page"), "2");
      assert.equal(url.searchParams.get("status"), "VERIFIED");
      return Response.json({ total: 41, page: 2, pageSize: 20, items: [{
        id: "payment-id", clientId: "client-id", batchId: "batch-id",
        client: { name: "Customer", batch: { code: "FP-01" } }, amount: "100.00",
        paymentDate: "2026-10-06", method: "GCash", referenceNumber: "REF-1",
        receiptTime: "12:30 PM", receiptName: "Customer", receiptPhone: "09123456789",
        status: "VERIFIED", verifier: { id: "verifier-id", name: "Finance" },
        recordedBy: { name: "Records" }, version: 2,
      }] });
    }
    return Response.json({});
  };
  const { getPortalRecords } = await import("../lib/api");
  const records = await getPortalRecords(2);
  assert.equal(records.payments.next, "3");
  assert.equal(records.payments.results[0].receipt_time, "12:30 PM");
  assert.equal(records.payments.results[0].verified_by, "verifier-id");
});
