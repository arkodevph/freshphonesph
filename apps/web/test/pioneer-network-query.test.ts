import assert from "node:assert/strict";
import { test } from "node:test";
import {
  networkFilters,
  requestFilters,
  safeNetworkReturn,
} from "../app/system/_role-designs/pioneer_agent/app/system/agent-network/network-query";

test("network return preserves recognized state and rejects arbitrary destinations", () => {
  const id = "e1000000-0000-4000-8000-000000000001";

  const result = new URL(
    safeNetworkReturn(
      `/system/agent-network?view=agents&q=Agent+502&page=26&sort=name_desc&agent=${id}&secret=x`,
    ),
    "https://local.invalid",
  );

  assert.equal(result.searchParams.get("q"), "Agent 502");

  assert.equal(result.searchParams.get("page"), "26");

  assert.equal(result.searchParams.get("sort"), "name_desc");

  assert.equal(result.searchParams.get("agent"), id);

  assert.equal(result.searchParams.has("secret"), false);

  for (const value of [
    null,
    "https://outside.example/path",
    "//outside.example",
    "/system/agent-network/../payments",
    "/system/agent-networked",
    "/system/agent-network?page=-1",
    "/system/agent-network?sort=invalid",
  ]) {
    assert.equal(safeNetworkReturn(value), "/system/agent-network");
  }
});

test("network and request query validation prevents invalid pages, sort and Agent IDs", () => {
  assert.equal(
    networkFilters(new URLSearchParams("view=batches&sort=model_desc&page=3"))
      .result.success,
    true,
  );

  assert.equal(
    networkFilters(new URLSearchParams("page=0")).result.success,
    false,
  );

  assert.equal(
    networkFilters(new URLSearchParams("q=" + "a".repeat(101))).result.success,
    false,
  );

  assert.equal(
    requestFilters(new URLSearchParams("agentId=not-an-id")).success,
    false,
  );

  assert.equal(
    requestFilters(new URLSearchParams("status=REJECTED&sort=oldest&page=2"))
      .success,
    true,
  );

  assert.equal(
    requestFilters(new URLSearchParams(), "bad-request-id").success,
    false,
  );
});
