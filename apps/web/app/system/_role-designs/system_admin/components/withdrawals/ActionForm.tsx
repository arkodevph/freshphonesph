"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import styles from "@/app/system/_role-designs/system_admin/components/withdrawals/workspace.module.css";

export function ActionForm({
  title,
  label,
  busy,
  children,
  confirm,
  onSave,
}: {
  title: string;
  label: string;
  busy: boolean;
  children: ReactNode;
  confirm?: string;
  onSave: () => Promise<unknown>;
}) {
  const [reviewing, setReviewing] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (confirm && !reviewing) {
      setReviewing(true);

      return;
    }

    await onSave();

    setReviewing(false);
  }

  return (
    <form
      className={`${styles.form} ${styles.section}`}
      aria-label={title}
      onSubmit={submit}
    >
      <h3>{title}</h3>
      <fieldset disabled={busy || reviewing}>{children}</fieldset>
      {reviewing ? (
        <div
          className={styles.consequence}
          role="group"
          aria-label="Confirm decision"
        >
          <strong>Review before saving</strong>
          <p>{confirm}</p>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setReviewing(false);
              }}
            >
              Keep editing
            </button>
            <button
              type="submit"
              disabled={busy}
              data-variant="primary"
              className={styles.primary}
            >
              {busy ? "Saving…" : "Confirm and save"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="submit"
            data-variant="primary"
            className={styles.primary}
            disabled={busy}
          >
            {busy ? "Saving…" : label}
          </button>
        </div>
      )}
    </form>
  );
}

export function NoteField({
  label,
  value,
  onChange,
  minLength = 3,
  maxLength = 2000,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  help?: string;
}) {
  return (
    <label className={styles.field}>
      {label}
      {help && <span className={styles.muted}>{help}</span>}
      <textarea
        required
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}
