"use client";

import { useId } from "react";
import type {
  EnrollmentAnswers,
  EnrollmentFormDefinition,
} from "@freshphones/contracts";
import QuestionFields from "./QuestionFields";
import styles from "./enrollment-form.module.css";

export type EnrollmentContactValues = {
  name: string;
  phone: string;
  email: string;
};

export type EnrollmentFieldErrors = Record<string, string | undefined>;

export default function FormFields({
  definition,
  contact,
  answers,
  onContactChange,
  onAnswersChange,
  errors = {},
  disabled = false,
  showHeading = true,
  idPrefix,
  section = "all",
}: {
  definition: EnrollmentFormDefinition;
  contact: EnrollmentContactValues;
  answers: EnrollmentAnswers;
  onContactChange: (contact: EnrollmentContactValues) => void;
  onAnswersChange: (answers: EnrollmentAnswers) => void;
  errors?: EnrollmentFieldErrors;
  disabled?: boolean;
  showHeading?: boolean;
  idPrefix?: string;
  section?: "all" | "contact" | "questions";
}) {
  const generatedId = useId();

  const id = idPrefix ?? generatedId;

  return (
    <div className={styles.fields} data-enrollment-fields={section}>
      {showHeading && (
        <header className={styles.heading}>
          <h2>{definition.title}</h2>
          {definition.description && <p>{definition.description}</p>}
        </header>
      )}
      <p className={styles.instructions}>
        Complete the fields marked Required.
      </p>
      {section !== "questions" && (
        <fieldset className={styles.group} disabled={disabled}>
          <legend>Your details</legend>
          {(["name", "phone", "email"] as const).map((key) => {
            const fieldId = `${id}-${key}`;

            const field = definition.contact[key];

            const error = errors[key];

            const describedBy =
              [
                field.help ? `${fieldId}-help` : "",
                error ? `${fieldId}-error` : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined;

            return (
              <div
                className={styles.field}
                key={key}
                data-enrollment-contact={key}
              >
                <label htmlFor={fieldId} className={styles.label}>
                  {field.label}
                  <span className={styles.requirement}>
                    {key === "email" ? "Optional" : "Required"}
                  </span>
                </label>
                {field.help && (
                  <p className={styles.help} id={`${fieldId}-help`}>
                    {field.help}
                  </p>
                )}
                <input
                  id={fieldId}
                  name={key}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  autoComplete={
                    key === "name" ? "name" : key === "phone" ? "tel" : "email"
                  }
                  required={key !== "email"}
                  maxLength={key === "name" ? 100 : key === "phone" ? 25 : 254}
                  minLength={
                    key === "name" ? 2 : key === "phone" ? 7 : undefined
                  }
                  value={contact[key]}
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    onContactChange({ ...contact, [key]: event.target.value });
                  }}
                />
                {error && (
                  <p className={styles.error} id={`${fieldId}-error`}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
      {section !== "contact" && definition.questions.length > 0 && (
        <fieldset className={styles.group} disabled={disabled}>
          <legend>Additional details</legend>
          {definition.questions.map((question) => {
            return (
              <QuestionFields
                key={question.id}
                question={question}
                value={answers[question.id]}
                error={errors[question.id]}
                disabled={disabled}
                fieldId={`${id}-${question.id}`}
                onChange={(value) => {
                  onAnswersChange({ ...answers, [question.id]: value });
                }}
              />
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
