"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { installmentState } from "@/lib/portal-schedule";
import { ArrowRight, ArrowUp } from "@/components/SolarIcons";
import Link from "next/link";
import type { RefObject } from "react";
import styles from "./payment-schedule.module.css";
import { badgeClass, dueDate, money, State } from "./schedule-view";

type Props = {
  logsRef: RefObject<HTMLElement | null>;
  collapseSchedule: () => void;
  status: "ready" | "error";
  onRetry: () => void;
  items: PortalScheduleItem[];
  today: string;
  showDetails: (item: PortalScheduleItem, trigger: HTMLButtonElement) => void;
};

export default function PaymentScheduleLogs({
  logsRef,
  collapseSchedule,
  status,
  onRetry,
  items,
  today,
  showDetails,
}: Props) {
  return (
    <section
      ref={logsRef}
      id="full-payment-schedule"
      className={styles.logs}
      tabIndex={-1}
      aria-labelledby="full-payment-schedule-title"
    >
      <header className={styles.logsHeader}>
        <div>
          <p>All installments</p>
          <h2 id="full-payment-schedule-title">Full payment schedule</h2>
        </div>
        <button type="button" onClick={collapseSchedule}>
          Back to calendar
          <ArrowUp aria-hidden="true" />
        </button>
      </header>
      {status === "error" ? (
        <State error onRetry={onRetry} />
      ) : (
        <>
          <ol className={styles.installmentList} aria-label="All installments">
            {items.map((item) => {
              const state = installmentState(item, today);
              return (
                <li
                  key={item.sequence_no}
                  data-schedule-installment={item.sequence_no}
                  tabIndex={-1}
                >
                  <button
                    type="button"
                    aria-label={`Details for installment ${item.sequence_no}, ${dueDate(item.due_date)}, ${money(state.remaining)} remaining, ${state.payment}, ${state.timing}`}
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      showDetails(item, event.currentTarget);
                    }}
                  >
                    <span>
                      <strong>Installment {item.sequence_no}</strong>
                      <small>{dueDate(item.due_date)}</small>
                    </span>
                    <span>
                      <strong>{money(state.remaining)}</strong>
                      <small>Remaining</small>
                    </span>
                    <span
                      className={`${styles.badge} ${badgeClass(state.payment)}`}
                    >
                      {state.payment}
                    </span>
                    <small
                      className={
                        state.timing === "Overdue"
                          ? styles.overdue
                          : styles.muted
                      }
                    >
                      {state.timing}
                    </small>
                  </button>
                </li>
              );
            })}
          </ol>
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Installment schedule table"
            tabIndex={0}
          >
            <table>
              <caption>
                All {items.length} installments. Paid amounts reflect
                Finance-verified allocations.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Installment</th>
                  <th scope="col">Due date</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col">Verified paid</th>
                  <th scope="col">Remaining</th>
                  <th scope="col">Payment status</th>
                  <th scope="col">Timing</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const state = installmentState(item, today);

                  return (
                    <tr
                      key={item.sequence_no}
                      id={`installment-${item.sequence_no}`}
                      data-schedule-installment={item.sequence_no}
                      tabIndex={-1}
                    >
                      <th scope="row">Installment {item.sequence_no}</th>
                      <td>{dueDate(item.due_date)}</td>
                      <td>{money(item.expected_amount)}</td>
                      <td>{money(item.paid_applied)}</td>
                      <td>{money(state.remaining)}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${badgeClass(state.payment)}`}
                        >
                          {state.payment}
                        </span>
                      </td>
                      <td
                        className={
                          state.timing === "Overdue"
                            ? styles.overdue
                            : styles.muted
                        }
                      >
                        {state.timing}
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label={`Details for installment ${item.sequence_no}`}
                          aria-haspopup="dialog"
                          onClick={(event) => {
                            return showDetails(item, event.currentTarget);
                          }}
                        >
                          Details
                          <ArrowRight aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.tableNote}>
            For individual payment transactions and confirmations,{" "}
            <Link href="/portal/payments">
              view verified payments
              <ArrowRight aria-hidden="true" />
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}
