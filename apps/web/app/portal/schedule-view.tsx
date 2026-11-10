"use client";

import { pesoFormat as moneyFormat } from "@/lib/currency";
import { calendarDate } from "@/lib/portal-membership-calendar";
import styles from "./payment-schedule.module.css";

export const shortDate = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const fullDate = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const monthFormat = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const dateObject = (day: string) => {
  return new Date(`${day}T00:00:00Z`);
};

export const money = (amount: number | string) => {
  return moneyFormat.format(Number(amount));
};

export const dueDate = (value: string) => {
  return calendarDate(value)
    ? shortDate.format(dateObject(calendarDate(value)!))
    : "Not recorded";
};

export const badgeClass = (payment: string) => {
  return payment === "Paid"
    ? styles.paid
    : payment === "Partially paid"
      ? styles.partial
      : styles.unpaid;
};

export function State({
  error,
  onRetry,
}: {
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <div className={styles.empty} role={error ? "alert" : undefined}>
      <p>
        {error
          ? "Could not load your payment schedule."
          : "Your schedule has not been issued yet. Please contact Records."}
      </p>
      {error && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function PaymentScheduleSkeleton() {
  return (
    <div
      className={`${styles.workspace} ${styles.skeleton}`}
      aria-hidden="true"
    >
      <div className={`${styles.plan} ${styles.skeletonPlan}`} />
      <div className={styles.viewToolbar}>
        <div className={styles.skeletonBar} />
      </div>
      <div className={styles.layout}>
        <div className={`${styles.calendar} ${styles.skeletonCalendar}`} />
        <div className={`${styles.preview} ${styles.skeletonPreview}`} />
      </div>
    </div>
  );
}

export { pesoFormat as moneyFormat } from "@/lib/currency";
