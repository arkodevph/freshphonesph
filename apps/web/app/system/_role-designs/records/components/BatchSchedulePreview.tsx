"use client";

import { useId, useState } from "react";
import {
  previewInstallments,
  type InstallmentPlan,
} from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import styles from "@/app/system/_role-designs/records/components/batch-schedule-preview.module.css";

const dateLabel = (value: string) => {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
};

export function BatchSchedulePreview({
  plan,
  requireFirstDate = false,
}: {
  plan: InstallmentPlan;
  requireFirstDate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const title = useId();

  let items: ReturnType<typeof previewInstallments>;

  try {
    if (requireFirstDate && !plan.firstDueDate) {
      throw new Error("Choose the first installment due date.");
    }

    items = previewInstallments(plan);
  } catch (error) {
    return (
      <section className={styles.preview} aria-labelledby={title}>
        <h3 id={title}>Installment schedule preview</h3>
        <p role={plan.contractPrice ? "alert" : "status"}>
          {plan.contractPrice
            ? error instanceof Error
              ? error.message
              : "Review the payment terms."
            : "Enter the price, installment count and dates to preview the schedule."}
        </p>
      </section>
    );
  }

  const rows = expanded ? items : items.slice(0, 6);

  return (
    <section className={styles.preview} aria-labelledby={title}>
      <h3 id={title}>Installment schedule preview</h3>
      <p>
        {plan.firstDueDate
          ? "Calendar schedule"
          : "Existing fixed-interval schedule"}{" "}
        · {items.length} installments · Total {formatPeso(plan.contractPrice)}
      </p>
      <p>
        First due {dateLabel(items[0].dueDate)} · Last due{" "}
        {dateLabel(items[items.length - 1].dueDate)}
      </p>
      <div
        className={styles.table}
        role="region"
        aria-label="Installment dates and amounts"
        tabIndex={0}
      >
        <table>
          <caption>Expected installment dates and amounts</caption>
          <thead>
            <tr>
              <th scope="col">Installment</th>
              <th scope="col">Due date</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              return (
                <tr key={item.sequenceNo}>
                  <th scope="row">{item.sequenceNo}</th>
                  <td>{dateLabel(item.dueDate)}</td>
                  <td>{formatPeso(item.expectedAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length > 6 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          {expanded
            ? "Show first 6 installments"
            : `Show all ${items.length} installments`}
        </button>
      )}
      <p>
        Any centavo rounding is included in the final installment. This preview
        does not record a payment.
      </p>
    </section>
  );
}
