import assert from "node:assert/strict";
import { test } from "node:test";
import {
  batchFilters,
  batchQuery,
} from "../app/system/_role-designs/agent/app/system/agent-network/batch-query";

test("Agent batch links restore recognized filters without forwarding scope overrides", () => {
  const parsed = batchFilters(
    new URLSearchParams(
      "page=6&q=%20Beyond%20old%20cap%20&sort=model_desc&agentId=foreign&view=team",
    ),
  );

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.deepEqual(parsed.data, {
    page: 6,
    q: "Beyond old cap",
    sort: "model_desc",
  });

  const encoded = batchQuery(parsed.data);

  assert.equal(encoded.includes("agentId"), false);

  assert.equal(encoded.includes("team"), false);

  assert.deepEqual(batchFilters(new URLSearchParams(encoded)), parsed);
});

test("invalid Agent batch URL filters cannot reach the strict API as accepted values", () => {
  for (const query of [
    "page=0",
    "page=-1",
    "page=1.5",
    "page=10001",
    "page=NaN",
    "sort=members_desc",
    `q=${"x".repeat(101)}`,
  ]) {
    assert.equal(
      batchFilters(new URLSearchParams(query)).success,
      false,
      query,
    );
  }

  assert.deepEqual(batchFilters(new URLSearchParams()).data, {
    page: 1,
    q: "",
    sort: "code_asc",
  });
});
