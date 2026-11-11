import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentMatch } from "../app/system/gcash-history/PaymentMatch";

test("only a unique suggested match offers an exact payment link", () => {
  const suggested = renderToStaticMarkup(
    createElement(PaymentMatch, {
      match: { rowIndex: 0, status: "SUGGESTED", paymentId: "synthetic-id" },
    }),
  );

  assert.match(suggested, /Suggested match/);

  assert.match(suggested, /href="\/system\/payments\?payment=synthetic-id"/);

  const ambiguous = renderToStaticMarkup(
    createElement(PaymentMatch, {
      match: { rowIndex: 0, status: "AMBIGUOUS", paymentId: "synthetic-id" },
    }),
  );

  assert.match(ambiguous, /Ambiguous/);

  assert.doesNotMatch(ambiguous, /href=|synthetic-id/);
});
