"use client";

import { calendarDate, daysInMonth } from "@freshphones/contracts";
import {
  nextInstallmentDate,
  type BatchScheduleValues,
} from "@/lib/batch-schedule";
import { Field, inputCls } from "./FormField";

export function BatchScheduleFields({
  value,
  onChange,
}: {
  value: BatchScheduleValues;
  onChange: (change: Partial<BatchScheduleValues>) => void;
}) {
  function shortcut(day: 1 | 15 | "end") {
    onChange({
      first_due_date: nextInstallmentDate(value.start_date, day),
      month_end: value.cadence === "monthly" && day === "end",
    });
  }

  return (
    <>
      <Field label="Installment frequency">
        <select
          className={inputCls}
          value={value.cadence}
          onChange={(event) => {
            const cadence = event.target.value;

            let first = nextInstallmentDate(
              value.start_date,
              cadence === "semimonthly" ? "bi" : "end",
            );

            if (cadence === "weekly" && value.start_date) {
              const date = new Date(`${value.start_date}T00:00:00Z`);

              date.setUTCDate(date.getUTCDate() + 7);

              try {
                first = calendarDate(
                  date.getUTCFullYear(),
                  date.getUTCMonth() + 1,
                  date.getUTCDate(),
                );
              } catch {
                first = "";
              }
            }

            onChange({
              cadence,
              first_due_date: first,
              month_end: cadence === "monthly",
            });
          }}
        >
          <option value="monthly">Monthly</option>
          <option value="semimonthly">Bi-monthly — 15th and month end</option>
          <option value="weekly">Weekly</option>
        </select>
      </Field>
      <Field label="First installment due date">
        <input
          className={inputCls}
          type="date"
          required
          min={value.start_date}
          max="9999-12-31"
          value={value.first_due_date}
          onChange={(event) => {
            const first = event.target.value;

            const [year, month, day] = first.split("-").map(Number);

            onChange({
              first_due_date: first,
              month_end:
                value.cadence === "monthly" && day === daysInMonth(year, month),
            });
          }}
        />
      </Field>
      {value.cadence === "monthly" && (
        <Field label="Monthly alignment">
          <select
            className={inputCls}
            value={value.month_end ? "end" : "day"}
            onChange={(event) => {
              const monthEnd = event.target.value === "end";

              onChange({
                month_end: monthEnd,
                ...(monthEnd
                  ? {
                      first_due_date: nextInstallmentDate(
                        value.first_due_date || value.start_date,
                        "end",
                      ),
                    }
                  : {}),
              });
            }}
          >
            <option value="end">Last day of every month</option>
            <option value="day">Same day of every month</option>
          </select>
        </Field>
      )}
      <div className="col-span-full flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        {value.cadence !== "weekly" && <span>Date shortcuts:</span>}
        {value.cadence === "monthly" && (
          <button
            type="button"
            className="rounded-xl border border-white/70 px-3 py-2 font-600 text-blue-ink"
            onClick={() => {
              shortcut(1);
            }}
          >
            1st of month
          </button>
        )}
        {value.cadence !== "weekly" && (
          <>
            <button
              type="button"
              className="rounded-xl border border-white/70 px-3 py-2 font-600 text-blue-ink"
              onClick={() => {
                shortcut(15);
              }}
            >
              15th of month
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/70 px-3 py-2 font-600 text-blue-ink"
              onClick={() => {
                shortcut("end");
              }}
            >
              Month end
            </button>
          </>
        )}
        <span>
          The chosen date is installment 1. Review the dates below before
          creating the batch.
        </span>
      </div>
    </>
  );
}
