import test from "node:test";
import assert from "node:assert/strict";
import { prepareDocumentFile } from "../lib/document-file";

test("valid picker files with empty or generic types retain their bytes, name and date with a supported upload MIME", async () => {
  for (const [name, expectedType] of [
    ["agreement.PDF", "application/pdf"],
    ["photo.jpeg", "image/jpeg"],
    ["photo.JPG", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.webp", "image/webp"],
  ]) {
    for (const type of ["", "application/octet-stream"]) {
      const original = new File(["synthetic contents"], name, {
        type,
        lastModified: 1234,
      });

      const prepared = prepareDocumentFile(original);

      assert.equal(prepared.type, expectedType);

      assert.equal(prepared.name, name);

      assert.equal(prepared.lastModified, original.lastModified);

      assert.equal(await prepared.text(), await original.text());
    }
  }
});

test("standard file types are preserved and recognized browser aliases are normalized", () => {
  const supported = new File(["synthetic"], "photo.png", { type: "image/png" });

  assert.equal(prepareDocumentFile(supported), supported);

  for (const [type, expectedType] of [
    ["application/x-pdf", "application/pdf"],
    ["image/jpg", "image/jpeg"],
    ["image/pjpeg", "image/jpeg"],
    ["image/x-png", "image/png"],
  ]) {
    assert.equal(
      prepareDocumentFile(new File(["synthetic"], "document", { type })).type,
      expectedType,
    );
  }
});

test("empty, oversized, unsupported and HEIC selections get actionable errors", () => {
  assert.throws(() => {
    return prepareDocumentFile(
      new File([], "photo.png", { type: "image/png" }),
    );
  }, /empty/);

  assert.throws(() => {
    return prepareDocumentFile(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "photo.png", {
        type: "image/png",
      }),
    );
  }, /up to 5 MB/);

  assert.throws(() => {
    return prepareDocumentFile(
      new File(["synthetic"], "report.docx", { type: "" }),
    );
  }, /PDF, JPG, PNG or WebP/);

  assert.throws(() => {
    return prepareDocumentFile(
      new File(["synthetic"], "renamed.png", { type: "image/gif" }),
    );
  }, /PDF, JPG, PNG or WebP/);

  assert.throws(() => {
    return prepareDocumentFile(
      new File(["synthetic"], "photo.HEIC", { type: "" }),
    );
  }, /HEIC\/HEIF/);

  assert.throws(() => {
    return prepareDocumentFile(
      new File(["synthetic"], "photo.png", { type: "image/heif" }),
    );
  }, /HEIC\/HEIF/);
});
