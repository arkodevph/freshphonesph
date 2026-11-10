import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { PortalApplicationSummary } from "@freshphones/contracts";
import { PDFDocument } from "pdf-lib";
import {
  applicationSummaryDate,
  applicationSummarySections,
  capturedApplicationMembership,
  createApplicationSummaryLoader,
  type ApplicationSummaryState,
} from "../lib/application-summary";
import { createApplicationSummaryPdf } from "../lib/application-summary-pdf";

const firstId = "dd386c45-b24c-45a3-a575-7cad985231c1";

const secondId = "fbaf22fb-5c44-4f9e-9a37-84bfc75443e3";

function summary(id = firstId): PortalApplicationSummary {
  return {
    title: "Application summary",
    generatedAt: "2026-10-30T09:00:00.000Z",
    notice:
      "A summary of your current membership record. Your application and signed agreement are handled separately.",
    membership: {
      id,
      name: "María Peña — synthetic",
      email: "synthetic@example.test",
      phone: "+639170000001",
      joinedAt: "2026-10-30",
      status: "ACTIVE",
      replacementCompletedAt: null,
      unitModel: "iPhone 16 · 128 GB",
    },
    batch: {
      id: "ca42797f-eebe-43d2-bd29-b6f85e2aa7c",
      code: "APP-SYNTHETIC-001",
      model: "Batch model",
      status: "ACTIVE",
      startDate: "2026-11-01",
      endDate: "2027-01-31",
    },
    plan: {
      individual: true,
      startDate: "2026-12-01",
      endDate: "2027-01-31",
      cadence: "WEEKLY",
      issuedSchedule: {
        installmentCount: 2,
        firstDueDate: "2026-12-08",
        lastDueDate: "2026-12-15",
        originalTotal: "120.01",
      },
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;

  let reject!: (error: Error) => void;

  const promise = new Promise<T>((pass, fail) => {
    resolve = pass;

    reject = fail;
  });

  return { promise, resolve, reject };
}

test("document selection requires exactly one valid captured membership, with no silent fallback", () => {
  assert.equal(capturedApplicationMembership(`membership=${firstId}`), firstId);

  assert.equal(
    capturedApplicationMembership(`membership=${firstId.toUpperCase()}`),
    firstId,
  );

  for (const query of [
    "",
    "membership=",
    "membership=wrong",
    `membership=${firstId}&membership=${secondId}`,
    `membership=${firstId}&membership=${firstId}`,
  ]) {
    assert.equal(capturedApplicationMembership(query), null);
  }
});

test("summary fields distinguish individual dates, original schedule amount and recorded batch", () => {
  const sections = applicationSummarySections(summary());

  const fields = sections.flatMap((section) => {
    return section.fields;
  });

  const value = (label: string) => {
    return fields.find((field) => {
      return field.label === label;
    })?.value;
  };

  assert.match(value("Plan start date")!, /December 1, 2026/);

  assert.match(value("Batch start date")!, /November 1, 2026/);

  assert.equal(value("Installment frequency"), "Weekly");

  assert.equal(value("Full name"), "María Peña — synthetic");

  assert.match(value("Original scheduled amount")!, /120\.01/);

  assert.equal(
    fields.some((field) => {
      return /paid|balance|signed|consent/i.test(field.label);
    }),
    false,
  );

  assert.equal(applicationSummaryDate("2026-12-08"), "December 8, 2026");
});

test("missing values and unissued schedule do not turn into made-up zero balances or dates", () => {
  const record = summary();

  record.membership.joinedAt = null;

  record.membership.email = "";

  record.membership.unitModel = "";

  record.plan.cadence = null;

  record.plan.issuedSchedule = null;

  const fields = applicationSummarySections(record).flatMap((section) => {
    return section.fields;
  });

  assert.ok(
    fields.some((field) => {
      return field.label === "Email" && field.value === "Not recorded";
    }),
  );

  assert.ok(
    fields.some((field) => {
      return field.label === "Unit" && field.value === "Batch model";
    }),
  );

  assert.ok(
    fields.some((field) => {
      return (
        field.label === "Installments issued" &&
        field.value === "No schedule issued"
      );
    }),
  );

  assert.equal(applicationSummaryDate(null), "Not recorded");
});

test("a late earlier membership cannot replace a newer document", async () => {
  const first = deferred<PortalApplicationSummary>();

  const second = deferred<PortalApplicationSummary>();

  const states: ApplicationSummaryState[] = [];

  const loader = createApplicationSummaryLoader(
    (id) => {
      return id === firstId ? first.promise : second.promise;
    },
    (state) => {
      states.push(state);
    },
  );

  const old = loader.load(firstId);

  const current = loader.load(secondId);

  second.resolve(summary(secondId));

  await current;

  first.resolve(summary(firstId));

  await old;

  assert.equal(states.at(-1)?.status, "ready");

  assert.equal(states.at(-1)?.membershipId, secondId);
});

test("failed reload clears private cached summary and retry recovers the same captured membership", async () => {
  let fail = false;

  const states: ApplicationSummaryState[] = [];

  const loader = createApplicationSummaryLoader(
    async (id) => {
      if (fail) {
        throw new Error("Synthetic temporary failure");
      }

      return summary(id);
    },
    (state) => {
      states.push(state);
    },
  );

  await loader.load(firstId);

  fail = true;

  await loader.load(firstId);

  assert.equal(states.at(-2)?.status, "loading");

  assert.equal(states.at(-1)?.status, "error");

  assert.equal("summary" in states.at(-1)!, false);

  fail = false;

  await loader.load(firstId);

  assert.equal(states.at(-1)?.status, "ready");

  assert.equal(states.at(-1)?.membershipId, firstId);
});

test("mismatched response, missing selection and unmounted reads never produce an exportable document", async () => {
  const states: ApplicationSummaryState[] = [];

  const loader = createApplicationSummaryLoader(
    async () => {
      return summary(secondId);
    },
    (state) => {
      states.push(state);
    },
  );

  await loader.load(firstId);

  assert.equal(states.at(-1)?.status, "error");

  await loader.load(null);

  assert.equal(states.at(-1)?.status, "error");

  const pending = deferred<PortalApplicationSummary>();

  const cancellable = createApplicationSummaryLoader(
    () => {
      return pending.promise;
    },
    (state) => {
      states.push(state);
    },
  );

  const run = cancellable.load(firstId);

  const before = states.length;

  cancellable.cancel();

  pending.resolve(summary());

  await run;

  assert.equal(states.length, before);
});

test("PDF embeds Unicode fonts, handles long tokens and produces valid paginated A4 output", async () => {
  const record = summary();

  record.membership.name = "María Peña " + "Á".repeat(100);

  record.membership.email = "long".repeat(55) + "@example.test";

  const [regular, bold] = await Promise.all([
    readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
    readFile(new URL("../public/fonts/NotoSans-Bold.ttf", import.meta.url)),
  ]);

  const bytes = await createApplicationSummaryPdf(record, { regular, bold });

  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getTitle(), "Application summary");

  assert.equal(pdf.getAuthor(), "Fresh Phones PH");

  assert.ok(pdf.getPageCount() >= 1);

  assert.ok(pdf.getPageCount() <= 3);

  for (const page of pdf.getPages()) {
    assert.equal(page.getWidth(), 595);

    assert.equal(page.getHeight(), 842);
  }
});
