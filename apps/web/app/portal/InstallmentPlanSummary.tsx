"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { calendarDate } from "@/lib/portal-membership-calendar";
import { ArrowDown, ClockCircle as Clock } from "@/components/SolarIcons";
import type { RefObject } from "react";
import styles from "./payment-schedule.module.css";
import { badgeClass, dueDate, money, State } from "./schedule-view";

type Props = {
  status: "ready" | "error";
  items: PortalScheduleItem[];
  featured: PortalScheduleItem | undefined;
  featuredState: {
    remaining: number;
    payment: string;
    timing: string;
    isDue: boolean;
  } | null;
  onRetry: () => void;
  selectDay: (day: string, focus?: boolean) => void;
  calendarRef: RefObject<HTMLElement | null>;
  onViewCalendar: () => void;
};

export default function InstallmentPlanSummary({
  status,
  items,
  featured,
  featuredState,
  onRetry,
  selectDay,
  calendarRef,
  onViewCalendar,
}: Props) {
  return (
    <section className={styles.plan} aria-labelledby="installment-plan-title">
      <header className={styles.heading}>
        <span className={styles.icon}>
          <Clock aria-hidden="true" />
        </span>
        <div>
          <p>Your plan</p>
          <h2 id="installment-plan-title">Next installment</h2>
        </div>
        {status === "ready" && (
          <span className={styles.count}>{items.length} installments</span>
        )}
      </header>
      {status === "error" || !featured || !featuredState ? (
        <State error={status === "error"} onRetry={onRetry} />
      ) : (
        <>
          <div className={styles.planMain}>
            <div className={styles.planBalance}>
              <p>
                {featuredState.payment === "Paid"
                  ? "All installments settled"
                  : `Installment ${featured.sequence_no} remaining`}
              </p>
              <strong>{money(featuredState.remaining)}</strong>
            </div>
            <div className={styles.planDue}>
              <span>Due date</span>
              <strong>{dueDate(featured.due_date)}</strong>
            </div>
            <div className={styles.planStatus}>
              <span
                className={`${styles.badge} ${badgeClass(featuredState.payment)}`}
              >
                {featuredState.payment}
              </span>
              <span
                className={
                  featuredState.timing === "Overdue"
                    ? styles.overdue
                    : styles.muted
                }
              >
                {featuredState.timing}
              </span>
            </div>
          </div>
          <div className={styles.planFooter}>
            <button
              type="button"
              onClick={() => {
                const day = calendarDate(featured.due_date);

                if (day) {
                  selectDay(day);
                }

                onViewCalendar();

                window.requestAnimationFrame(() => {
                  calendarRef.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-schedule-date="${day}"]`,
                    )
                    ?.focus();
                });
              }}
            >
              View in calendar
              <ArrowDown aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
