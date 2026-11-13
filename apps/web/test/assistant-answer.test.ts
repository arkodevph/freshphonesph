import { test } from "node:test";
import assert from "node:assert/strict";
import { answerBlocks, answerInline } from "../lib/assistant-answer";

test("catalog bullets and tables become structured results without losing names or values", () => {
  assert.deepEqual(
    answerBlocks([
      "Current listings:",
      "* **iPhone 11** — Contact us\n* **iPad A16** — Available",
    ]),
    [
      { type: "paragraph", text: "Current listings:" },
      {
        type: "list",
        ordered: false,
        items: ["**iPhone 11** — Contact us", "**iPad A16** — Available"],
      },
    ],
  );

  assert.deepEqual(
    answerBlocks(["| Batch | Memberships |\n| --- | ---: |\n| Demo | 37 |"]),
    [
      {
        type: "table",
        headings: ["Batch", "Memberships"],
        rows: [["Demo", "37"]],
      },
    ],
  );
});

test("formatting preserves HTML and links as plain text rather than executable markup", () => {
  assert.deepEqual(
    answerInline(
      "**iPhone** `37` <script>alert(1)</script> [open](javascript:alert(1))",
    ),
    [
      { type: "strong", text: "iPhone" },
      { type: "text", text: " " },
      { type: "code", text: "37" },
      {
        type: "text",
        text: " <script>alert(1)</script> [open](javascript:alert(1))",
      },
    ],
  );

  assert.deepEqual(answerBlocks(["| unfinished |", "Ordinary follow-up"]), [
    { type: "paragraph", text: "| unfinished |" },
    { type: "paragraph", text: "Ordinary follow-up" },
  ]);
});
