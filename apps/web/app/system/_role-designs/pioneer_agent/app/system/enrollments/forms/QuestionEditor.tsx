"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceNativeSelect";
import type { EnrollmentFormQuestion } from "@freshphones/contracts";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/enrollments/forms/form-editor.module.css";

export const questionTypeLabels: Record<
  EnrollmentFormQuestion["type"],
  string
> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
};

export default function QuestionEditor({
  question,
  index,
  total,
  idPrefix,
  onChange,
  onMove,
  onRemove,
  readOnly = false,
  error,
}: {
  question: EnrollmentFormQuestion;
  index: number;
  total: number;
  idPrefix: string;
  onChange: (question: EnrollmentFormQuestion) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  readOnly?: boolean;
  error?: string;
}) {
  const id = `${idPrefix}-question-${question.id}`;

  function changeType(type: EnrollmentFormQuestion["type"]) {
    const base = {
      id: question.id,
      label: question.label,
      help: question.help,
      required: question.required,
    };

    if (type === "short_text" || type === "long_text") {
      onChange({ ...base, type });

      return;
    }

    const options =
      "options" in question
        ? question.options
        : [
            { id: crypto.randomUUID(), label: "Option 1" },
            { id: crypto.randomUUID(), label: "Option 2" },
          ];

    onChange({ ...base, type, options });
  }

  return (
    <fieldset
      className={styles.question}
      disabled={readOnly}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className={styles.srOnly}>Question {index + 1}</legend>
      <header className={styles.questionHeader}>
        <h3 id={`${id}-heading`} tabIndex={-1}>
          Question {index + 1}
        </h3>
        <div className={styles.rowActions}>
          <button
            type="button"
            disabled={readOnly || index === 0}
            aria-label={`Move question ${index + 1} up`}
            onClick={() => {
              onMove(-1);
            }}
          >
            Move up
          </button>
          <button
            type="button"
            disabled={readOnly || index === total - 1}
            aria-label={`Move question ${index + 1} down`}
            onClick={() => {
              onMove(1);
            }}
          >
            Move down
          </button>
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove question ${index + 1}`}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </header>
      <div className={styles.questionGrid}>
        <label className={styles.field} htmlFor={`${id}-label`}>
          Question label
          <input
            id={`${id}-label`}
            value={question.label}
            maxLength={160}
            required
            onChange={(event) => {
              onChange({ ...question, label: event.target.value });
            }}
          />
        </label>
        <label className={styles.field} htmlFor={`${id}-type`}>
          Answer type
          <WorkspaceNativeSelect
            id={`${id}-type`}
            value={question.type}
            onChange={(event) => {
              changeType(event.target.value as EnrollmentFormQuestion["type"]);
            }}
          >
            {Object.entries(questionTypeLabels).map(([type, label]) => {
              return (
                <option key={type} value={type}>
                  {label}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
        <label
          className={`${styles.field} ${styles.fullWidth}`}
          htmlFor={`${id}-help`}
        >
          Help text (optional)
          <textarea
            id={`${id}-help`}
            rows={2}
            value={question.help}
            maxLength={500}
            onChange={(event) => {
              onChange({ ...question, help: event.target.value });
            }}
          />
        </label>
        <label className={`${styles.checkbox} ${styles.fullWidth}`}>
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) => {
              onChange({ ...question, required: event.target.checked });
            }}
          />
          Answer required
        </label>
      </div>
      {"options" in question && (
        <fieldset className={styles.optionGroup}>
          <legend>Answer options</legend>
          <p className={styles.help}>Use 2–20 options.</p>
          {question.options.map((option, optionIndex) => {
            return (
              <div className={styles.optionRow} key={option.id}>
                <label
                  className={styles.field}
                  htmlFor={`${id}-option-${option.id}`}
                >
                  Option {optionIndex + 1}
                  <input
                    id={`${id}-option-${option.id}`}
                    value={option.label}
                    required
                    maxLength={160}
                    onChange={(event) => {
                      onChange({
                        ...question,
                        options: question.options.map((item) => {
                          return item.id === option.id
                            ? { ...item, label: event.target.value }
                            : item;
                        }),
                      });
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={question.options.length <= 2}
                  aria-label={`Remove option ${optionIndex + 1} from question ${index + 1}`}
                  onClick={() => {
                    const options = question.options.filter((item) => {
                      return item.id !== option.id;
                    });

                    onChange({
                      ...question,
                      options,
                    });

                    requestAnimationFrame(() => {
                      const next =
                        options[Math.min(optionIndex, options.length - 1)];

                      document
                        .getElementById(`${id}-option-${next.id}`)
                        ?.focus();
                    });
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.optionAdd}
            disabled={question.options.length >= 20}
            onClick={() => {
              const optionId = crypto.randomUUID();

              onChange({
                ...question,
                options: [
                  ...question.options,
                  {
                    id: optionId,
                    label: `Option ${question.options.length + 1}`,
                  },
                ],
              });

              requestAnimationFrame(() => {
                document.getElementById(`${id}-option-${optionId}`)?.focus();
              });
            }}
          >
            Add option
          </button>
        </fieldset>
      )}
      {error && (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
