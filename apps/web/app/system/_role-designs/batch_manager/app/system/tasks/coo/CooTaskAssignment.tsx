"use client";

import ModalCloseButton from "@/app/system/_role-designs/batch_manager/components/ModalCloseButton";
import DateInput from "@/app/system/_role-designs/batch_manager/components/DateInput";
import { useRef, useState, type ComponentProps, type FormEvent } from "react";
import Select from "@/app/system/_role-designs/batch_manager/components/Select";
import { useSpringDialog } from "@/lib/useSpringDialog";
import {
  Close,
  Add,
} from "@/app/system/_role-designs/batch_manager/components/SolarIcons";
import type TaskFiltersPanel from "@/app/system/_role-designs/batch_manager/app/system/tasks/TaskFiltersPanel";
import {
  label,
  type Priority,
} from "@/app/system/_role-designs/batch_manager/app/system/tasks/task-view";
import styles from "@/app/system/_role-designs/batch_manager/app/system/tasks/coo/coo-tasks.module.css";

export type AssignmentProps = ComponentProps<typeof TaskFiltersPanel>;

type Props = AssignmentProps & {
  open: boolean;
  onClose: () => void;
  error: string;
};

export default function CooTaskAssignment({
  open,
  onClose,
  error,
  assign,
  form,
  setForm,
  assignees,
  busy,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [assigneeError, setAssigneeError] = useState(false);

  useSpringDialog(dialog, open);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!form.assigneeId) {
      event.preventDefault();

      setAssigneeError(true);

      document.getElementById("coo-task-assignee")?.focus();

      return;
    }

    void assign(event);
  }

  return (
    <dialog
      data-workspace-modal
      data-modal-framed
      data-modal-size="drawer"
      ref={dialog}
      className={styles.assignmentDialog}
      aria-labelledby="coo-assignment-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
    >
      <header data-modal-header className={styles.drawerHeader}>
        <div>
          <span>New assignment</span>
          <h2 id="coo-assignment-title">Assign a task</h2>
          <p>Give someone a clear next step.</p>
        </div>
        <ModalCloseButton disabled={busy} onClick={onClose} />
      </header>
      <form onSubmit={submit} className={styles.assignmentForm}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <label className={styles.field}>
          Task title
          <input
            autoFocus
            disabled={busy}
            required
            minLength={2}
            maxLength={200}
            value={form.title}
            onChange={(event) => {
              return setForm({ ...form, title: event.target.value });
            }}
            placeholder="e.g. Verify the next batch's payment records"
          />
        </label>
        <div className={styles.field}>
          <span id="coo-task-assignee-label">Assign to</span>
          <Select
            searchable
            searchPlaceholder="Search staff or role"
            id="coo-task-assignee"
            labelId="coo-task-assignee-label"
            value={form.assigneeId}
            options={[
              { value: "", label: "Choose a staff member" },
              ...assignees.map((person) => {
                return {
                  value: person.id,
                  label: `${person.name} · ${label(person.role)}`,
                };
              }),
            ]}
            onValueChange={(value) => {
              setForm({ ...form, assigneeId: value });

              setAssigneeError(false);
            }}
            disabled={busy || !assignees.length}
            animate
            fitViewport
            descriptionId={
              assigneeError ? "coo-task-assignee-error" : undefined
            }
            invalid={assigneeError}
          />
          {assigneeError && (
            <p
              id="coo-task-assignee-error"
              className={styles.fieldError}
              role="alert"
            >
              Choose a staff member for this task.
            </p>
          )}
        </div>
        <div className={styles.formColumns}>
          <div className={styles.field}>
            <span id="coo-task-priority-label">Priority</span>
            <Select
              id="coo-task-priority"
              labelId="coo-task-priority-label"
              value={form.priority}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
              ]}
              onValueChange={(value) => {
                return setForm({ ...form, priority: value as Priority });
              }}
              disabled={busy}
              animate
              fitViewport
            />
          </div>
          <label className={styles.field}>
            Deadline
            <span className={styles.dateInput}>
              <DateInput
                required
                disabled={busy}
                type="datetime-local"
                value={form.deadline}
                onChange={(event) => {
                  return setForm({ ...form, deadline: event.target.value });
                }}
              />
            </span>
          </label>
        </div>
        <label className={styles.field}>
          Instructions
          <textarea
            disabled={busy}
            maxLength={5000}
            rows={6}
            value={form.instructions}
            onChange={(event) => {
              return setForm({ ...form, instructions: event.target.value });
            }}
            placeholder="Describe the outcome, what to check, and any context they need."
          />
          <small>Make the expected result clear. Up to 5,000 characters.</small>
        </label>
        <footer className={styles.drawerFooter}>
          <button
            data-variant="primary"
            className={styles.primary}
            disabled={busy}
            type="submit"
          >
            <Add />
            {busy ? "Assigning…" : "Assign task"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
