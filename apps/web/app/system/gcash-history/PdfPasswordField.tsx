"use client";

import { useEffect, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { inputCls } from "@/components/FormField";
import styles from "./feedback.module.css";

export function PdfPasswordField({
  value,
  onChange,
  resetKey,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  resetKey: number;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);

  const empty = !value;

  useEffect(() => {
    if (disabled || empty) {
      setVisible(false);
    }
  }, [resetKey, disabled, empty]);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor="gcash-pdf-password"
        className="text-xs font-600 text-ink-soft"
      >
        PDF password (if required)
      </label>
      <div className={styles.password}>
        <input
          id="gcash-pdf-password"
          type={visible && !disabled ? "text" : "password"}
          autoComplete="off"
          maxLength={128}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={`${inputCls} ${styles.passwordInput}`}
          aria-describedby="gcash-password-help"
        />
        <button
          type="button"
          className={styles.eye}
          disabled={disabled}
          aria-label={visible ? "Hide PDF password" : "Show PDF password"}
          aria-pressed={visible}
          aria-controls="gcash-pdf-password"
          onClick={() => {
            setVisible((current) => {
              return !current;
            });
          }}
        >
          {visible ? (
            <EyeSlash aria-hidden="true" size={19} />
          ) : (
            <Eye aria-hidden="true" size={19} />
          )}
        </button>
      </div>
      <span id="gcash-password-help" className="text-xs text-ink-soft">
        Used only to open this upload. The password is never saved.
      </span>
    </div>
  );
}
