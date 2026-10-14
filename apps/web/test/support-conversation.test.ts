import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupportCaseDetail } from "../lib/api";
import {
  createSupportConversation,
  type SupportConversationState,
} from "../lib/support-conversation";

function detail(id: string): SupportCaseDetail {
  return {
    id,
    client: "customer",
    client_name: "Customer",
    category: "payment",
    source: "customer_portal",
    description: "Question",
    assigned_staff: null,
    status: "open",
    resolution: "",
    date_received: "2026-10-14",
    closed_date: null,
    turnaround_hours: null,
    messages: [],
  };
}

function conversation() {
  const states: SupportConversationState[] = [];

  const pending: {
    id: string;
    resolve: (value: SupportCaseDetail) => void;
    reject: (error: Error) => void;
  }[] = [];

  const owner = createSupportConversation(
    (id) => {
      return new Promise<SupportCaseDetail>((resolve, reject) => {
        pending.push({ id, resolve, reject });
      });
    },
    (state) => {
      states.push(state);
    },
  );

  return { owner, states, pending };
}

test("selecting B keeps B visible when A responds last", async () => {
  const { owner, states, pending } = conversation();

  const a = owner.select("A");

  const b = owner.select("B");

  pending[1].resolve(detail("B"));

  await b;

  pending[0].resolve(detail("A"));

  await a;

  assert.deepEqual(states, [
    { status: "loading" },
    { status: "loading" },
    { status: "ready", detail: detail("B") },
  ]);
});

test("an old failure cannot replace B's loading state or its conversation", async () => {
  const { owner, states, pending } = conversation();

  const a = owner.select("A");

  const b = owner.select("B");

  pending[0].reject(new Error("A failed"));

  await a;

  assert.deepEqual(states, [{ status: "loading" }, { status: "loading" }]);

  pending[1].resolve(detail("B"));

  await b;

  assert.deepEqual(states.at(-1), { status: "ready", detail: detail("B") });
});

test("a later refresh wins over older loads for the same case", async () => {
  const { owner, states, pending } = conversation();

  const initial = owner.select("A");

  const refresh = owner.reload();

  const updated = { ...detail("A"), description: "Updated" };

  pending[1].resolve(updated);

  await refresh;

  pending[0].resolve(detail("A"));

  await initial;

  assert.deepEqual(states, [
    { status: "loading" },
    { status: "ready", detail: updated },
  ]);
});

test("closing or leaving a conversation rejects pending success and failure", async () => {
  for (const result of ["success", "failure"]) {
    const { owner, states, pending } = conversation();

    const request = owner.select("A");

    await owner.select(null);

    if (result === "success") {
      pending[0].resolve(detail("A"));
    } else {
      pending[0].reject(new Error("A failed"));
    }

    await request;

    assert.deepEqual(states, [{ status: "loading" }, { status: "idle" }]);

    const leaving = owner.select("B");

    owner.cancel();

    pending[1].resolve(detail("B"));

    await leaving;

    assert.deepEqual(states.at(-1), { status: "loading" });

    assert.equal(owner.selected, null);
  }
});

test("reopening the same case invalidates the earlier reply's selection", async () => {
  const { owner, pending } = conversation();

  const initial = owner.select("A");

  const oldSelection = owner.selected;

  await owner.select(null);

  const reopened = owner.select("A");

  assert.notEqual(owner.selected, oldSelection);

  assert.equal(owner.selected?.id, "A");

  pending[0].resolve(detail("A"));

  pending[1].resolve(detail("A"));

  await Promise.all([initial, reopened]);
});

test("the current load failure reports an actionable error and can be retried", async () => {
  const { owner, states, pending } = conversation();

  const request = owner.select("A");

  pending[0].reject(new Error("Try again"));

  await request;

  assert.deepEqual(states.at(-1), { status: "error", message: "Try again" });

  const retry = owner.reload();

  pending[1].resolve(detail("A"));

  await retry;

  assert.deepEqual(states.at(-1), { status: "ready", detail: detail("A") });
});
