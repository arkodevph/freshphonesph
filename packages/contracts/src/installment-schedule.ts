export type InstallmentCadence = "WEEKLY" | "SEMIMONTHLY" | "MONTHLY";

export type InstallmentPlan = {
  contractPrice: string;
  installmentCount: number;
  cadence: InstallmentCadence;
  startDate: string;
  firstDueDate?: string | null;
  monthEnd?: boolean;
};

export function daysInMonth(year: number, month: number) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
}

export function calendarDate(year: number, month: number, day: number) {
  if (
    ![year, month, day].every(Number.isInteger) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    throw new RangeError("Schedule exceeds the supported date range.");
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Choose a valid schedule date.");
  }

  const [year, month, day] = value.split("-").map(Number);

  calendarDate(year, month, day);

  return { year, month, day };
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return calendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function monthAt(year: number, month: number, offset: number) {
  const index = (year - 1) * 12 + month - 1 + offset;

  return { year: Math.floor(index / 12) + 1, month: (index % 12) + 1 };
}

/** Single source for the staff preview and server-issued installments. */
export function previewInstallments(plan: InstallmentPlan) {
  parseDate(plan.startDate);

  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(plan.contractPrice)) {
    throw new RangeError(
      "Enter a positive contract price with at most two decimal places.",
    );
  }

  if (
    !Number.isInteger(plan.installmentCount) ||
    plan.installmentCount < 1 ||
    plan.installmentCount > 600
  ) {
    throw new RangeError("Choose 1–600 installments.");
  }

  const intervals = { WEEKLY: 7, SEMIMONTHLY: 15, MONTHLY: 30 };

  if (!Object.hasOwn(intervals, plan.cadence)) {
    throw new RangeError("Choose a valid installment frequency.");
  }

  const [whole, fraction = ""] = plan.contractPrice.split(".");

  const total = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

  const count = BigInt(plan.installmentCount);

  if (total < count) {
    throw new RangeError("Each installment must be at least one centavo.");
  }

  const first = plan.firstDueDate ? parseDate(plan.firstDueDate) : null;

  if (plan.firstDueDate && plan.firstDueDate < plan.startDate) {
    throw new RangeError(
      "The first due date must be on or after the batch start date.",
    );
  }

  if (plan.monthEnd && (!first || plan.cadence !== "MONTHLY")) {
    throw new RangeError(
      "Month-end alignment requires a monthly plan and a first due date.",
    );
  }

  if (
    first &&
    plan.monthEnd &&
    first.day !== daysInMonth(first.year, first.month)
  ) {
    throw new RangeError(
      "Choose the last day of the month as the first due date.",
    );
  }

  if (
    first &&
    plan.cadence === "SEMIMONTHLY" &&
    first.day !== 15 &&
    first.day !== daysInMonth(first.year, first.month)
  ) {
    throw new RangeError(
      "Bi-monthly installments must start on the 15th or at month end.",
    );
  }

  const quotient = total / count;

  const remainder = total % count;

  const roundUp =
    remainder * 2n > count ||
    (remainder * 2n === count && quotient % 2n === 1n);

  const rounded = quotient + (roundUp ? 1n : 0n);

  const regular = total - rounded * (count - 1n) > 0n ? rounded : quotient;

  let biDate = first;

  return Array.from({ length: plan.installmentCount }, (_, index) => {
    let dueDate: string;

    if (!first) {
      // Existing batches retain their original fixed 7/15/30-day policy.
      dueDate = addDays(plan.startDate, intervals[plan.cadence] * (index + 1));
    } else if (plan.cadence === "WEEKLY") {
      dueDate = addDays(plan.firstDueDate!, index * 7);
    } else if (plan.cadence === "MONTHLY") {
      const month = monthAt(first.year, first.month, index);

      const last = daysInMonth(month.year, month.month);

      dueDate = calendarDate(
        month.year,
        month.month,
        plan.monthEnd ? last : Math.min(first.day, last),
      );
    } else {
      if (index > 0) {
        if (biDate!.day === 15) {
          biDate = {
            ...biDate!,
            day: daysInMonth(biDate!.year, biDate!.month),
          };
        } else {
          biDate = { ...monthAt(biDate!.year, biDate!.month, 1), day: 15 };
        }
      }

      dueDate = calendarDate(biDate!.year, biDate!.month, biDate!.day);
    }

    const cents =
      index + 1 === plan.installmentCount
        ? total - regular * (count - 1n)
        : regular;

    return {
      sequenceNo: index + 1,
      dueDate,
      expectedAmount: `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`,
    };
  });
}
