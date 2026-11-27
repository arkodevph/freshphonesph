import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentWithdrawalHref,
  agentWithdrawalLocation,
  withdrawalCommand,
} from "../app/system/_role-designs/agent/components/withdrawals/agent-withdrawal";
import { withdrawalMoney } from "../lib/withdrawals";

test("Agent withdrawal URL restores recognized filters and selection without scope overrides", () => {
  const request = "a6000000-0000-4000-8000-000000000007";

  const location = agentWithdrawalLocation(
    new URLSearchParams(
      `page=2&q=%20phone%20&status=APPROVED&request=${request}&clientId=foreign&refund=outstanding`,
    ),
  );

  assert(location);

  assert.equal(location.q, "phone");

  assert.equal(location.request, request);

  const href = agentWithdrawalHref(location, { request: undefined });

  assert.match(href, /page=2/);

  assert.match(href, /status=APPROVED/);

  assert(!href.includes("clientId"));

  assert(!href.includes("refund"));

  assert(!href.includes("request="));

  for (const query of [
    "page=0",
    "status=PAID",
    "request=bad",
    `q=${"x".repeat(101)}`,
  ]) {
    assert.equal(agentWithdrawalLocation(new URLSearchParams(query)), null);
  }
});

test("withdrawal commands freeze version, body and key across uncertain replacement retries", async () => {
  const previous = globalThis.fetch;

  const sent: { body: string; key: string | null }[] = [];

  globalThis.fetch = async (_url, options) => {
    sent.push({
      body: String(options?.body),
      key: new Headers(options?.headers).get("Idempotency-Key"),
    });

    if (sent.length === 1) {
      throw new TypeError("Synthetic response lost");
    }

    return Response.json({ id: "case", reason: "recorded", actions: {} });
  };

  try {
    const input = {
      version: 3,
      submissionId: crypto.randomUUID(),
      name: "Original replacement",
    };

    const command = withdrawalCommand("case", "replacement-request", input);

    await assert.rejects(command(), /response lost/);

    input.name = "Changed after loss";

    input.version = 99;

    await command();

    assert.deepEqual(sent[0], sent[1]);

    assert.equal(JSON.parse(sent[1].body).version, 3);

    assert.equal(JSON.parse(sent[1].body).name, "Original replacement");
  } finally {
    globalThis.fetch = previous;
  }
});

test("Agent financial context does not turn undecided refund into zero", () => {
  assert.equal(withdrawalMoney(null), "Not decided");

  assert.notEqual(withdrawalMoney("0.00"), withdrawalMoney(null));

  assert.match(withdrawalMoney("0.00"), /0\.00/);
});
