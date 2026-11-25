"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceNativeSelect";
import DateInput from "@/app/system/_role-designs/pioneer_agent/components/DateInput";
import { Plus } from "@phosphor-icons/react";
import AnimatedDisclosure from "@/app/system/_role-designs/pioneer_agent/components/AnimatedDisclosure";
import type { Dispatch, SetStateAction } from "react";
import { type FormEvent } from "react";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/tasks/staff-tasks.module.css";
import {
  Assignee,
  label,
  Priority,
} from "@/app/system/_role-designs/pioneer_agent/app/system/tasks/task-view";

type Props = {
  assign: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  form: {
    title: string;
    instructions: string;
    assigneeId: string;
    priority: Priority;
    deadline: string;
  };
  setForm: Dispatch<
    SetStateAction<{
      title: string;
      instructions: string;
      assigneeId: string;
      priority: Priority;
      deadline: string;
    }>
  >;
  assignees: Assignee[];
  busy: boolean;
  open?: boolean;
  onExpandedChange?: (open: boolean) => void;
};

export default function TaskFiltersPanel({
  assign,
  form,
  setForm,
  assignees,
  busy,
  open,
  onExpandedChange,
}: Props) {
  return (
    <AnimatedDisclosure
      title="Assign a task"
      className={`${styles.card} ${styles.assignment}`}
      open={open}
      onExpandedChange={onExpandedChange}
      detailsProps={{ id: "pioneer-task-assignment" }}
    >
      <form onSubmit={assign} className={styles.assignForm}>
        <label className={styles.wide}>
          Title
          <input
            disabled={busy}
            required
            minLength={2}
            maxLength={200}
            value={form.title}
            onChange={(event) => {
              return setForm({ ...form, title: event.target.value });
            }}
            placeholder="e.g. Follow up on enrollment requirements"
          />
        </label>
        <label>
          Assignee
          <WorkspaceNativeSelect
            disabled={busy}
            required
            value={form.assigneeId}
            onChange={(event) => {
              return setForm({ ...form, assigneeId: event.target.value });
            }}
          >
            <option value="">Choose staff member</option>
            {assignees.map((person) => {
              return (
                <option key={person.id} value={person.id}>
                  {person.name} · {label(person.role)}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
        <label>
          Priority
          <WorkspaceNativeSelect
            disabled={busy}
            value={form.priority}
            onChange={(event) => {
              return setForm({
                ...form,
                priority: event.target.value as Priority,
              });
            }}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </WorkspaceNativeSelect>
        </label>
        <label>
          Deadline (your local time)
          <DateInput
            disabled={busy}
            required
            type="datetime-local"
            value={form.deadline}
            onChange={(event) => {
              return setForm({ ...form, deadline: event.target.value });
            }}
          />
        </label>
        <label className={styles.full}>
          Instructions
          <textarea
            disabled={busy}
            maxLength={5000}
            rows={3}
            value={form.instructions}
            onChange={(event) => {
              return setForm({ ...form, instructions: event.target.value });
            }}
            placeholder="What should be done?"
          />
        </label>
        <div className={styles.formActions}>
          <button
            data-variant="primary"
            className={styles.primary}
            disabled={busy}
            type="submit"
          >
            <Plus /> {busy ? "Saving…" : "Assign task"}
          </button>
        </div>
      </form>
    </AnimatedDisclosure>
  );
}
