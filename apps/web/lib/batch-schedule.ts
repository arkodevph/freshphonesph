import {
  calendarDate,
  daysInMonth,
  type InstallmentPlan,
} from "@freshphones/contracts";
import { today } from "./date";

export type BatchScheduleValues = {
  start_date: string;
  cadence: string;
  first_due_date: string;
  month_end: boolean;
};

export function nextInstallmentDate(start: string, day: 1 | 15 | "end" | "bi") {
  try {
    let [year, month, date] = start.split("-").map(Number);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(date)
    ) {
      return "";
    }

    calendarDate(year, month, date);

    if (day === "bi") {
      return calendarDate(
        year,
        month,
        date <= 15 ? 15 : daysInMonth(year, month),
      );
    }

    if (day === "end") {
      return calendarDate(year, month, daysInMonth(year, month));
    }

    if (date > day) {
      month++;

      if (month === 13) {
        year++;

        month = 1;
      }
    }

    return calendarDate(year, month, day);
  } catch {
    return "";
  }
}

export function defaultBatchForm() {
  const start = today();

  return {
    agent_id: "",
    unit_model: "",
    contract_price: "",
    num_installments: "6",
    cadence: "monthly",
    status: "active",
    start_date: start,
    first_due_date: nextInstallmentDate(start, "end"),
    month_end: true,
  };
}

export function batchSchedulePlan(
  value: BatchScheduleValues & {
    contract_price: string;
    num_installments: string | number;
  },
): InstallmentPlan {
  return {
    contractPrice: value.contract_price,
    installmentCount: Number(value.num_installments),
    cadence: value.cadence.toUpperCase() as InstallmentPlan["cadence"],
    startDate: value.start_date,
    firstDueDate: value.first_due_date || null,
    monthEnd: value.month_end,
  };
}
