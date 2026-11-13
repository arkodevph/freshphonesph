"use client";

import WorkspaceDetails from "@/app/system/_role-designs/hr_payroll/components/WorkspaceDetails";
import DateInput from "@/app/system/_role-designs/hr_payroll/components/DateInput";
import { type ReportFilters } from "@/lib/report-filters";
import type { ReportBatchOption, ReportKind } from "@freshphones/contracts";
import { type FormEvent, useEffect, useRef } from "react";
import styles from "@/app/system/_role-designs/hr_payroll/app/system/reports/reports.module.css";
import ReportSelect from "@/app/system/_role-designs/hr_payroll/app/system/reports/ReportSelect";
import {
  BatchPicker,
  names,
  periodLabel,
  statusNames,
} from "@/app/system/_role-designs/hr_payroll/app/system/reports/report-view";
import { SlidersHorizontal } from "@phosphor-icons/react";

type Props = {
  kind: ReportKind;
  apply: (event: FormEvent) => void;
  busy: "csv" | "xlsx" | "save" | null;
  loading: boolean;
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
  loading,
  draft,
  edit,
  onReset,
  onBatchChange,
  batch,
  validation,
  dirty,
}: Props) {
  const validationMessage = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (validation) {
      validationMessage.current?.focus();
    }
  }, [validation]);

  return (
    <WorkspaceDetails
      className={`${styles.panel} ${styles.filterPanel}`}
      aria-labelledby="report-filters-title"
      open={dirty || Boolean(validation) || undefined}
    >
      <summary className={styles.filterSummary}>
        <span>
          <SlidersHorizontal aria-hidden="true" /> Filter report
        </span>
        <span>
          {periodLabel(draft)} · {batch?.code ?? "All batches"}
          {kind === "payments"
            ? ` · ${draft.status ? statusNames[draft.status] : "All statuses"}`
            : ""}
        </span>
      </summary>
      <div className={styles.filterContents}>
        <h2 id="report-filters-title">{names[kind]} filters</h2>
        <form
          onSubmit={apply}
          aria-describedby={validation ? "report-filter-error" : undefined}
        >
          <fieldset disabled={Boolean(busy)} className={styles.filters}>
            <label className={styles.field}>
              From
              <DateInput
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
              <DateInput
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
              <ReportSelect
                label="Payment status"
                value={draft.status}
                onValueChange={(value) => {
                  return edit("status", value);
                }}
                options={[
                  { value: "", label: "All statuses" },
                  ...[
                    "VERIFIED",
                    "PENDING",
                    "NEEDS_CLARIFICATION",
                    "REJECTED",
                  ].map((status) => {
                    return {
                      value: status,
                      label: statusNames[status],
                    };
                  }),
                ]}
              />
            )}
            <div className={styles.actions}>
              <button
                type="submit"
                data-variant="primary"
                className={styles.primary}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Applying…" : "Apply filters"}
              </button>
              <button type="button" onClick={onReset}>
                This month
              </button>
            </div>
          </fieldset>
          {["payments", "collections", "reconciliation"].includes(kind) && (
            <WorkspaceDetails className={styles.filterDisclosure}>
              <summary>
                Batch filters <span>{batch ? batch.code : "All batches"}</span>
              </summary>
              <fieldset disabled={Boolean(busy)}>
                <BatchPicker value={batch} onChange={onBatchChange} />
              </fieldset>
            </WorkspaceDetails>
          )}
        </form>
        <WorkspaceDetails className={styles.scopeDisclosure}>
          <summary>How these figures are calculated</summary>
          <p className={styles.help}>
            {kind === "reconciliation"
              ? "Dates use recorded payment dates and current payment status. Batches use the payment’s recorded batch. This compares internal records and verification audits; external bank statements have not been matched."
              : kind === "collections"
                ? "Dates filter incoming collections and pending payments by recorded payment date. Membership counts include retained history. Issued obligations reflect recorded replacement releases; overall balances show current totals. External refunds are tracked separately."
                : kind === "payments"
                  ? "Dates use the recorded payment date. Pending, rejected and clarification records are shown separately; only verified payments affect balances."
                  : "Dates use UTC creation dates for tasks or cases. Batch filters apply to payment and collection reports."}
          </p>
        </WorkspaceDetails>
        {validation && (
          <p
            ref={validationMessage}
            tabIndex={-1}
            id="report-filter-error"
            role="alert"
            className={styles.error}
          >
            {validation}
          </p>
        )}
        {dirty && (
          <p role="status" className={styles.warning}>
            Filters have changed. Apply them before downloading or saving a
            report.
          </p>
        )}
      </div>
    </WorkspaceDetails>
  );
}
