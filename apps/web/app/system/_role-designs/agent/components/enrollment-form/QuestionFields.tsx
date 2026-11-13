"use client";

import { useId, type ChangeEvent } from "react";
import type { EnrollmentFormQuestion } from "@freshphones/contracts";
import styles from "@/app/system/_role-designs/agent/components/enrollment-form/enrollment-form.module.css";

export default function QuestionFields({
  question,
  value,
  onChange,
  error,
  disabled = false,
  fieldId,
}: {
  question: EnrollmentFormQuestion;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
  fieldId?: string;
}) {
  const generatedId = useId();

  const id = fieldId ?? generatedId;

  const helpId = `${id}-help`;

  const errorId = `${id}-error`;

  const describedBy =
    [question.help ? helpId : "", error ? errorId : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  const label = (
    <>
      {question.label}
      <span className={styles.requirement}>
        {question.required ? "Required" : "Optional"}
      </span>
    </>
  );

  const help = question.help ? (
    <p className={styles.help} id={helpId}>
      {question.help}
    </p>
  ) : null;

  const feedback = error ? (
    <p className={styles.error} id={errorId}>
      {error}
    </p>
  ) : null;

  if (question.type === "short_text" || question.type === "long_text") {
    const text = typeof value === "string" ? value : "";

    const common = {
      id,
      name: question.id,
      value: text,
      required: question.required,
      disabled,
      "aria-describedby": describedBy,
      "aria-invalid": Boolean(error),
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        onChange(event.target.value);
      },
    };

    return (
      <div
        className={styles.field}
        data-enrollment-question-type={question.type}
      >
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {help}
        {question.type === "long_text" ? (
          <textarea {...common} rows={5} maxLength={2000} />
        ) : (
          <input {...common} type="text" maxLength={200} />
        )}
        {feedback}
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];

  const single = typeof value === "string" ? value : "";

  return (
    <fieldset
      data-enrollment-question-type={question.type}
      id={id}
      tabIndex={-1}
      className={styles.choices}
      disabled={disabled}
      aria-describedby={describedBy}
    >
      <legend className={styles.label}>{label}</legend>
      {help}
      <div className={styles.options}>
        {question.options.map((option) => {
          const optionId = `${id}-${option.id}`;

          return (
            <label className={styles.option} key={option.id} htmlFor={optionId}>
              <input
                id={optionId}
                name={question.id}
                type={question.type === "single_choice" ? "radio" : "checkbox"}
                value={option.id}
                checked={
                  question.type === "single_choice"
                    ? single === option.id
                    : selected.includes(option.id)
                }
                required={
                  question.type === "single_choice" && question.required
                }
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => {
                  if (question.type === "single_choice") {
                    onChange(option.id);

                    return;
                  }

                  const next = new Set(selected);

                  if (event.target.checked) {
                    next.add(option.id);
                  } else {
                    next.delete(option.id);
                  }

                  onChange(
                    question.options
                      .filter((item) => {
                        return next.has(item.id);
                      })
                      .map((item) => {
                        return item.id;
                      }),
                  );
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {question.type === "single_choice" && !question.required && single && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            onChange("");
          }}
        >
          Clear selection
        </button>
      )}
      {feedback}
    </fieldset>
  );
}
