import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  gcashHistoryReviewSchema,
  gcashHistoryUploadSchema,
  rolePermissions,
} from "@freshphones/contracts";
import {
  gcashPdfError,
  uploadGcashHistory,
  reviewGcashHistory,
  listGcashHistories,
} from "../lib/gcash-history";
import { canOpenWorkspace } from "../lib/workspace-access";

const original = globalThis.fetch;

after(() => {
  globalThis.fetch = original;
});

const input = {
  batchId: "fbe225ba-58e3-419d-a04a-3829f0a0d0e9",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-15",
  expectedVersion: 2,
  note: "Corrected full history",
};

test("PDF validation explains empty, oversized and wrong-type selections", () => {
  assert.equal(gcashPdfError({ size: 20, type: "application/pdf" }), null);

  assert.match(gcashPdfError({ size: 0, type: "application/pdf" })!, /content/);

  assert.match(
    gcashPdfError({ size: 10 * 1024 * 1024 + 1, type: "application/pdf" })!,
    /10 MB/,
  );

  assert.match(gcashPdfError({ size: 20, type: "image/png" })!, /PDF/);
});

test("upload/review contracts preserve date order, captured versions and required review reasons", () => {
  assert.equal(gcashHistoryUploadSchema.safeParse(input).success, true);

  assert.equal(
    gcashHistoryUploadSchema.safeParse({ ...input, periodEnd: "2026-09-01" })
      .success,
    false,
  );

  assert.equal(
    gcashHistoryUploadSchema.safeParse({ ...input, expectedVersion: -1 })
      .success,
    false,
  );

  assert.equal(
    gcashHistoryReviewSchema.safeParse({
      version: 2,
      status: "VERIFIED",
      note: "Wrong domain",
    }).success,
    false,
  );

  assert.equal(
    gcashHistoryReviewSchema.safeParse({
      version: 2,
      status: "REVIEWED",
      note: "  ",
    }).success,
    false,
  );
});

test("the selected PDF and captured correction version are sent once as multipart data", async () => {
  const calls: RequestInit[] = [];

  globalThis.fetch = async (_url, options) => {
    calls.push(options!);

    return Response.json({ id: "saved" });
  };

  const file = new File(["%PDF-1.4\n%%EOF"], "history.pdf", {
    type: "application/pdf",
  });

  await uploadGcashHistory(input, file);

  assert.equal(calls.length, 1);

  const body = calls[0].body as FormData;

  assert.equal(body.get("expectedVersion"), "2");

  assert.equal(body.get("batchId"), input.batchId);

  assert.equal((body.get("file") as File).name, "history.pdf");

  assert.equal(calls[0].credentials, "include");
});

test("a stale review is not automatically retried with a replacement version", async () => {
  let count = 0;

  globalThis.fetch = async (_url, options) => {
    count++;

    assert.equal(JSON.parse(String(options?.body)).version, 2);

    return Response.json({ message: "Changed submission" }, { status: 409 });
  };

  await assert.rejects(
    reviewGcashHistory(input.batchId, {
      version: 2,
      status: "REVIEWED",
      note: "Checked complete history",
    }),
    /Changed submission/,
  );

  assert.equal(count, 1);
});

test("queue filters are encoded and CEO/Finance never gain PDF review or financial-write grants", async () => {
  globalThis.fetch = async (url) => {
    const query = new URL(String(url)).searchParams;

    assert.equal(query.get("q"), "AB-001 & export");

    assert.equal(query.get("status"), "SUBMITTED");

    return Response.json({ items: [], total: 0, page: 1, pageSize: 20 });
  };

  await listGcashHistories({
    q: "AB-001 & export",
    status: "SUBMITTED",
    page: 1,
  });

  assert.equal(rolePermissions.CEO.includes("GCASH_HISTORY_READ"), false);

  assert.equal(
    rolePermissions.FINANCE_OFFICER.includes("GCASH_HISTORY_REVIEW"),
    false,
  );

  assert.equal(rolePermissions.RECORDS.includes("PAYMENT_VERIFY"), false);

  assert.equal(rolePermissions.BATCH_HANDLER.includes("PAYMENT_VERIFY"), false);
});

test("GCash workspace follows the current business roles for navigation and direct visits", () => {
  for (const role of ["BATCH_HANDLER", "RECORDS", "FINANCE_OFFICER", "COO"]) {
    assert.equal(canOpenWorkspace(role, "/system/gcash-history"), true, role);
  }

  for (const role of [
    "CEO",
    "OWNER",
    "CUSTOMER",
    "BATCH_MANAGER",
    "AGENT",
    "CSR",
  ]) {
    assert.equal(canOpenWorkspace(role, "/system/gcash-history"), false, role);
  }

  assert.equal(
    rolePermissions.BATCH_HANDLER.includes("GCASH_HISTORY_UPLOAD"),
    true,
  );

  assert.equal(rolePermissions.RECORDS.includes("GCASH_HISTORY_REVIEW"), true);

  assert.equal(
    rolePermissions.CORE_HANDLER.includes("GCASH_HISTORY_UPLOAD"),
    true,
  );
});

test("GCash batch choices include legacy/completed batches without installment terms and read every page", async () => {
  const { listGcashBatchChoices } = await import("../lib/gcash-history");

  let calls = 0;

  globalThis.fetch = async (url) => {
    const page = Number(new URL(String(url)).searchParams.get("page"));

    calls++;

    return Response.json({
      items: [
        {
          id: `batch-${page}`,
          code: `LEGACY-${page}`,
          model: "Legacy phone",
          status: "COMPLETED",
          contractPrice: null,
        },
      ],
      total: 2,
      page,
      pageSize: 1,
    });
  };

  const choices = await listGcashBatchChoices();

  assert.equal(calls, 2);

  assert.equal(choices.length, 2);

  assert.equal(choices[1].batch_number, "LEGACY-2");
});

test("PDF passwords preserve exact characters and travel only in the upload body", async () => {
  let body: FormData | undefined;

  globalThis.fetch = async (url, options) => {
    assert.doesNotMatch(String(url), /synthetic-password/);

    body = options!.body as FormData;

    return Response.json({
      id: "saved",
      current: { reading: { transactionCount: 3 } },
    });
  };

  const password = "  synthetic-password  ";

  const result = await uploadGcashHistory(
    { ...input, password },
    new File(["%PDF-1.7\n%%EOF"], "encrypted.pdf", { type: "application/pdf" }),
  );

  assert.equal(body!.get("password"), password);

  assert.doesNotMatch(JSON.stringify(result), /synthetic-password/);

  assert.equal(
    gcashHistoryUploadSchema.safeParse({ ...input, password: "x".repeat(129) })
      .success,
    false,
  );
});

test("transaction reads keep the selected revision and page, with explicit permission errors", async () => {
  const { getGcashReading } = await import("../lib/gcash-history");

  let calls = 0;

  globalThis.fetch = async (url, options) => {
    calls++;

    assert.match(
      String(url),
      /submissions\/selected-revision\/reading\?page=2$/,
    );

    assert.equal(options!.credentials, "include");

    return Response.json(
      { message: "Your access has changed." },
      { status: 403 },
    );
  };

  await assert.rejects(
    getGcashReading("selected-revision", 2),
    /access has changed/,
  );

  assert.equal(calls, 1);
});
