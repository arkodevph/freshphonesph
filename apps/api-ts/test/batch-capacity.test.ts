import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BATCH_INTERNAL_PLACEHOLDER_COUNT,
  BATCH_REAL_MEMBER_CAPACITY,
  batchCapacity,
} from "@freshphones/contracts";

test("internal positions never increase real capacity and legacy overcapacity is preserved", () => {
  assert.equal(BATCH_REAL_MEMBER_CAPACITY, 8);

  assert.equal(BATCH_INTERNAL_PLACEHOLDER_COUNT, 4);

  assert.equal(batchCapacity(7).remaining, 1);

  assert.equal(batchCapacity(7).full, false);

  assert.equal(batchCapacity(8).full, true);

  assert.deepEqual(batchCapacity(10), {
    realMembers: 10,
    capacity: 8,
    remaining: 0,
    full: true,
    overCapacity: true,
    internalPlaceholders: 4,
  });
});

test("invalid real-member counts are rejected instead of implying vacancy", () => {
  for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => {
      return batchCapacity(value);
    }, RangeError);
  }
});
