import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, type Dispatch, type SetStateAction } from "react";
import { renderToString } from "react-dom/server";
import { toast } from "sonner";
import { useToastNotice } from "../lib/useToastNotice";

test("action notices stack repeated messages and preserve delivered notices on reset", () => {
  let notify!: Dispatch<SetStateAction<string | null>>;

  function Probe() {
    const [inline, send] = useToastNotice(null);

    assert.equal(inline, null);

    notify = send;

    return null;
  }

  toast.dismiss();

  renderToString(createElement(Probe));

  notify("Report saved");

  notify("Report saved");

  notify((previous) => {
    return `${previous} again`;
  });

  notify(null);

  const delivered = toast.getToasts();

  assert.equal(delivered.length, 3);

  assert.equal(
    new Set(
      delivered.map((item) => {
        return item.id;
      }),
    ).size,
    3,
  );

  assert.deepEqual(
    delivered.map((item) => {
      return "title" in item ? item.title : undefined;
    }),
    ["Report saved", "Report saved", "Report saved again"],
  );

  toast.dismiss();
});
