"use client";

import DateInput from "@/app/system/_role-designs/batch_handler/components/DateInput";
import { useState } from "react";
import {
  gcashCorrectionSchema,
  gcashTimeForEdit,
  type GcashCorrection,
  type GcashReadingPage,
} from "@freshphones/contracts";
import styles from "@/app/system/_role-designs/batch_handler/app/system/gcash-history/workspace.module.css";

export function CorrectionForm({
  row,
  rowIndex,
  reading,
  saving,
  save,
  cancel,
}: {
  row: GcashReadingPage["items"][number];
  rowIndex: number;
  reading: GcashReadingPage;
  saving: boolean;
  save: (input: GcashCorrection) => Promise<void>;
  cancel: () => void;
}) {
  const [draft, setDraft] = useState({
    date: row.date,
    time: gcashTimeForEdit(row.time),
    description: row.description,
    reference: row.reference,
    debit: row.debit ?? "",
    credit: row.credit ?? "",
    balance: row.balance ?? "",
  });

  const [reason, setReason] = useState("");

  const [error, setError] = useState("");

  return (
    <form
      className={styles.editForm}
      aria-label={`Correct transaction ${rowIndex + 1}`}
      onSubmit={(event) => {
        event.preventDefault();

        const parsed = gcashCorrectionSchema.safeParse({
          version: reading.historyVersion,
          correctionVersion: reading.correctionVersion,
          rowIndex,
          reason,
          row: {
            ...draft,
            debit: draft.debit || null,
            credit: draft.credit || null,
            balance: draft.balance || null,
          },
        });

        if (!parsed.success) {
          setError(
            parsed.error.issues
              .map((issue) => {
                return issue.message;
              })
              .join(" "),
          );

          return;
        }

        setError("");

        void save(parsed.data);
      }}
    >
      <h3>Correct transaction {rowIndex + 1}</h3>
      <p>
        The PDF and original extraction stay unchanged. Saving reopens this
        submission for Records review.
      </p>
      <fieldset disabled={saving}>
        <div className={styles.editGrid}>
          {(
            [
              "date",
              "time",
              "description",
              "reference",
              "debit",
              "credit",
              "balance",
            ] as const
          ).map((key) => {
            return (
              <label key={key}>
                {
                  {
                    date: "Transaction date",
                    time: "Time (24-hour)",
                    description: "Description",
                    reference: "Reference number",
                    debit: "Debit (PHP)",
                    credit: "Credit (PHP)",
                    balance: "Balance (PHP)",
                  }[key]
                }
                {key === "date" ? (
                  <DateInput
                    type="date"
                    autoFocus
                    required
                    value={draft.date}
                    onChange={(event) => {
                      setDraft({ ...draft, date: event.target.value });
                    }}
                  />
                ) : (
                  <input
                    type="text"

                    inputMode={
                      ["debit", "credit", "balance"].includes(key)
                        ? "decimal"
                        : undefined
                    }
                    required={key === "description"}
                    maxLength={
                      key === "description"
                        ? 1500
                        : key === "reference"
                          ? 100
                          : 32
                    }
                    value={draft[key]}
                    onChange={(event) => {
                      setDraft({ ...draft, [key]: event.target.value });
                    }}
                  />
                )}
              </label>
            );
          })}
        </div>
        <p>
          Amounts use two decimal places, for example 1250.00. Leave an unread
          amount blank.
        </p>
        <label>
          Reason for correction
          <textarea
            aria-label="Reason for correction"
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className={styles.toolbar}>
        <button
          type="submit"
          data-variant="primary"
          className={styles.primary}
          disabled={saving || !reason.trim()}
        >
          {saving ? "Saving correction…" : "Save correction and reopen review"}
        </button>
        <button type="button" disabled={saving} onClick={cancel}>
          Cancel correction
        </button>
      </div>
    </form>
  );
}
