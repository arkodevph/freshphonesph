"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { calendarDate } from "@/lib/portal-membership-calendar";
import { ArrowDown, Clock } from "@phosphor-icons/react";
import type { RefObject } from "react";
import PortalBannerArt from "./PortalBannerArt";
import styles from "./payment-schedule.module.css";
import bannerStyles from "./portal-banner.module.css";
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
};

export default function InstallmentPlanSummary({
  status,
  items,
  featured,
  featuredState,
  onRetry,
  selectDay,
  calendarRef,
}: Props) {
  return (
    <section
      className={`${styles.plan} ${bannerStyles.banner} ${bannerStyles.night}`}
      aria-labelledby="installment-plan-title"
    >
      <PortalBannerArt variant="plan" />
      <header className={styles.heading}>
        <span className={styles.icon}>
          <Clock weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <p>Your plan</p>
          <h2 id="installment-plan-title">Your installment plan</h2>
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
            <dl>
              <div>
                <dt>Installment amount</dt>
                <dd>{money(featured.expected_amount)}</dd>
              </div>
              <div>
                <dt>Finance verified</dt>
                <dd>{money(featured.paid_applied)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                const day = calendarDate(featured.due_date);

                if (day) {
                  selectDay(day);
                }
                calendarRef.current?.scrollIntoView({ block: "start" });
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
