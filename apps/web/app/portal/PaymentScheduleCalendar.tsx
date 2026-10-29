"use client";

import type { PortalScheduleItem } from "@/lib/api";
import {
  calendarDate,
  moveCalendarMonth,
} from "@/lib/portal-membership-calendar";
import { installmentState } from "@/lib/portal-schedule";
import {
  AltArrowLeft as CaretLeft,
  AltArrowRight as CaretRight,
} from "@/components/SolarIcons";
import type { RefObject } from "react";
import { type KeyboardEvent } from "react";
import styles from "./payment-schedule.module.css";
import {
  badgeClass,
  dateObject,
  fullDate,
  money,
  monthFormat,
  State,
} from "./schedule-view";

type Props = {
  calendarRef: RefObject<HTMLElement | null>;
  status: "ready" | "error";
  onRetry: () => void;
  items: PortalScheduleItem[];
  selectDay: (day: string, focus?: boolean) => void;
  selectedDate: string;
  today: string;
  monthDays: string[];
  month: string;
  navigateDay: (event: KeyboardEvent<HTMLButtonElement>, day: string) => void;
};

export default function PaymentScheduleCalendar({
  calendarRef,
  status,
  onRetry,
  items,
  selectDay,
  selectedDate,
  today,
  monthDays,
  month,
  navigateDay,
}: Props) {
  return (
    <section
      ref={calendarRef}
      className={styles.calendar}
      aria-labelledby="payment-calendar-title"
    >
      <h2 id="payment-calendar-title" className={styles.srOnly}>
        Payment calendar
      </h2>
      {status === "error" ? (
        <State error onRetry={onRetry} />
      ) : (
        <>
          {!items.length && (
            <p className={styles.emptyNotice}>
              Due dates will appear here when Records issues your schedule.
            </p>
          )}
          <div className={styles.monthNav}>
            <div>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => {
                  return selectDay(moveCalendarMonth(selectedDate, -1));
                }}
              >
                <CaretLeft aria-hidden="true" />
              </button>
              <h3 aria-live="polite">
                {monthFormat.format(dateObject(selectedDate))}
              </h3>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => {
                  return selectDay(moveCalendarMonth(selectedDate, 1));
                }}
              >
                <CaretRight aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                return selectDay(today);
              }}
            >
              Today
            </button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => {
              return <span key={day}>{day}</span>;
            })}
          </div>
          <div
            className={styles.days}
            role="group"
            aria-label={`${monthFormat.format(dateObject(selectedDate))} payment calendar days`}
          >
            {monthDays.map((day) => {
              const dayItems = items.filter((item) => {
                return calendarDate(item.due_date) === day;
              });

              return (
                <button
                  key={day}
                  type="button"
                  data-schedule-date={day}
                  className={`${day.slice(0, 7) !== month ? styles.outside : ""} ${day === selectedDate ? styles.selectedDay : ""} ${day === today ? styles.today : ""}`}
                  tabIndex={day === selectedDate ? 0 : -1}
                  aria-pressed={day === selectedDate}
                  aria-current={day === today ? "date" : undefined}
                  aria-label={`${fullDate.format(dateObject(day))}${
                    dayItems.length
                      ? `: ${dayItems
                          .map((item) => {
                            const state = installmentState(item, today);

                            return `Installment ${item.sequence_no}, ${money(item.expected_amount)} scheduled, ${money(state.remaining)} remaining, ${state.payment}, ${state.timing}`;
                          })
                          .join("; ")}`
                      : ""
                  }`}
                  onClick={() => {
                    return selectDay(day, true);
                  }}
                  onKeyDown={(event) => {
                    return navigateDay(event, day);
                  }}
                >
                  <span className={styles.dayNumber}>
                    {Number(day.slice(8))}
                  </span>
                  <span className={styles.dayEvents}>
                    {dayItems.slice(0, 2).map((item) => {
                      const state = installmentState(item, today);

                      return (
                        <span
                          key={item.sequence_no}
                          className={`${styles.dayEvent} ${badgeClass(state.payment)}`}
                        >
                          <span>#{item.sequence_no}</span>
                        </span>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <span className={styles.moreEvents}>
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.legend}>
            <span>
              <i className={styles.unpaid} />
              Unpaid
            </span>
            <span>
              <i className={styles.partial} />
              Partially paid
            </span>
            <span>
              <i className={styles.paid} />
              Paid
            </span>
          </div>
        </>
      )}
    </section>
  );
}
