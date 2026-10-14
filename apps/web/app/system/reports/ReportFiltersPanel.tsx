"use client";

import { type ReportFilters } from "@/lib/report-filters";
import type { ReportBatchOption, ReportKind } from "@freshphones/contracts";
import { type FormEvent } from "react";
import styles from "./reports.module.css";
import { BatchPicker, names, statusNames } from "./report-view";

type Props = {
  kind: ReportKind;
  apply: (event: FormEvent) => void;
  busy: "csv" | "xlsx" | "save" | null;
  draft: ReportFilters;
  edit: (field: keyof ReportFilters, value: string) => void;
  onReset: () => void;
  onBatchChange: (item: ReportBatchOption | null) => void;
  batch: ReportBatchOption | null;
  validation: string | null;
  dirty: boolean;
};

export default function ReportFiltersPanel({
  kind,
  apply,
  busy,
  draft,
  edit,
  onReset,
  onBatchChange,
  batch,
  validation,
  dirty,
}: Props) {
  return (
    <section className={styles.panel} aria-labelledby="report-filters-title">
      <h2 id="report-filters-title">{names[kind]} filters</h2>
      <form onSubmit={apply}>
        <fieldset disabled={Boolean(busy)} className={styles.filters}>
          <label className={styles.field}>
            From
            <input
              type="date"
              value={draft.dateFrom}
              max={draft.dateTo || "9999-12-31"}
              onChange={(event) => {
                return edit("dateFrom", event.target.value);
              }}
            />
          </label>
          <label className={styles.field}>
            To
            <input
              type="date"
              value={draft.dateTo}
              min={draft.dateFrom || "0001-01-01"}
              max="9999-12-31"
              onChange={(event) => {
                return edit("dateTo", event.target.value);
              }}
            />
          </label>
          {kind === "payments" && (
            <label className={styles.field}>
              Payment status
              <select
                value={draft.status}
                onChange={(event) => {
                  return edit("status", event.target.value);
                }}
              >
                <option value="">All statuses</option>
                {["VERIFIED", "PENDING", "NEEDS_CLARIFICATION", "REJECTED"].map(
                  (status) => {
                    return (
                      <option key={status} value={status}>
                        {statusNames[status]}
                      </option>
                    );
                  },
                )}
              </select>
            </label>
          )}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>
              Apply filters
            </button>
            <button type="button" onClick={onReset}>
              This month
            </button>
          </div>
        </fieldset>
        {["payments", "collections", "reconciliation"].includes(kind) && (
          <fieldset disabled={Boolean(busy)}>
            <BatchPicker value={batch} onChange={onBatchChange} />
          </fieldset>
        )}
      </form>
      <p className={styles.help}>
        {kind === "reconciliation"
          ? "Dates use recorded payment dates and current payment status. Batches use the payment’s recorded batch. This compares internal records and verification audits; external bank statements have not been matched."
          : kind === "collections"
            ? "Dates filter verified collections and pending payments by recorded payment date. Client counts, issued agreements and overall balances show current totals, grouped by each client’s current batch."
            : kind === "payments"
              ? "Dates use the recorded payment date. Pending, rejected and clarification records are shown separately; only verified payments affect balances."
              : "Dates use UTC creation dates for tasks or cases. Batch filters apply to payment and collection reports."}
      </p>
      {validation && (
        <p role="alert" className={styles.error}>
          {validation}
        </p>
      )}
      {dirty && (
        <p role="status" className={styles.warning}>
          Filters have changed. Apply them before downloading or saving a
          report.
        </p>
      )}
    </section>
  );
}
