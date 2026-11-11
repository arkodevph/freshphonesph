import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import type { Client, Payment } from "@freshphones/contracts";
import type {
  AccountStatement,
  PaymentConfirmation,
} from "../lib/account-documents";
import { createAccountPdf } from "../lib/account-pdf-renderer";

const client = {
  id: "20000000-0000-4000-8000-000000000002",
  name: "Sample Member",
  unitModel: "iPhone 15 · 128 GB",
  batch: { code: "FP-DEMO-001", model: "iPhone 15" },
} as Client;

const shared = {
  officialTaxInvoice: false as const,
  notice:
    "Operational account statement only. This is not an official BIR sales invoice.",
  generatedAt: "2026-11-10T04:30:00Z",
};

const payment: Payment = {
  clientId: client.id,
  batchId: "30000000-0000-4000-8000-000000000003",
  scheduleItemId: null,
  receiptTime: null,
  receiptName: null,
  receiptPhone: null,
  notes: null,
  verificationNotes: null,
  status: "VERIFIED",
  duplicateReference: false,
  version: 1,
  recordedBy: { id: "handler", name: "Handler" },
  verifier: { id: "finance", name: "Finance" },
  proofFile: null,
  client: {
    id: client.id,
    name: client.name,
    batch: { id: "batch", code: client.batch.code },
  },
  createdAt: "2026-10-30T00:00:00Z",
  updatedAt: "2026-10-30T00:00:00Z",
  verifiedAt: "2026-10-30T00:00:00Z",
  id: "10000000-0000-4000-8000-000000000001",
  amount: "50.00",
  effectiveAmount: "45.00",
  paymentDate: "2026-10-30",
  method: "GCASH",
  referenceNumber: "DEMO-REFERENCE",
  adjustments: [],
};

const assets = Promise.all([
  readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
  readFile(new URL("../public/fonts/NotoSans-Bold.ttf", import.meta.url)),
  readFile(new URL("../public/brand/fresh-phones-logo.png", import.meta.url)),
]).then(([regular, bold, logo]) => {
  return { regular, bold, logo };
});

async function inspect(bytes: Uint8Array) {
  // Text extraction needs no canvas. pdfjs uses this constructor at module load only.
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = class {} as typeof DOMMatrix;
  }

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const file = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
  }).promise;

  const raw = await PDFDocument.load(bytes);

  const pages: {
    text: string;
    items: { str: string; transform: number[]; width: number }[];
  }[] = [];

  try {
    for (let index = 1; index <= file.numPages; index++) {
      const page = await file.getPage(index);

      const content = await page.getTextContent();

      const items = content.items.filter((item) => {
        return "str" in item;
      });

      const text = items
        .map((item) => {
          return item.str;
        })
        .join(" ");

      assert(text.includes("Fresh Phones PH"));

      assert(text.includes(shared.notice));

      assert(text.includes(`${index} / ${file.numPages}`));

      const resources = raw
        .getPage(index - 1)
        .node.Resources()!
        .lookup(PDFName.of("XObject"), PDFDict);

      assert(
        resources.values().some((ref) => {
          const resource = raw.context.lookup(ref);

          return (
            resource instanceof PDFRawStream &&
            resource.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
          );
        }),
        "Every page embeds the real logo",
      );

      for (const item of items) {
        assert(
          item.transform[4] >= 50 && item.transform[4] + item.width <= 545.5,
          `Text outside horizontal paper bounds: ${item.str}`,
        );

        assert(
          item.transform[5] >= 46 && item.transform[5] <= 797,
          `Text outside vertical paper bounds: ${item.str}`,
        );
      }

      pages.push({ text, items });
    }

    return pages;
  } finally {
    await file.destroy();
  }
}

const statement = (): AccountStatement => {
  return {
    ...shared,
    documentType: "STATEMENT_OF_ACCOUNT",
    title: "Statement of Account",
    balance: {
      clientId: client.id,
      totalDue: "2500.00",
      verifiedPaid: "0.00",
      remainingBalance: "2500.00",
      overpaid: "0.00",
      pendingAmount: "90.00",
    },
    verifiedPayments: [],
  };
};

