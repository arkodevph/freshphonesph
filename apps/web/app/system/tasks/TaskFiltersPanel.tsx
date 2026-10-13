"use client";

import { Plus } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { type FormEvent } from "react";
import styles from "./staff-tasks.module.css";
import { Assignee, label, Priority } from "./task-view";

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
};

export default function TaskFiltersPanel({
  assign,
  form,
  setForm,
  assignees,
  busy,
}: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.eyebrow}>New assignment</span>
          <h2>Assign a task</h2>
        </div>
      </div>
      <form onSubmit={assign} className={styles.assignForm}>
        <label className={styles.wide}>
          Title
          <input
            required
            minLength={2}
            maxLength={200}
            value={form.title}
            onChange={(event) => {
              return setForm({ ...form, title: event.target.value });
            }}
            placeholder="e.g. Verify batch records"
          />
        </label>
        <label>
          Assignee
          <select
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
          </select>
        </label>
        <label>
          Priority
          <select
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
          </select>
        </label>
        <label>
          Deadline
          <input
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
          <button className={styles.primary} disabled={busy} type="submit">
            <Plus /> {busy ? "Saving…" : "Assign task"}
          </button>
        </div>
      </form>
    </section>
  );
}
