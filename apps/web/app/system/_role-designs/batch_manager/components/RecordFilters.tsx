"use client";

import DateInput from "@/app/system/_role-designs/batch_manager/components/DateInput";
import FormSelect from "@/app/system/_role-designs/batch_manager/components/FormSelect";
import AnimatedDisclosure from "@/app/system/_role-designs/batch_manager/components/AnimatedDisclosure";
import { useId } from "react";
import type { RecordFiltersValue } from "@/lib/record-filters";
import { AssignmentFilters } from "@/app/system/_role-designs/batch_manager/components/AssignmentFilters";
import styles from "@/app/system/_role-designs/batch_manager/components/record-filters.module.css";

export function RecordFilters({
  kind,
  value,
  onChange,
  onClear,
  onRefresh,
  loading,
  error,
  hasContext = false,
  compact = false,
}: {
  kind: "batch" | "client";
  value: RecordFiltersValue;
  onChange: (key: keyof RecordFiltersValue, value: string) => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  hasContext?: boolean;
  compact?: boolean;
}) {
  const id = useId();

  const noun = kind === "batch" ? "batches" : "clients";

  const date = kind === "batch" ? "Batch start" : "Joined";

  const statuses =
    kind === "batch"
      ? [
          ["PLANNED", "Forming"],
          ["ACTIVE", "Active"],
          ["COMPLETED", "Closed"],
          ["CANCELLED", "Cancelled"],
        ]
      : [
          ["ACTIVE", "Active"],
          ["ON_HOLD", "On hold"],
          ["COMPLETED", "Completed"],
        ];

  const input = (
    key: "q" | "model" | "dateFrom" | "dateTo",
    label: string,
    placeholder = "",
  ) => {
    const attributes = {
      id: `${id}-${key}`,
      value: value[key],
      "aria-invalid":
        key.startsWith("date") && error ? (true as const) : undefined,
      "aria-describedby":
        key.startsWith("date") && error ? `${id}-error` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        return onChange(key, event.target.value);
      },
    };

    return (
      <label className={styles.field} htmlFor={`${id}-${key}`}>
        <span>{label}</span>
        {key.startsWith("date") ? (
          <DateInput {...attributes} />
        ) : (
          <input
            {...attributes}
            type="search"
            maxLength={100}
            placeholder={placeholder}
          />
        )}
      </label>
    );
  };

  const extraCount = [
    value.model,
    value.dateFrom,
    value.dateTo,
    value.handlerId,
    value.agentId,
  ].filter(Boolean).length;

  const advanced = (
    <>
      <div className={styles.grid}>
        {input("model", "Unit / model", "e.g. iPhone 15")}
        {input("dateFrom", `${date} from`)}
        {input("dateTo", `${date} to`)}
      </div>
      <AssignmentFilters
        handlerId={value.handlerId}
        agentId={value.agentId}
        onChange={onChange}
      />
    </>
  );

  return (
    <section
      aria-label={`${kind === "batch" ? "Batch" : "Client"} filters`}
      className={`${styles.panel} ${compact ? styles.compact : ""}`}
    >
      {!compact && (
        <div className={styles.heading}>
          <h2>Filter {noun}</h2>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClear}
              disabled={!hasContext && !Object.values(value).some(Boolean)}
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || Boolean(error)}
            >
              Refresh {noun}
            </button>
          </div>
        </div>
      )}
      <div className={compact ? styles.toolbar : styles.grid}>
        {input(
          "q",
          `Search ${noun}`,
          kind === "batch"
            ? "Batch number or model"
            : "Name, email, phone or batch number",
        )}
        {!compact && input("model", "Filter by unit / model", "e.g. iPhone 15")}
        <div className={styles.field}>
          <span id={`${id}-status-label`}>
            {compact ? "Status" : "Filter by status"}
          </span>
          <FormSelect
            id={`${id}-status`}
            label="Status"
            labelId={`${id}-status-label`}
            value={value.status}
            onValueChange={(next) => {
              return onChange("status", next);
            }}
            options={[
              { value: "", label: "All statuses" },
              ...statuses.map(([value, label]) => {
                return { value, label };
              }),
            ]}
          />
        </div>
        {!compact && input("dateFrom", `${date} from`)}
        {!compact && input("dateTo", `${date} to`)}
        {compact && (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClear}
              disabled={!hasContext && !Object.values(value).some(Boolean)}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || Boolean(error)}
            >
              Refresh
            </button>
          </div>
        )}
      </div>
      {compact && (
        <AnimatedDisclosure
          className={styles.more}
          forceOpen={Boolean(error)}
          title={<>More filters{extraCount > 0 ? ` (${extraCount})` : ""}</>}
        >
          <div className={styles.advanced}>{advanced}</div>
        </AnimatedDisclosure>
      )}
      {!compact && (
        <p className={styles.help}>
          Dates include both endpoints and use{" "}
          {kind === "batch" ? "the batch start date" : "the client joined date"}
          . Unit/model matches part of the unit name.
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!compact && (
        <AssignmentFilters
          handlerId={value.handlerId}
          agentId={value.agentId}
          onChange={onChange}
        />
      )}
    </section>
  );
}
