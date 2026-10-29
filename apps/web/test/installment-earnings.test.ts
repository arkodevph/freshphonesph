import { test } from "node:test";
import assert from "node:assert/strict";
import {
  earningsPeriods,
  installmentEarningsQuerySchema,
} from "@freshphones/contracts";
import {
  changeEarningsFrequency,
  defaultEarningsFilters,
  earningsFilterQuery,
} from "../lib/installment-earnings";

test("calendar periods cover the entire year once, including leap days and century boundaries", () => {
  for (const year of [1, 99, 1900, 2000, 2024, 2026, 2100, 9999]) {
    for (const frequency of [
      "MONTHLY",
      "TWICE_MONTHLY",
      "EVERY_TWO_MONTHS",
    ] as const) {
      const periods = earningsPeriods(year, frequency);

      assert.equal(
        periods[0].dateFrom,
        `${String(year).padStart(4, "0")}-01-01`,
      );

      assert.equal(
        periods.at(-1)!.dateTo,
        `${String(year).padStart(4, "0")}-12-31`,
      );

      let days = 0;

      for (const [index, period] of periods.entries()) {
        assert.ok(period.dateFrom <= period.dateTo);

        const from = new Date(`${period.dateFrom}T00:00:00Z`);

        const to = new Date(`${period.dateTo}T00:00:00Z`);

        days += (to.getTime() - from.getTime()) / 86400000 + 1;

        if (index > 0) {
          const previous = new Date(`${periods[index - 1].dateTo}T00:00:00Z`);

          previous.setUTCDate(previous.getUTCDate() + 1);

          assert.equal(from.getTime(), previous.getTime());
        }
      }

      assert.equal(
        days,
        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365,
      );
    }
  }

  assert.deepEqual(earningsPeriods(2024, "TWICE_MONTHLY")[3], {
    period: 4,
    dateFrom: "2024-02-16",
    dateTo: "2024-02-29",
    label: "February 16–29",
  });

  assert.equal(
    earningsPeriods(2100, "EVERY_TWO_MONTHS")[0].dateTo,
    "2100-02-28",
  );
});

test("filter defaults use Manila and frequency changes preserve the selected calendar month", () => {
  const filters = defaultEarningsFilters(new Date("2026-12-31T16:00:00Z"));

  assert.equal(filters.year, "2027");

  assert.equal(filters.period, "1");

  const october = { ...filters, period: "10" };

  const twice = changeEarningsFrequency(october, "TWICE_MONTHLY");

  assert.equal(twice.period, "19");

  const pairs = changeEarningsFrequency(twice, "EVERY_TWO_MONTHS");

  assert.equal(pairs.period, "5");

  assert.equal(changeEarningsFrequency(pairs, "MONTHLY").period, "9");

  assert.equal(earningsFilterQuery({ ...filters, year: "" }).params, null);
});

test("invalid period, year, scope and unknown query fields cannot run earnings calculations", () => {
  for (const changes of [
    { year: 0 },
    { year: 10000 },
    { year: 2026.5 },
    { year: "2026junk" },
    { frequency: "MONTHLY", period: 13 },
    { frequency: "TWICE_MONTHLY", period: 25 },
    { frequency: "EVERY_TWO_MONTHS", period: 7 },
    { period: 0 },
    { batchId: "invalid" },
    { groupBy: "private_contacts" },
    { page: 0 },
    { status: "VERIFIED" },
  ]) {
    assert.equal(
      installmentEarningsQuerySchema.safeParse({ year: 2026, ...changes })
        .success,
      false,
    );
  }
});
