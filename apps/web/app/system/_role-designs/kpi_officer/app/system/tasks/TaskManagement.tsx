"use client";

import { useEffect, useId, useRef } from "react";
import { useTaskManagement } from "@/lib/useTaskManagement";
import Select from "@/app/system/_role-designs/kpi_officer/components/Select";
import DateInput from "@/app/system/_role-designs/kpi_officer/components/DateInput";
import type { Assignee, Task, Priority } from "./task-view";
import styles from "./task-detail-panel.module.css";

export default function TaskManagement({
  task,
  assignees,
  busy,
  stale,
  canEditInstructions,
  mutate,
  onDirtyChange,
}: {
  task: Task;
  assignees: Assignee[];
  busy: boolean;
  stale: boolean;
  canEditInstructions: boolean;
  mutate: (run: () => Promise<unknown>, success: string) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const state = useTaskManagement(task, mutate, onDirtyChange);

  const id = useId();

  const title = useRef<HTMLInputElement>(null);

  const reason = useRef<HTMLTextAreaElement>(null);

  const editAction = useRef<HTMLButtonElement>(null);

  const cancelAction = useRef<HTMLButtonElement>(null);

  const previousMode = useRef(state.mode);

  useEffect(() => {
    if (state.mode === "edit") {
      title.current?.focus();
    } else if (state.mode === "cancel") {
      reason.current?.focus();
    } else if (previousMode.current === "edit") {
      editAction.current?.focus();
    } else if (previousMode.current === "cancel") {
      cancelAction.current?.focus();
    }

    previousMode.current = state.mode;
  }, [state.mode]);

  if (!["TODO", "IN_PROGRESS"].includes(task.status)) {
    return null;
  }

  const blocked = busy || stale;

  const options = assignees.map((person) => {
    return {
      value: person.id,
      label: person.name,
    };
  });

  if (
    !options.some((option) => {
      return option.value === state.form.assigneeId;
    })
  ) {
    options.unshift({ value: state.form.assigneeId, label: task.assigneeName });
  }

  return (
    <section className={styles.management} aria-label="Manage task">
      {state.mode === "view" ? (
        <div className={styles.managementActions}>
          <button
            ref={editAction}
            type="button"
            className={styles.secondary}
            disabled={blocked}
            onClick={() => {
              return state.open("edit");
            }}
          >
            Edit task
          </button>
          <button
            ref={cancelAction}
            type="button"
            className={styles.cancelAction}
            disabled={blocked}
            onClick={() => {
              return state.open("cancel");
            }}
          >
            Cancel task
          </button>
        </div>
      ) : state.mode === "edit" ? (
        <form
          className={styles.reportForm}
          aria-label="Edit task"
          onSubmit={(event) => {
            event.preventDefault();

            if (!blocked) {
              void state.save();
            }
          }}
        >
          <h3>Edit task</h3>
          <label className={styles.field}>
            Task title
            <input
              ref={title}
              required
              minLength={2}
              maxLength={200}
              disabled={busy}
              value={state.form.title}
              onChange={(event) => {
                return state.setForm({
                  ...state.form,
                  title: event.target.value,
                });
              }}
            />
          </label>
          <div className={styles.field}>
            <span id={`${id}-assignee-label`}>Assign to</span>
            <Select
              id={`${id}-assignee`}
              labelId={`${id}-assignee-label`}
              value={state.form.assigneeId}
              options={options}
              disabled={busy}
              animate
              fitViewport
              onValueChange={(value) => {
                return state.setForm({ ...state.form, assigneeId: value });
              }}
            />
          </div>
          {state.form.assigneeId !== task.assigneeId && (
            <p className={styles.formIntro}>
              Reassignment returns this task to To do for the new assignee.
            </p>
          )}
          <div className={styles.field}>
            <span id={`${id}-priority-label`}>Priority</span>
            <Select
              id={`${id}-priority`}
              labelId={`${id}-priority-label`}
              value={state.form.priority}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
              ]}
              disabled={busy}
              animate
              fitViewport
              onValueChange={(value) => {
                return state.setForm({
                  ...state.form,
                  priority: value as Priority,
                });
              }}
            />
          </div>
          <label className={styles.field}>
            Deadline
            <DateInput
              type="datetime-local"
              required
              disabled={busy}
              value={state.form.deadline}
              onChange={(event) => {
                return state.setForm({
                  ...state.form,
                  deadline: event.target.value,
                });
              }}
            />
          </label>
          {canEditInstructions && (
            <label className={styles.field}>
              Instructions
              <textarea
                maxLength={5000}
                rows={4}
                disabled={busy}
                value={state.form.instructions}
                onChange={(event) => {
                  return state.setForm({
                    ...state.form,
                    instructions: event.target.value,
                  });
                }}
              />
            </label>
          )}
          <footer className={styles.reportFooter}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={state.dismiss}
            >
              Discard changes
            </button>
            <button
              type="submit"
              data-variant="primary"
              className={styles.primary}
              disabled={blocked || !state.changed}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </form>
      ) : (
        <form
          className={styles.reportForm}
          aria-label="Cancel task"
          onSubmit={(event) => {
            event.preventDefault();

            if (!blocked) {
              void state.cancel();
            }
          }}
        >
          <h3>Cancel task</h3>
          <p className={styles.formIntro}>
            The task stays in history and stops appearing in active task alerts.
          </p>
          <label className={styles.field}>
            Cancellation reason
            <textarea
              ref={reason}
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              disabled={busy}
              value={state.reason}
              onChange={(event) => {
                return state.setReason(event.target.value);
              }}
            />
          </label>
          <footer className={styles.reportFooter}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={state.dismiss}
            >
              Keep task
            </button>
            <button
              type="submit"
              className={styles.cancelAction}
              disabled={blocked || state.reason.trim().length < 3}
            >
              {busy ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}
