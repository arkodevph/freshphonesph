"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/agent/components/WorkspaceNativeSelect";
import { useId, useState } from "react";
import type {
  EnrollmentFormDefinition,
  EnrollmentFormQuestion,
} from "@freshphones/contracts";
import QuestionEditor, {
  questionTypeLabels,
} from "@/app/system/_role-designs/agent/app/system/enrollments/forms/QuestionEditor";
import styles from "@/app/system/_role-designs/agent/app/system/enrollments/forms/form-editor.module.css";

export default function EnrollmentFormEditor({
  definition,
  onChange,
  readOnly = false,
  errors = {},
}: {
  definition: EnrollmentFormDefinition;
  onChange: (definition: EnrollmentFormDefinition) => void;
  readOnly?: boolean;
  errors?: Record<string, string | undefined>;
}) {
  const id = useId();

  const [newType, setNewType] =
    useState<EnrollmentFormQuestion["type"]>("short_text");

  const [announcement, setAnnouncement] = useState("");

  function focusQuestion(questionId: string, field = "heading") {
    requestAnimationFrame(() => {
      const element = document.getElementById(
        `${id}-question-${questionId}-${field}`,
      );

      element?.focus();
    });
  }

  function addQuestion() {
    if (readOnly || definition.questions.length >= 30) {
      return;
    }

    const base = {
      id: crypto.randomUUID(),
      label: "New question",
      help: "",
      required: false,
    };

    const question: EnrollmentFormQuestion =
      newType === "short_text" || newType === "long_text"
        ? { ...base, type: newType }
        : {
            ...base,
            type: newType,
            options: [
              { id: crypto.randomUUID(), label: "Option 1" },
              { id: crypto.randomUUID(), label: "Option 2" },
            ],
          };

    onChange({ ...definition, questions: [...definition.questions, question] });

    setAnnouncement(`Question ${definition.questions.length + 1} added.`);

    focusQuestion(question.id, "label");
  }

  function moveQuestion(index: number, offset: -1 | 1) {
    const target = index + offset;

    if (readOnly || target < 0 || target >= definition.questions.length) {
      return;
    }

    const questions = [...definition.questions];

    const question = questions[index];

    [questions[index], questions[target]] = [
      questions[target],
      questions[index],
    ];

    onChange({ ...definition, questions });

    setAnnouncement(
      `Question moved to position ${target + 1} of ${questions.length}.`,
    );

    focusQuestion(question.id);
  }

  return (
    <div className={styles.editor}>
      <p className={styles.srOnly} role="status" aria-atomic="true">
        {announcement}
      </p>
      <fieldset className={styles.panel} disabled={readOnly}>
        <legend className={styles.panelLegend}>Form introduction</legend>
        <label className={styles.field} htmlFor={`${id}-title`}>
          Form title
          <input
            id={`${id}-title`}
            value={definition.title}
            maxLength={120}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            onChange={(event) => {
              onChange({ ...definition, title: event.target.value });
            }}
          />
        </label>
        {errors.title && (
          <p className={styles.error} id={`${id}-title-error`}>
            {errors.title}
          </p>
        )}
        <label className={styles.field} htmlFor={`${id}-description`}>
          Introduction (optional)
          <textarea
            id={`${id}-description`}
            rows={3}
            value={definition.description}
            maxLength={1000}
            onChange={(event) => {
              onChange({ ...definition, description: event.target.value });
            }}
          />
        </label>
      </fieldset>
      <fieldset className={styles.panel} disabled={readOnly}>
        <legend className={styles.panelLegend}>Contact fields</legend>
        <p className={styles.help}>
          Name and phone are required. Email is optional. You can edit their
          labels and help text; these fields stay on the form.
        </p>
        {(["name", "phone", "email"] as const).map((key) => {
          const field = definition.contact[key];

          function update(value: Partial<typeof field>) {
            onChange({
              ...definition,
              contact: { ...definition.contact, [key]: { ...field, ...value } },
            });
          }

          return (
            <div className={styles.coreField} key={key}>
              <h3>
                {key === "name" ? "Name" : key === "phone" ? "Phone" : "Email"}{" "}
                <span>{key === "email" ? "Optional" : "Required"}</span>
              </h3>
              <label
                className={styles.field}
                htmlFor={`${id}-core-${key}-label`}
              >
                Field label
                <input
                  id={`${id}-core-${key}-label`}
                  value={field.label}
                  required
                  maxLength={160}
                  onChange={(event) => {
                    update({ label: event.target.value });
                  }}
                />
              </label>
              <label
                className={styles.field}
                htmlFor={`${id}-core-${key}-help`}
              >
                Help text (optional)
                <textarea
                  id={`${id}-core-${key}-help`}
                  rows={2}
                  value={field.help}
                  maxLength={500}
                  onChange={(event) => {
                    update({ help: event.target.value });
                  }}
                />
              </label>
              {errors[key] && <p className={styles.error}>{errors[key]}</p>}
            </div>
          );
        })}
      </fieldset>
      <section
        className={styles.questions}
        aria-labelledby={`${id}-questions-title`}
      >
        <header className={styles.questionsHeading}>
          <div>
            <h2 id={`${id}-questions-title`}>Additional questions</h2>
            <p className={styles.help}>
              Removing or reordering questions changes this draft. Earlier
              applications keep their original questions and answers.
            </p>
          </div>
          <span className={styles.count}>
            {definition.questions.length} of 30
          </span>
        </header>
        {definition.questions.map((question, index) => {
          return (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              total={definition.questions.length}
              idPrefix={id}
              readOnly={readOnly}
              error={errors[question.id]}
              onChange={(next) => {
                onChange({
                  ...definition,
                  questions: definition.questions.map((item) => {
                    return item.id === next.id ? next : item;
                  }),
                });
              }}
              onMove={(offset) => {
                moveQuestion(index, offset);
              }}
              onRemove={() => {
                const questions = definition.questions.filter((item) => {
                  return item.id !== question.id;
                });

                onChange({ ...definition, questions });

                setAnnouncement(
                  `Question ${index + 1} removed from the draft.`,
                );

                const next = questions[Math.min(index, questions.length - 1)];

                if (next) {
                  focusQuestion(next.id);
                } else {
                  requestAnimationFrame(() => {
                    document.getElementById(`${id}-add-question`)?.focus();
                  });
                }
              }}
            />
          );
        })}
        {!definition.questions.length && (
          <p className={styles.empty}>
            This form currently asks for contact details only.
          </p>
        )}
        <fieldset className={styles.addQuestion} disabled={readOnly}>
          <legend className={styles.srOnly}>Add a question</legend>
          <label className={styles.field} htmlFor={`${id}-new-type`}>
            Answer type
            <WorkspaceNativeSelect
              id={`${id}-new-type`}
              value={newType}
              onChange={(event) => {
                setNewType(
                  event.target.value as EnrollmentFormQuestion["type"],
                );
              }}
            >
              {Object.entries(questionTypeLabels).map(([type, label]) => {
                return (
                  <option value={type} key={type}>
                    {label}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
          <button
            id={`${id}-add-question`}
            type="button"
            disabled={readOnly || definition.questions.length >= 30}
            onClick={addQuestion}
          >
            Add question
          </button>
        </fieldset>
      </section>
    </div>
  );
}
