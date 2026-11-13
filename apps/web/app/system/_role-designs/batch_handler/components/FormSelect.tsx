"use client";

import { useId, useRef, useState } from "react";
import Select from "@/app/system/_role-designs/batch_handler/components/Select";
import styles from "@/app/system/_role-designs/batch_handler/components/form-select.module.css";

type Props = {
  id?: string;
  label: string;
  labelId?: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  searchable?: boolean;
};

/** Workspace selection with native form constraints and the shared listbox. */
export default function FormSelect({
  id,
  label,
  labelId,
  value,
  options,
  onValueChange,
  disabled,
  required,
  name,
  searchable,
}: Props) {
  const generated = useId();

  const fieldId = id ?? generated;

  const root = useRef<HTMLDivElement>(null);

  const native = useRef<HTMLSelectElement>(null);

  const [invalid, setInvalid] = useState(false);

  return (
    <div ref={root} className={styles.root}>
      {!labelId && (
        <span className={styles.hidden} id={`${fieldId}-label`}>
          {label}
        </span>
      )}

      <Select
        id={fieldId}
        labelId={labelId ?? `${fieldId}-label`}
        value={value}
        options={options}
        disabled={disabled}
        searchable={searchable}
        fitViewport
        animate
        invalid={invalid}
        descriptionId={invalid ? `${fieldId}-error` : undefined}
        onValueChange={(next) => {
          if (native.current?.matches(":disabled")) {
            return;
          }

          setInvalid(false);

          onValueChange(next);
        }}
      />
      <select
        ref={native}
        data-form-select-native
        className={styles.hidden}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(event) => {
          return onValueChange(event.target.value);
        }}
        onInvalid={(event) => {
          event.preventDefault();

          setInvalid(true);

          const first = event.currentTarget.form?.querySelector(
            "input:invalid, select:invalid, textarea:invalid",
          );

          if (!first || first === event.currentTarget) {
            queueMicrotask(() => {
              return root.current
                ?.querySelector<HTMLButtonElement>('[role="combobox"]')
                ?.focus();
            });
          }
        }}
      >
        {options.map((option) => {
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
      {invalid && (
        <span className={styles.error} role="alert" id={`${fieldId}-error`}>
          Select an option.
        </span>
      )}
    </div>
  );
}
