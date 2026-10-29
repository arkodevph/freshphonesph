"use client";

import type { PortalScheduleItem } from "@/lib/api";
import { ArrowRight, Close as X } from "@/components/SolarIcons";
import Link from "next/link";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { type KeyboardEvent } from "react";
import styles from "./payment-schedule.module.css";
import { badgeClass, dueDate, money } from "./schedule-view";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  keepDialogFocus: (event: KeyboardEvent<HTMLDialogElement>) => void;
  setSelectedInstallment: Dispatch<SetStateAction<number | null>>;
  detailTriggerRef: RefObject<HTMLButtonElement | null>;
  selectedItem: PortalScheduleItem;
  selectedState: {
    remaining: number;
    payment: string;
    timing: string;
    isDue: boolean;
  };
};

export default function InstallmentDetailsDialog({
  dialogRef,
  keepDialogFocus,
  setSelectedInstallment,
  detailTriggerRef,
  selectedItem,
  selectedState,
}: Props) {
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-modal="true"
      aria-labelledby="schedule-detail-title"
      aria-describedby="schedule-detail-note"
      onKeyDown={keepDialogFocus}
      onClose={() => {
        setSelectedInstallment(null);

        detailTriggerRef.current?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        ) {
          event.currentTarget.close();
        }
      }}
    >
      <header className={styles.dialogHeader}>
        <div>
          <p>Payment schedule</p>
          <h2 id="schedule-detail-title">
            Installment {selectedItem.sequence_no} details
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close installment details"
          onClick={() => {
            return dialogRef.current?.close();
          }}
        >
          <X aria-hidden="true" />
        </button>
      </header>
      <div className={styles.dialogBody}>
        <div className={styles.dialogDue}>
          <div>
            <span>Due date</span>
            <strong>{dueDate(selectedItem.due_date)}</strong>
            <small
              className={
                selectedState.timing === "Overdue"
                  ? styles.overdue
                  : styles.muted
              }
            >
              {selectedState.timing}
            </small>
          </div>
          <span
            className={`${styles.badge} ${badgeClass(selectedState.payment)}`}
          >
            {selectedState.payment}
          </span>
        </div>
        <dl className={styles.dialogFigures}>
          <div>
            <dt>Installment amount</dt>
            <dd>{money(selectedItem.expected_amount)}</dd>
          </div>
          <div>
            <dt>Finance verified</dt>
            <dd>{money(selectedItem.paid_applied)}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{money(selectedState.remaining)}</dd>
          </div>
        </dl>
        <p id="schedule-detail-note">
          {selectedState.payment === "Paid"
            ? "This installment is fully covered by Finance-verified payments."
            : "Staff-recorded payments do not reduce this amount until Finance verifies them."}
        </p>
      </div>
      <footer className={styles.dialogFooter}>
        <Link
          href="/portal/payments"
          onClick={() => {
            return dialogRef.current?.close();
          }}
        >
          View payment records
          <ArrowRight aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => {
            return dialogRef.current?.close();
          }}
        >
          Close
        </button>
      </footer>
    </dialog>
  );
}
