"use client";

import { useState } from "react";
import type { GcashHistory, GcashHistoryReview } from "@freshphones/contracts";
import styles from "./workspace.module.css";

export function ReviewDecision({
  row,
  disabled,
  save,
}: {
  row: GcashHistory;
  disabled: boolean;
  save: (input: GcashHistoryReview) => Promise<void>;
}) {
  const [status, setStatus] = useState<"REVIEWED" | "NEEDS_CLARIFICATION">(
    "REVIEWED",
  );

  const [note, setNote] = useState("");

  return (
    <form
      className={styles.decision}
      aria-label="Review GCash PDF"
      onSubmit={(event) => {
        event.preventDefault();

        void save({ version: row.version, status, note });
      }}
    >
      <div>
        <h3>Records decision</h3>
        <p>
          Compare the original PDF and transactions before saving your review.
        </p>
      </div>
      <fieldset disabled={disabled}>
        <label>
          Records decision
          <select
            aria-label="Records decision"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
            }}
          >
            <option value="REVIEWED">Reviewed</option>
            <option value="NEEDS_CLARIFICATION">Needs clarification</option>
          </select>
        </label>
        <label>
          Review note
          <textarea
            maxLength={2000}
            required
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
            placeholder="What was checked, or what needs correcting"
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          disabled={disabled || !note.trim()}
        >
          Save Records review
        </button>
      </fieldset>
    </form>
  );
}
