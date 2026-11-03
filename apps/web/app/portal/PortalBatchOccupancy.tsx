"use client";

import { useEffect, useId, useState } from "react";
import { UsersThree } from "@phosphor-icons/react";
import { getPortalBatchSummary } from "@/lib/api";
import {
  createPortalBatchOccupancy,
  portalBatchStatus,
  type PortalBatchOccupancyState,
} from "@/lib/portal-batch-occupancy";
import { useLiveRecords } from "@/lib/useLiveRecords";
import styles from "./portal-batch-occupancy.module.css";

export default function PortalBatchOccupancy({
  membershipId,
  batchNumber,
}: {
  membershipId: string | null;
  batchNumber: string;
}) {
  const headingId = useId();

  const [state, setState] = useState<PortalBatchOccupancyState>({
    status: "idle",
    membershipId: null,
  });

  const [occupancy] = useState(() => {
    return createPortalBatchOccupancy(getPortalBatchSummary, setState);
  });

  useEffect(() => {
    void occupancy.select(membershipId);

    return () => {
      occupancy.cancel();
    };
  }, [membershipId, occupancy]);

  useLiveRecords(() => {
    void occupancy.refresh();
  }, Boolean(membershipId));

  const current = state.membershipId === membershipId ? state : null;

  const summary = current?.status === "ready" ? current.summary : null;

  const enrollmentClosed =
    summary?.batchStatus === "COMPLETED" ||
    summary?.batchStatus === "CANCELLED";

  return (
    <section
      className={styles.panel}
      aria-labelledby={headingId}
      aria-busy={
        Boolean(membershipId) && (!current || current.status === "loading")
      }
    >
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.icon}>
            <UsersThree weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h2 id={headingId}>Batch participation</h2>
            <p>Batch {summary?.batchNumber ?? batchNumber}</p>
          </div>
        </div>
        {summary && (
          <span className={styles.badge}>
            {portalBatchStatus(summary.batchStatus)}
          </span>
        )}
      </header>
      {!membershipId ? (
        <p className={styles.message}>Select a membership to view its batch.</p>
      ) : !current ||
        current.status === "loading" ||
        current.status === "idle" ? (
        <p className={styles.message} role="status">
          Loading batch participation…
        </p>
      ) : current.status === "error" ? (
        <div className={styles.error}>
          <p role="alert">{current.message}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              void occupancy.refresh();
            }}
          >
            Retry batch details
          </button>
        </div>
      ) : summary ? (
        <div className={styles.body}>
          <p className={styles.count}>
            <strong>{summary.approvedMembers}</strong>
            <span>of {summary.capacity} members enrolled</span>
          </p>
          <p className={styles.availability}>
            <strong>
              {summary.isFull
                ? "Batch full"
                : enrollmentClosed
                  ? "Enrollment closed"
                  : "Positions available"}
            </strong>
            <span>
              {summary.approvedMembers > summary.capacity
                ? `This existing batch has ${summary.approvedMembers} enrolled members against a capacity of ${summary.capacity}.`
                : summary.isFull
                  ? `All ${summary.capacity} member positions are filled.`
                  : enrollmentClosed
                    ? `${summary.remaining} member ${summary.remaining === 1 ? "position is" : "positions are"} unfilled.`
                    : `${summary.remaining} member ${summary.remaining === 1 ? "position remains" : "positions remain"} open.`}
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
