import { test } from "node:test";
import assert from "node:assert/strict";
import {
  financePaymentHref,
  financeReportHref,
  financeReportLocation,
  financeGcashHref,
  safeFinanceReturn,
} from "../lib/finance-navigation";
const batch = "10000000-0000-4000-8000-000000000001",
  payment = "10000000-0000-4000-8000-000000000002";

const filters = {
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
  batchId: batch,
  status: "",
};

test("Finance Collections drill-down preserves current membership scope, verified credit period and return page", () => {
  const back = financeReportHref("collections", filters, 2);

  const query = new URL(
    financePaymentHref({ kind: "collections", filters, returnTo: back }),
    "https://local.invalid",
  ).searchParams;

  assert.equal(query.get("membershipBatchId"), batch);

  assert.equal(query.has("batchId"), false);

  assert.equal(query.get("status"), "verified");

  assert.equal(query.get("dateFrom"), filters.dateFrom);

  assert.equal(query.get("returnTo"), back);

  const location = financeReportLocation(
    new URL(back, "https://local.invalid").search,
    ["payments", "collections", "reconciliation"],
  );

  assert.equal(location.kind, "collections");

  assert.deepEqual(location.filters, filters);

  assert.equal(location.page, 2);
});

test("Reconciliation uses recorded batch scope and an exact record link cannot hide behind the source period", () => {
  const scoped = new URL(
    financePaymentHref({ kind: "reconciliation", filters }),
    "https://local.invalid",
  ).searchParams;

  assert.equal(scoped.get("batchId"), batch);

  assert.equal(scoped.has("membershipBatchId"), false);

  const exact = new URL(
    financePaymentHref({
      id: payment,
      filters,
      returnTo: financeReportHref("reconciliation", filters),
    }),
    "https://local.invalid",
  ).searchParams;

  assert.equal(exact.get("payment"), payment);

  assert.equal(exact.has("dateFrom"), false);

  assert.equal(exact.has("batchId"), false);
});

test("Finance return destinations reject external, protocol-relative, encoded and unrelated private routes", () => {
  for (const value of [
    "https://outside.test/system/reports",
    "//outside.test/system/reports",
    "javascript:alert(1)",
    "/\\outside.test/system/reports",
    "/system/team",
    "/%2f%2foutside.test/system/reports",
  ]) {
    assert.equal(safeFinanceReturn(value), null, value);
  }

  assert.equal(
    safeFinanceReturn("/system/reports?report=collections"),
    "/system/reports?report=collections",
  );
});

test("GCash return links retain the exact statement revision/history page and authorized queue context", () => {
  const href = financeGcashHref(
    "?q=Batch+%26+period&status=REVIEWED&archived=archived&page=2&unrelated=ignore",
    batch,
    payment,
    3,
  );

  const query = new URL(href, "https://local.invalid").searchParams;

  assert.equal(query.get("history"), batch);

  assert.equal(query.get("submission"), payment);

  assert.equal(query.get("submissionPage"), "3");

  assert.equal(query.get("page"), "2");

  assert.equal(query.get("q"), "Batch & period");

  assert.equal(query.has("unrelated"), false);
});

test("report location preserves explicitly unbounded dates and rejects invalid filter or role-only report inputs", () => {
  const unbounded = financeReportLocation(
    "?report=payments&dateFrom=&dateTo=",
    ["payments", "collections", "reconciliation"],
  );

  assert.equal(unbounded.filters.dateFrom, "");

  assert.equal(unbounded.filters.dateTo, "");

  const invalid = financeReportLocation(
    "?report=tasks&dateFrom=bad&batchId=invalid&page=-5",
    ["payments", "collections", "reconciliation"],
  );

  assert.equal(invalid.kind, "payments");

  assert.equal(invalid.page, 1);

  assert(invalid.error);
});
