import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyAmountScale } from "../lib/monthly-amount-chart";

test("monthly comparison uses one currency scale, not separate normalized bars", () => {
  const scale = monthlyAmountScale([78750, 12600]);

  assert.equal(scale.min, 0);

  assert.equal(scale.max, 80000);

  assert.equal(scale.bar(78750).width / scale.bar(12600).width, 6.25);
});

test("negative corrections extend left of zero and retain a common origin", () => {
  const scale = monthlyAmountScale([-200, 100]);

  assert.equal(scale.bar(-200).left, 0);

  assert.equal(scale.bar(-200).left + scale.bar(-200).width, scale.zero);

  assert.equal(scale.bar(100).left, scale.zero);
});

test("empty and zero amounts never create NaN or invented bar lengths", () => {
  for (const values of [[], [0, 0], [NaN, Infinity]]) {
    const scale = monthlyAmountScale(values);

    assert.deepEqual(scale.bar(0), { left: 0, width: 0 });

    assert.deepEqual(scale.bar(NaN), { left: 0, width: 0 });

    assert.deepEqual(scale.ticks, [0]);
  }
});
