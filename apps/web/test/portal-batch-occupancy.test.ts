import { test } from "node:test";
import assert from "node:assert/strict";
import type { PortalBatchSummary } from "@freshphones/contracts";
import {
  createPortalBatchOccupancy,
  portalBatchStatus,
  type PortalBatchOccupancyState,
} from "../lib/portal-batch-occupancy";

function summary(
  membershipId: string,
  approvedMembers = 6,
): PortalBatchSummary {
  return {
    membershipId,
    batchId: `batch-${membershipId}`,
    batchNumber: `B-${membershipId}`,
    approvedMembers,
    capacity: 8,
    remaining: Math.max(0, 8 - approvedMembers),
    isFull: approvedMembers >= 8,
    batchStatus: "ACTIVE",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;

  let reject!: (reason: unknown) => void;

  const promise = new Promise<T>((pass, fail) => {
    resolve = pass;

    reject = fail;
  });

  return { promise, resolve, reject };
}

test("a late prior-membership read cannot replace the selected batch", async () => {
  const first = deferred<PortalBatchSummary>();

  const second = deferred<PortalBatchSummary>();

  const states: PortalBatchOccupancyState[] = [];

  const requested: string[] = [];

  const occupancy = createPortalBatchOccupancy(
    (membershipId) => {
      requested.push(membershipId);

      return membershipId === "first" ? first.promise : second.promise;
    },
    (state) => {
      states.push(state);
    },
  );

  const oldRead = occupancy.select("first");

  const currentRead = occupancy.select("second");

  second.resolve(summary("second", 8));

  await currentRead;

  first.resolve(summary("first", 1));

  await oldRead;

  assert.deepEqual(requested, ["first", "second"]);

  assert.deepEqual(states.at(-1), {
    status: "ready",
    membershipId: "second",
    summary: summary("second", 8),
  });

  assert.equal(
    states.filter((state) => {
      return state.status === "ready";
    }).length,
    1,
  );
});

test("a failed live refresh removes the old count and retry reads the captured membership", async () => {
  const states: PortalBatchOccupancyState[] = [];

  const requested: string[] = [];

  let failure = false;

  const occupancy = createPortalBatchOccupancy(
    async (membershipId) => {
      requested.push(membershipId);

      if (failure) {
        throw new Error("Connection interrupted");
      }

      return summary(membershipId, requested.length === 1 ? 6 : 8);
    },
    (state) => {
      states.push(state);
    },
  );

  await occupancy.select("selected");

  failure = true;

  await occupancy.refresh();

  assert.deepEqual(states.at(-2), {
    status: "loading",
    membershipId: "selected",
  });

  assert.deepEqual(states.at(-1), {
    status: "error",
    membershipId: "selected",
    message: "Connection interrupted",
  });

  assert.equal("summary" in states.at(-1)!, false);

  failure = false;

  await occupancy.refresh();

  assert.deepEqual(requested, ["selected", "selected", "selected"]);

  assert.deepEqual(states.at(-1), {
    status: "ready",
    membershipId: "selected",
    summary: summary("selected", 8),
  });
});

test("a newer refresh wins over an older response for the same membership", async () => {
  const old = deferred<PortalBatchSummary>();

  const recent = deferred<PortalBatchSummary>();

  const states: PortalBatchOccupancyState[] = [];

  let request = 0;

  const occupancy = createPortalBatchOccupancy(
    () => {
      return ++request === 1 ? old.promise : recent.promise;
    },
    (state) => {
      states.push(state);
    },
  );

  const first = occupancy.select("same");

  const second = occupancy.refresh();

  recent.resolve(summary("same", 7));

  await second;

  old.reject(new Error("Old connection failure"));

  await first;

  assert.deepEqual(states.at(-1), {
    status: "ready",
    membershipId: "same",
    summary: summary("same", 7),
  });
});

test("clearing or unmounting a membership discards in-flight responses", async () => {
  for (const mode of ["clear", "cancel"] as const) {
    const pending = deferred<PortalBatchSummary>();

    const states: PortalBatchOccupancyState[] = [];

    let requested = 0;

    const occupancy = createPortalBatchOccupancy(
      () => {
        requested++;

        return pending.promise;
      },
      (state) => {
        states.push(state);
      },
    );

    const reading = occupancy.select("old");

    if (mode === "clear") {
      await occupancy.select(null);
    } else {
      occupancy.cancel();
    }

    const before = states.length;

    pending.resolve(summary("old"));

    await reading;

    assert.equal(states.length, before);

    await occupancy.refresh();

    assert.equal(requested, 1);

    assert.deepEqual(states.at(-1), { status: "idle", membershipId: null });
  }
});

test("a mismatched response cannot be rendered as the selected membership", async () => {
  const states: PortalBatchOccupancyState[] = [];

  const occupancy = createPortalBatchOccupancy(
    async () => {
      return summary("wrong");
    },
    (state) => {
      states.push(state);
    },
  );

  await occupancy.select("selected");

  assert.equal(states.at(-1)?.status, "error");

  assert.equal("summary" in states.at(-1)!, false);
});

test("manual activation and legacy overcapacity preserve the actual member count", async () => {
  for (const count of [0, 6, 8, 9]) {
    let ready: PortalBatchSummary | null = null;

    const occupancy = createPortalBatchOccupancy(
      async (membershipId) => {
        return summary(membershipId, count);
      },
      (state) => {
        if (state.status === "ready") {
          ready = state.summary;
        }
      },
    );

    await occupancy.select("selected");

    assert.deepEqual(ready, summary("selected", count));

    assert.equal(
      portalBatchStatus(summary("selected", count).batchStatus),
      "Active",
    );
  }

  assert.equal(portalBatchStatus("PLANNED"), "Forming");

  assert.equal(portalBatchStatus("COMPLETED"), "Completed");

  assert.equal(portalBatchStatus("CANCELLED"), "Cancelled");
});
