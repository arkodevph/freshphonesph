"use client";

import type {
  EnrollmentAnswers,
  EnrollmentFormDefinition,
} from "@freshphones/contracts";
import { enrollmentAnswerText } from "@/lib/enrollment-forms";
import type { EnrollmentContactValues } from "./FormFields";
import styles from "./public-enrollment.module.css";

export default function EnrollmentReview({
  definition,
  contact,
  answers,
  onEdit,
  disabled,
}: {
  definition: EnrollmentFormDefinition;
  contact: EnrollmentContactValues;
  answers: EnrollmentAnswers;
  onEdit: (key: string) => void;
  disabled: boolean;
}) {
  const rows = [
    ...(["name", "phone", "email"] as const).map((key) => {
      return {
        key,
        label: definition.contact[key].label,
        value: contact[key].trim() || "Not provided",
      };
    }),
    ...definition.questions.map((question) => {
      return {
        key: question.id,
        label: question.label,
        value: enrollmentAnswerText(question, answers[question.id]),
      };
    }),
  ];

  return (
    <dl className={styles.review}>
      {rows.map((row) => {
        return (
          <div className={styles.reviewRow} key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Edit ${row.label}`}
              onClick={() => {
                return onEdit(row.key);
              }}
            >
              Edit
            </button>
          </div>
        );
      })}
    </dl>
  );
}
