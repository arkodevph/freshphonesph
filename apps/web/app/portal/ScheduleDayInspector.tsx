"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { installmentState } from "@/lib/portal-schedule";
import { ArrowRight } from "@/components/SolarIcons";
import styles from "./payment-schedule.module.css";
import {
  badgeClass,
  dateObject,
  fullDate,
  money,
  State,
} from "./schedule-view";

type Props = {
  status: "ready" | "error";
  onRetry: () => void;
  selectedDate: string;
  selectedDayItems: PortalScheduleItem[];
  today: string;
  dueNow: number;
  completed: number;
  total: number;
  showDetails: (item: PortalScheduleItem, trigger: HTMLButtonElement) => void;
};

export default function ScheduleDayInspector({
  status,
  onRetry,
  selectedDate,
  selectedDayItems,
  today,
  dueNow,
  completed,
  total,
  showDetails,
}: Props) {
  return (
    <aside
      className={styles.preview}
      aria-label="Schedule overview and selected day"
    >
      <div className={styles.dueNow}>
        <span>Currently due</span>
        <strong>{status === "ready" ? money(dueNow) : "—"}</strong>
        <p>
          Remaining on installments due by today. Only Finance-verified payments
          reduce this amount.
        </p>
      </div>
      {status === "ready" && total > 0 && (
        <div className={styles.completion}>
          <span>
            {completed} of {total} installments paid
          </span>
          <div
            role="progressbar"
            aria-label="Fully paid installments"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <span style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
      )}
      {status === "error" ? (
        <State error onRetry={onRetry} />
      ) : (
        <section
          className={styles.agenda}
          aria-labelledby="schedule-day-title"
          aria-live="polite"
        >
          <h3 id="schedule-day-title">
            {fullDate.format(dateObject(selectedDate))}
          </h3>
          {!selectedDayItems.length ? (
            <p>No installments scheduled for this day.</p>
          ) : (
            <ul>
              {selectedDayItems.map((item) => {
                const state = installmentState(item, today);

                return (
                  <li key={item.sequence_no}>
                    <div className={styles.agendaHeading}>
                      <strong>Installment {item.sequence_no}</strong>
                      <span
                        className={`${styles.badge} ${badgeClass(state.payment)}`}
                      >
                        {state.payment}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>Scheduled</dt>
                        <dd>{money(item.expected_amount)}</dd>
                      </div>
                      <div>
                        <dt>Verified</dt>
                        <dd>{money(item.paid_applied)}</dd>
                      </div>
                      <div>
                        <dt>Remaining</dt>
                        <dd>{money(state.remaining)}</dd>
                      </div>
                    </dl>
                    <div className={styles.agendaActions}>
                      <span
                        className={
                          state.timing === "Overdue"
                            ? styles.overdue
                            : styles.muted
                        }
                      >
                        {state.timing}
                      </span>
                      <button
                        type="button"
                        aria-label={`Calendar details for installment ${item.sequence_no}`}
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          return showDetails(item, event.currentTarget);
                        }}
                      >
                        View details
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </aside>
  );
}
