"use client";

import WorkspaceDetails from "@/app/system/_role-designs/hr_payroll/components/WorkspaceDetails";
import { Fragment, useId, useState } from "react";
import type {
  ReconciliationGroup,
  ReconciliationMetrics,
} from "@freshphones/contracts";
import { formatPeso as money } from "@/lib/currency";
import styles from "@/app/system/_role-designs/hr_payroll/app/system/reports/reconciliation.module.css";

function AuditFigures({ totals }: { totals: ReconciliationMetrics }) {
  return (
    <dl className={styles.auditFigures}>
      {[
        ["Verified with matching audit", money(totals.auditedVerifiedAmount)],
        ["Verification audit gap", money(totals.unmatchedVerifiedAmount)],
        ["Needs clarification", money(totals.clarificationAmount)],
        ["Rejected claims", money(totals.rejectedAmount)],
        [
          "Finance adjustments · included in verified",
          money(totals.adjustmentAmount ?? "0.00"),
        ],
        [
          "Adjustment audit gap",
          money(totals.adjustmentAuditGapAmount ?? "0.00"),
        ],
      ].map(([label, value]) => {
        return (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ReconciliationSummary({
  totals,
}: {
  totals: ReconciliationMetrics;
}) {
  return (
    <section className={styles.summary} aria-label="Reconciliation summary">
      <dl className={styles.headline}>
        {[
          [
            "Recorded claims",
            money(totals.recordedAmount),
            `${totals.payments} payment records`,
          ],
          [
            "Finance verified",
            money(totals.verifiedAmount),
            `${totals.verifiedPayments} verified payments`,
          ],
          [
            "Awaiting verification",
            money(totals.pendingAmount),
            `${totals.pendingPayments} pending records`,
          ],
        ].map(([label, value, note]) => {
          return (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              <p>{note}</p>
            </div>
          );
        })}
      </dl>
      <div className={styles.reviewHeading}>
        <h3>Review status</h3>
        <p>
          Payments with review flags ·{" "}
          <strong>{totals.paymentsWithFlags}</strong>
        </p>
      </div>
      <dl className={styles.reviewList}>
        {[
          ["Possible duplicate references", totals.duplicateReferencePayments],
          ["Schedule/client mismatches", totals.scheduleMismatchPayments],
          ["Recorded/current batch differences", totals.batchMismatchPayments],
          [
            "Verified without issued schedule",
            totals.verifiedWithoutSchedulePayments,
          ],
        ].map(([label, value]) => {
          return (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
      <p className={styles.auditStatus}>
        <span>
          Verification audit gap{" "}
          <strong>{money(totals.unmatchedVerifiedAmount)}</strong> ·{" "}
          {totals.unmatchedVerifiedPayments} records
        </span>
        <span>
          Adjustment audit gap{" "}
          <strong>{money(totals.adjustmentAuditGapAmount ?? "0.00")}</strong> ·{" "}
          {totals.adjustmentAuditGapPayments ?? 0} records
        </span>
      </p>
      <WorkspaceDetails className={styles.auditDisclosure}>
        <summary>All supporting figures and definitions</summary>
        <AuditFigures totals={totals} />
        <p>
          {totals.auditedVerifiedPayments} verified records match their
          evidence. {totals.clarificationPayments} records need clarification;{" "}
          {totals.rejectedPayments} were rejected. {totals.adjustments ?? 0}{" "}
          append-only Finance adjustments are included in verified credit.
        </p>
        <p>
          Each flagged payment is counted once; flags can overlap. Duplicate
          checks compare normalized references for the same method across the
          entire ledger. A permitted client move can explain a batch difference.
          Matching audit evidence checks current payment facts and the Finance
          actor; older or missing evidence needs review.
        </p>
      </WorkspaceDetails>
    </section>
  );
}

export function ReconciliationGroups({
  rows,
}: {
  rows: ReconciliationGroup[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const id = useId();

  return (
    <div
      className={styles.tableRegion}
      role="region"
      aria-label="Reconciliation figures"
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption>
          Batch comparison{" "}
          <span>
            Amounts in PHP · expand a batch for audit and status figures
          </span>
        </caption>
        <thead>
          <tr>
            {[
              "Batch / method",
              "Recorded claims",
              "Verified",
              "Awaiting verification",
              "Review flags",
              "Details",
            ].map((label) => {
              return (
                <th scope="col" key={label}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = `${row.batchId}:${row.method}`;

            const open = expanded === key;

            const panelId = `${id}-${index}`;

            return (
              <Fragment key={key}>
                <tr>
                  <th scope="row">
                    {row.batchCode}
                    <small>
                      {row.method} · {row.payments} records
                    </small>
                  </th>
                  <td data-label="Recorded claims">
                    {money(row.recordedAmount)}
                  </td>
                  <td data-label="Verified">{money(row.verifiedAmount)}</td>
                  <td data-label="Awaiting verification">
                    {money(row.pendingAmount)}
                  </td>
                  <td data-label="Review flags">
                    {row.paymentsWithFlags
                      ? `${row.paymentsWithFlags} flagged`
                      : "0 flags"}
                    {row.unmatchedVerifiedPayments > 0 && (
                      <small>
                        Verification gap {money(row.unmatchedVerifiedAmount)}
                      </small>
                    )}
                    {(row.adjustmentAuditGapPayments ?? 0) > 0 && (
                      <small>
                        Adjustment gap{" "}
                        {money(row.adjustmentAuditGapAmount ?? "0.00")}
                      </small>
                    )}
                  </td>
                  <td className={styles.detailCell}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      aria-label={`${open ? "Hide" : "Show"} details for ${row.batchCode}, ${row.method}`}
                      onClick={() => {
                        return setExpanded(open ? null : key);
                      }}
                    >
                      {open ? "Hide" : "Details"}
                      <span aria-hidden="true">{open ? "−" : "+"}</span>
                    </button>
                  </td>
                </tr>
                <tr id={panelId} hidden={!open} className={styles.expandedRow}>
                  <td colSpan={6}>
                    <AuditFigures totals={row} />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
