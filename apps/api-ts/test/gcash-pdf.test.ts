import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { GcashPdfService } from "../src/gcash-history/gcash-pdf.service";

const fixture = (name: string) => {
  return readFile(join(__dirname, "fixtures/gcash", name));
};

test("PDF reader extracts exact centavos, leading-zero references and wrapped descriptions", async () => {
  const result = await new GcashPdfService().read(await fixture("text.pdf"));

  assert.equal(result.status, "PARSED");

  assert.equal(result.rows.length, 3);

  assert.equal(result.rows[0].reference, "0000000000001");

  assert.match(result.rows[1].description, /Additional synthetic description/);

  assert.equal(result.calculatedDebit, "35.00");

  assert.equal(result.calculatedCredit, "50.00");

  assert.ok(
    Object.values(result.checks).every((value) => {
      return value === true;
    }),
  );
});

test("encrypted PDF reader errors are actionable and the password is absent from results", async () => {
  const service = new GcashPdfService();

  const bytes = await fixture("encrypted.pdf");

  await assert.rejects(service.read(bytes), /needs a password/);

  await assert.rejects(service.read(bytes, "wrong"), /password is incorrect/);

  const result = await service.read(bytes, "synthetic-test-only");

  assert.equal(result.status, "PARSED");

  assert.doesNotMatch(JSON.stringify(result), /synthetic-test-only|password/);
});

test("reader concurrency is bounded and capacity is restored after completion", async () => {
  const service = new GcashPdfService();

  const bytes = await fixture("text.pdf");

  const first = service.read(bytes);

  await assert.rejects(service.read(bytes), /reader is busy/);

  await first;

  assert.equal((await service.read(bytes)).transactionCount, 3);
});

test("reader distinguishes unsupported layouts from corrupt or over-limit PDFs", async () => {
  const service = new GcashPdfService();

  assert.equal(
    (await service.read(await fixture("blank.pdf"))).status,
    "UNSUPPORTED",
  );

  await assert.rejects(
    service.read(await fixture("too-many-pages.pdf")),
    /20 pages/,
  );

  await assert.rejects(
    service.read(Buffer.from("%PDF-1.7\ncorrupt\n%%EOF")),
    /could not be opened or read/,
  );
});

test("missing runtime dependency returns a generic error and does not expose supplied input", async () => {
  const previous = process.env.GCASH_PYTHON_BIN;

  process.env.GCASH_PYTHON_BIN = "/nonexistent/synthetic-python";

  try {
    await assert.rejects(
      new GcashPdfService().read(
        await fixture("encrypted.pdf"),
        "do-not-expose-this",
      ),
      (error: Error) => {
        assert.match(error.message, /unavailable/);

        assert.doesNotMatch(error.message, /do-not-expose|nonexistent/);

        return true;
      },
    );
  } finally {
    if (previous === undefined) {
      delete process.env.GCASH_PYTHON_BIN;
    } else {
      process.env.GCASH_PYTHON_BIN = previous;
    }
  }
});

test("oversized helper output is terminated and cannot fill API memory", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "freshphones-reader-output-test-"),
  );

  const executable = join(directory, "synthetic-reader");

  await writeFile(
    executable,
    "#!/usr/bin/env python3\nimport sys,time\nsys.stdout.write('x' * (5 * 1024 * 1024))\nsys.stdout.flush()\ntime.sleep(30)\n",
    { mode: 0o700 },
  );

  const previous = process.env.GCASH_PYTHON_BIN;

  process.env.GCASH_PYTHON_BIN = executable;

  try {
    await assert.rejects(
      new GcashPdfService().read(await fixture("text.pdf")),
      /too large or complex/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.GCASH_PYTHON_BIN;
    } else {
      process.env.GCASH_PYTHON_BIN = previous;
    }

    await rm(directory, { recursive: true, force: true });
  }
});

test("text and scanned pages both remain visible in a mixed multi-page statement", async () => {
  const { spawnSync } = await import("node:child_process");

  const directory = await mkdtemp(
    join(tmpdir(), "freshphones-mixed-pdf-test-"),
  );

  const output = join(directory, "mixed.pdf");

  try {
    const generated = spawnSync(process.env.GCASH_PYTHON_BIN ?? "python3", [
      "-c",
      "from pypdf import PdfReader,PdfWriter;import sys;w=PdfWriter();[w.add_page(p) for name in sys.argv[2:] for p in PdfReader(name).pages];w.write(sys.argv[1])",
      output,
      join(__dirname, "fixtures/gcash/text.pdf"),
      join(__dirname, "fixtures/gcash/scanned.pdf"),
    ]);

    assert.equal(generated.status, 0);

    const result = await new GcashPdfService().read(await readFile(output));

    assert.equal(result.method, "MIXED");

    assert.equal(result.transactionCount, 6);

    assert.deepEqual(
      [
        ...new Set(
          result.rows.map((row) => {
            return row.page;
          }),
        ),
      ],
      [1, 2],
    );

    assert.equal(result.status, "PARTIAL");

    assert.ok(
      result.warnings.some((warning) => {
        return warning.includes("do not reconcile");
      }),
    );

    assert.ok(
      result.warnings.some((warning) => {
        return warning.includes("OCR");
      }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