test("branded A4 confirmation preserves original, adjusted and zero credit with complete identity", async () => {
  const record = {
    ...shared,
    documentType: "PAYMENT_CONFIRMATION",
    title: "Payment Confirmation",
    payment: { ...payment, effectiveAmount: "0.00" },
  } as PaymentConfirmation;

  const bytes = await createAccountPdf(client, record, await assets);

  const pages = await inspect(bytes);

  assert.equal(pages.length, 1);

  const text = pages[0].text;

  for (const value of [
    client.name,
    client.id,
    client.batch.code,
    payment.id,
    "₱50.00",
    "₱0.00",
    "Current verified credit",
    payment.referenceNumber!,
  ]) {
    assert(text.includes(value), value);
  }

  assert.equal((await PDFDocument.load(bytes)).getPage(0).getWidth(), 595.28);
});

test("empty statement shows zero credit, remaining balance and explicit absence of verified payments", async () => {
  const pages = await inspect(
    await createAccountPdf(client, statement(), await assets),
  );

  assert.equal(pages.length, 1);

  for (const value of [
    "₱0.00",
    "₱2,500.00",
    "No verified payments yet.",
    "Pending and returned claims",
  ]) {
    assert(pages[0].text.includes(value));
  }
});

test("long statements repeat table context and retain the final payment, adjustment and replacement release", async () => {
  const record = statement();

  record.balance = {
    ...record.balance,
    originalDue: "0.00",
    releasedDue: "300.00",
    verifiedPaid: "4050.00",
  };

  record.verifiedPayments = Array.from({ length: 90 }, (_, i) => {
    return {
      ...payment,
      id: `${payment.id}-${i}`,
      referenceNumber: `REFERENCE-${String(i).padStart(3, "0")}`,
      amount: i % 2 ? "50.00" : "1500.00",
    };
  });

  record.verifiedPayments[89].adjustments = [
    {
      id: "adjustment",
      sequence: 1,
      amount: "-5.00",
      beforeAmount: "50.00",
      afterAmount: "45.00",
      createdAt: "2026-11-01T00:00:00Z",
    },
  ];

  const pages = await inspect(
    await createAccountPdf(client, record, await assets),
  );

  assert(pages.length >= 5);

  const text = pages
    .map((page) => {
      return page.text;
    })
    .join(" ");

  for (let i = 0; i < 90; i++) {
    assert(text.includes(`REFERENCE-${String(i).padStart(3, "0")}`));
  }

  for (const value of [
    "Adjustment 1",
    "₱50.00 → ₱45.00",
    "not a payment or refund",
    "₱300.00",
    "₱0.00",
  ]) {
    assert(text.includes(value), value);
  }

  for (const page of pages.filter((entry) => {
    return entry.text.includes("REFERENCE-0") && entry.text.includes("GCASH");
  })) {
    assert(page.text.includes("Current credit"));

    const endpoints = page.items
      .filter((item) => {
        return ["₱50.00", "₱1,500.00"].includes(item.str);
      })
      .map((item) => {
        return item.transform[4] + item.width;
      });

    for (const end of endpoints) {
      assert(
        Math.abs(end - 447.24) < 1,
        `Original amounts should share a right edge: ${end}`,
      );
    }
  }
});

test("oversized identity and unbroken references continue across pages without clipping or lost digits", async () => {
  const reference = "LONG-REFERENCE-" + "1234567890".repeat(350);

  const longClient = {
    ...client,
    name: "Long Customer Name ".repeat(180) + "NAME-END",
    unitModel: "Long model ".repeat(100) + "MODEL-END",
  };

  const record = {
    ...shared,
    documentType: "PAYMENT_CONFIRMATION",
    title: "Payment Confirmation",
    payment: {
      ...payment,
      amount: "9999999999.99",
      effectiveAmount: "0.00",
      referenceNumber: reference,
    },
  } as PaymentConfirmation;

  const pages = await inspect(
    await createAccountPdf(longClient, record, await assets),
  );

  const text = pages
    .map((page) => {
      return page.text;
    })
    .join(" ");

  assert(text.includes("NAME-END"));

  assert(text.includes("MODEL-END"));

  const extractedReference = pages
    .flatMap((page) => {
      return page.items;
    })
    .filter((item) => {
      return item.str.startsWith("LONG-REFERENCE-") || /^\d+$/.test(item.str);
    })
    .map((item) => {
      return item.str;
    })
    .join("");

  assert.equal(extractedReference, reference);

  assert(text.includes("₱9,999,999,999.99"));

  assert(text.includes("Current verified credit"));
});
