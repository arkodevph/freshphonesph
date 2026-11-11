"use client";

import { useId, useRef } from "react";
import { LockKeyhole } from "@/components/SolarIcons";
import type { PasswordChangeFields } from "@/lib/password-change";
import { usePasswordChange } from "./usePasswordChange";
import styles from "./security.module.css";

type Props = {
  email: string;
  disabled: boolean;
  unavailableReason?: string;
  onBusyChange: (busy: boolean) => void;
  onChanged: () => Promise<void>;
  onSessionExpired: () => void;
};

export default function PasswordChangeForm(props: Props) {
  const id = useId();

  const inputs = useRef<
    Partial<Record<keyof PasswordChangeFields, HTMLInputElement>>
  >({});

  const form = usePasswordChange({
    ...props,
    focusField: (field) => {
      inputs.current[field]?.focus();
    },
  });

  const fields: {
    key: keyof PasswordChangeFields;
    label: string;
    autocomplete: string;
  }[] = [
    {
      key: "currentPassword",
      label: "Current password",
      autocomplete: "current-password",
    },
    { key: "newPassword", label: "New password", autocomplete: "new-password" },
    {
      key: "confirmPassword",
      label: "Confirm new password",
      autocomplete: "new-password",
    },
  ];

  return (
    <section
      className={styles.card}
      data-portal-material="card"
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.cardHeading}>
        <span className={styles.sectionIcon}>
          <LockKeyhole />
        </span>
        <h2 id={`${id}-title`}>Change password</h2>
      </div>
      <p>
        Use your current password to update it here. You’ll stay signed in on
        this device; other sessions will be signed out.
      </p>
      {props.unavailableReason && (
        <p className={styles.note}>{props.unavailableReason}</p>
      )}
      <form onSubmit={form.submit} noValidate aria-busy={form.busy}>
        <input
          type="hidden"
          name="username"
          autoComplete="username"
          value={props.email}
        />
        <fieldset
          className={styles.passwordFields}
          disabled={props.disabled || form.busy}
        >
          <legend className={styles.srOnly}>Password details</legend>
          {fields.map((field) => {
            const error = form.errors[field.key];

            const hint = field.key === "newPassword" ? `${id}-help` : undefined;

            return (
              <div key={field.key} className={styles.passwordField}>
                <label htmlFor={`${id}-${field.key}`}>{field.label}</label>
                <input
                  ref={(input) => {
                    if (input) {
                      inputs.current[field.key] = input;
                    } else {
                      delete inputs.current[field.key];
                    }
                  }}
                  id={`${id}-${field.key}`}
                  name={field.key}
                  type={form.show ? "text" : "password"}
                  autoComplete={field.autocomplete}
                  value={form.fields[field.key]}
                  onChange={(event) => {
                    form.update(field.key, event.target.value);
                  }}
                  required
                  maxLength={128}
                  minLength={field.key === "currentPassword" ? 1 : 12}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    [hint, error ? `${id}-${field.key}-error` : null]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
                {field.key === "newPassword" && (
                  <small id={`${id}-help`} className={styles.passwordHelp}>
                    Use 12–128 characters.
                  </small>
                )}
                {error && (
                  <small
                    className={styles.fieldError}
                    id={`${id}-${field.key}-error`}
                  >
                    {error}
                  </small>
                )}
              </div>
            );
          })}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={form.show}
              onChange={(event) => {
                form.setShow(event.target.checked);
              }}
              aria-controls={fields
                .map((field) => {
                  return `${id}-${field.key}`;
                })
                .join(" ")}
            />
            Show passwords
          </label>
        </fieldset>
        {form.error && (
          <p role="alert" className={styles.error}>
            {form.error}
          </p>
        )}
        {form.success && (
          <p role="status" className={styles.success}>
            Password changed. You’re still signed in on this device. Other
            sessions have been signed out.
          </p>
        )}
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={props.disabled || form.busy}
        >
          {form.busy ? "Updating password…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
