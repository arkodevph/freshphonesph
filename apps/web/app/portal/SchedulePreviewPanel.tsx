"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { installmentState } from "@/lib/portal-schedule";
import { ArrowDown, ArrowRight, ArrowUp } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import styles from "./payment-schedule.module.css";
import { badgeClass, dueDate, money, State } from "./schedule-view";

type Props = {
  status: "ready" | "error";
  items: PortalScheduleItem[];
  onRetry: () => void;
  dueNow: number;
  completed: number;
  previewItems: PortalScheduleItem[];
  today: string;
  showDetails: (item: PortalScheduleItem, trigger: HTMLButtonElement) => void;
  expandRef: RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  collapseSchedule: () => void;
  setExpanded: Dispatch<SetStateAction<boolean>>;
};

export default function SchedulePreviewPanel({
  status,
  items,
  onRetry,
  dueNow,
  completed,
  previewItems,
  today,
  showDetails,
  expandRef,
  expanded,
  collapseSchedule,
  setExpanded,
}: Props) {
  return (
    <aside className={styles.preview} aria-labelledby="schedule-preview-title">
      <header className={styles.previewHeader}>
        <h2 id="schedule-preview-title">Payment schedule</h2>
        <p>
          {status === "ready"
            ? `Preview · ${items.length} installments`
            : "Preview unavailable"}
        </p>
      </header>
      {status === "error" || !items.length ? (
        <State error={status === "error"} onRetry={onRetry} />
      ) : (
        <>
          <div className={styles.dueNow}>
            <span>Currently due</span>
            <strong>{money(dueNow)}</strong>
            <p>
              Remaining on installments due by today, after Finance
              verification.
            </p>
          </div>
          <div className={styles.completion}>
            <span>
              {completed} of {items.length} installments paid
            </span>
            <div
              role="progressbar"
              aria-label="Fully paid installments"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={items.length}
            >
              <span style={{ width: `${(completed / items.length) * 100}%` }} />
            </div>
          </div>
          <ol className={styles.previewList}>
            {previewItems.map((item) => {
              const state = installmentState(item, today);

              return (
                <li key={item.sequence_no}>
                  <span className={styles.sequence}>{item.sequence_no}</span>
                  <div>
                    <strong>{dueDate(item.due_date)}</strong>
                    <span
                      className={
                        state.timing === "Overdue"
                          ? styles.overdue
                          : styles.muted
                      }
                    >
                      {state.timing}
                    </span>
                    <b>{money(item.expected_amount)}</b>
                    <small>{money(state.remaining)} remaining</small>
                    <span
                      className={`${styles.badge} ${badgeClass(state.payment)}`}
                    >
                      {state.payment}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Preview details for installment ${item.sequence_no}`}
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      return showDetails(item, event.currentTarget);
                    }}
                  >
                    <ArrowRight aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
          <button
            ref={expandRef}
            type="button"
            className={styles.expand}
            aria-expanded={expanded}
            aria-controls={expanded ? "full-payment-schedule" : undefined}
            onClick={() => {
              return expanded ? collapseSchedule() : setExpanded(true);
            }}
          >
            {expanded ? "Hide full schedule" : "View full schedule"}
            {expanded ? (
              <ArrowUp aria-hidden="true" />
            ) : (
              <ArrowDown aria-hidden="true" />
            )}
          </button>
          <p className={styles.previewNote}>
            See all {items.length} installments, verified allocations, and
            remaining amounts.
          </p>
        </>
      )}
    </aside>
  );
}
