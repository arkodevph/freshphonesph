import { test } from "node:test";
import assert from "node:assert/strict";
import {
  batchSchema,
  previewInstallments,
  type InstallmentPlan,
} from "@freshphones/contracts";
import { generateSchedule, amountInCents } from "../src/records/schedule";
import { historyChanges } from "../src/records/history";

const plan: InstallmentPlan = {
  contractPrice: "100.00",
  installmentCount: 4,
  cadence: "MONTHLY",
  startDate: "2026-01-01",
  firstDueDate: "2026-01-31",
  monthEnd: true,
};

const dates = (input: InstallmentPlan) => {
  return previewInstallments(input).map((item) => {
    return item.dueDate;
  });
};

test("month-end schedules use actual calendar ends and the chosen date is installment one", () => {
  assert.deepEqual(dates(plan), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
  ]);

  assert.deepEqual(
    dates({ ...plan, startDate: "2028-01-01", firstDueDate: "2028-01-31" }),
    ["2028-01-31", "2028-02-29", "2028-03-31", "2028-04-30"],
  );

  assert.deepEqual(
    dates({ ...plan, startDate: "2100-01-01", firstDueDate: "2100-01-31" }),
    ["2100-01-31", "2100-02-28", "2100-03-31", "2100-04-30"],
  );

  assert.deepEqual(
    dates({
      ...plan,
      startDate: "2026-12-01",
      firstDueDate: "2026-12-31",
      installmentCount: 2,
    }),
    ["2026-12-31", "2027-01-31"],
  );
});

test("monthly day anchors recover after February and distinguish the 28th from month end", () => {
  assert.deepEqual(dates({ ...plan, monthEnd: false }), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
  ]);

  assert.deepEqual(
    dates({
      ...plan,
      firstDueDate: "2026-02-28",
      installmentCount: 2,
      monthEnd: false,
    }),
    ["2026-02-28", "2026-03-28"],
  );

  assert.deepEqual(
    dates({ ...plan, firstDueDate: "2026-02-28", installmentCount: 2 }),
    ["2026-02-28", "2026-03-31"],
  );

  for (const day of [1, 15]) {
    const input = {
      ...plan,
      firstDueDate: `2026-01-${String(day).padStart(2, "0")}`,
      monthEnd: false,
    };

    assert.ok(
      dates(input).every((date) => {
        return Number(date.slice(-2)) === day;
      }),
    );
  }
});

test("Bi-monthly alternates between the 15th and the real month end from either first date", () => {
  assert.deepEqual(
    dates({
      ...plan,
      cadence: "SEMIMONTHLY",
      firstDueDate: "2026-01-15",
      monthEnd: false,
      installmentCount: 6,
    }),
    [
      "2026-01-15",
      "2026-01-31",
      "2026-02-15",
      "2026-02-28",
      "2026-03-15",
      "2026-03-31",
    ],
  );

  assert.deepEqual(
    dates({
      ...plan,
      cadence: "SEMIMONTHLY",
      firstDueDate: "2028-01-31",
      monthEnd: false,
    }),
    ["2028-01-31", "2028-02-15", "2028-02-29", "2028-03-15"],
  );

  assert.deepEqual(
    dates({
      ...plan,
      cadence: "SEMIMONTHLY",
      startDate: "0099-12-01",
      firstDueDate: "0099-12-31",
      monthEnd: false,
      installmentCount: 3,
    }),
    ["0099-12-31", "0100-01-15", "0100-01-31"],
  );
});

test("weekly schedules honor the first due date; legacy plans retain fixed intervals", () => {
  assert.deepEqual(
    dates({
      ...plan,
      cadence: "WEEKLY",
      firstDueDate: "2026-01-03",
      monthEnd: false,
    }),
    ["2026-01-03", "2026-01-10", "2026-01-17", "2026-01-24"],
  );

  assert.deepEqual(
    dates({
      ...plan,
      cadence: "SEMIMONTHLY",
      firstDueDate: null,
      monthEnd: false,
      installmentCount: 3,
    }),
    ["2026-01-16", "2026-01-31", "2026-02-15"],
  );
});

test("preview and server issuance agree exactly, with positive centavos and exact total", () => {
  for (const [amount, count] of [
    ["100.00", 3],
    ["0.10", 6],
    ["9999999999.99", 600],
    ["0.05", 2],
    ["0.07", 2],
  ] as const) {
    for (const cadence of ["MONTHLY", "SEMIMONTHLY", "WEEKLY"] as const) {
      const input = {
        ...plan,
        contractPrice: amount,
        installmentCount: count,
        cadence,
        monthEnd: cadence === "MONTHLY",
      };

      const preview = previewInstallments(input);

      const issued = generateSchedule({
        ...input,
        startDate: new Date(input.startDate),
        firstDueDate: new Date(input.firstDueDate!),
      });

      assert.deepEqual(
        issued.map((item) => {
          return { ...item, dueDate: item.dueDate.toISOString().slice(0, 10) };
        }),
        preview,
      );

      assert.equal(
        preview.reduce((sum, item) => {
          return sum + amountInCents(item.expectedAmount);
        }, 0n),
        amountInCents(amount),
      );

      assert.ok(
        preview.every((item) => {
          return amountInCents(item.expectedAmount) > 0n;
        }),
      );
    }
  }
});

test("invalid calendar dates, plan combinations, limits and out-of-range schedules fail before issuance", () => {
  for (const changes of [
    { firstDueDate: "2026-01-14", cadence: "SEMIMONTHLY", monthEnd: false },
    { firstDueDate: "2026-01-15", monthEnd: true },
    { firstDueDate: "2025-12-31" },
    { firstDueDate: "2026-02-29" },
    { firstDueDate: "0000-01-31" },
    { firstDueDate: "not-a-date" },
    { firstDueDate: null, monthEnd: true },
    { cadence: "WEEKLY", monthEnd: true },
    { installmentCount: 0 },
    { installmentCount: 601 },
    { contractPrice: "0.01", installmentCount: 2 },
    {
      startDate: "9999-12-01",
      firstDueDate: "9999-12-31",
      installmentCount: 2,
    },
  ]) {
    assert.throws(() => {
      previewInstallments({ ...plan, ...changes } as InstallmentPlan);
    });
  }

  assert.equal(
    batchSchema.safeParse({
      ...plan,
      code: "AB-001",
      model: "Test phone",
      status: "PLANNED",
      endDate: "2026-02-28",
    }).success,
    false,
  );

  assert.equal(
    batchSchema.safeParse({
      ...plan,
      code: "AB-001",
      model: "Test phone",
      status: "PLANNED",
      endDate: "2026-04-30",
    }).success,
    true,
  );
});

test("approved history fields include date-only first installment and month-end changes", () => {
  assert.deepEqual(
    historyChanges(
      "batch",
      "batch.updated",
      { firstDueDate: null, monthEnd: false },
      { firstDueDate: "2026-01-31T00:00:00.000Z", monthEnd: true },
    ),
    [
      {
        field: "firstDueDate",
        label: "First installment due date",
        before: null,
        after: "2026-01-31",
      },
      {
        field: "monthEnd",
        label: "Month-end alignment",
        before: "No",
        after: "Yes",
      },
    ],
  );
});
