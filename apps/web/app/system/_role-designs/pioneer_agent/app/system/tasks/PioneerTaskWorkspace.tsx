"use client";

import { Suspense, useEffect, useState } from "react";
import { can, useMe } from "@/lib/useMe";
import type { Me } from "@/lib/api";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { Calendar } from "@/app/system/_role-designs/pioneer_agent/components/SolarIcons";
import TaskFiltersPanel from "./TaskFiltersPanel";
import PioneerTaskDialog from "./PioneerTaskDialog";
import PioneerTaskList from "./PioneerTaskList";
import { usePioneerTaskList } from "./usePioneerTaskList";
import { usePioneerTaskDetail } from "./usePioneerTaskDetail";
import { usePioneerAssignment } from "./usePioneerAssignment";
import styles from "./staff-tasks.module.css";

export default function PioneerTaskWorkspace() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading task access…" />;
  }

  if (me.role !== "pioneer_agent" || !can(me, "TASK_READ")) {
    return (
      <section>
        <h1>No access</h1>
        <p>Pioneer task access is required.</p>
      </section>
    );
  }

  return (
    <Suspense fallback={<WorkspaceProgress label="Loading tasks…" />}>
      <TaskWorkspace me={me} />
    </Suspense>
  );
}

function TaskWorkspace({ me }: { me: Me }) {
  const list = usePioneerTaskList();

  const detail = usePioneerTaskDetail(list.taskId, list.navigate, list.reload);

  const assignment = usePioneerAssignment(list.reload);

  const [assignmentOpen, setAssignmentOpen] = useState(false);

  useEffect(() => {
    if (!assignmentOpen) {
      return;
    }

    let observer: ResizeObserver | null = null;

    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(
        "#pioneer-task-assignment input",
      );

      const panel = document.getElementById("pioneer-task-assignment");

      input?.focus();

      function reveal() {
        if (document.activeElement === input) {
          input?.scrollIntoView({ behavior: "instant", block: "center" });
        }
      }

      reveal();

      if (panel) {
        observer = new ResizeObserver(reveal);

        observer.observe(panel);
      }
    });

    return () => {
      cancelAnimationFrame(frame);

      observer?.disconnect();
    };
  }, [assignmentOpen]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.icon}>
          <Calendar />
        </div>
        <div>
          <h1>Coaching and tasks</h1>
          <p>Your assigned work and current Agent team follow-ups.</p>
        </div>
        {can(me, "TASK_ASSIGN") && (
          <button
            type="button"
            className={styles.primary}
            data-variant="primary"
            aria-expanded={assignmentOpen}
            aria-controls="pioneer-task-assignment"
            onClick={() => {
              setAssignmentOpen(true);

              if (assignmentOpen) {
                const input = document.querySelector<HTMLInputElement>(
                  "#pioneer-task-assignment input",
                );

                input?.focus();

                input?.scrollIntoView({ behavior: "instant", block: "center" });
              }
            }}
          >
            Assign task
          </button>
        )}
      </header>
      <PioneerTaskList list={list} />
      {can(me, "TASK_ASSIGN") && (
        <div>
          {assignment.error && (
            <p className={styles.error} role="alert">
              {assignment.error}
            </p>
          )}
          {assignment.notice && (
            <p className={styles.success} role="status">
              {assignment.notice}
            </p>
          )}
          {assignment.lookupError && (
            <div className={styles.error} role="alert">
              <p>Assignees could not refresh. {assignment.lookupError}</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  void assignment.loadAssignees();
                }}
              >
                Retry assignees
              </button>
            </div>
          )}
          <TaskFiltersPanel
            {...assignment}
            open={assignmentOpen}
            onExpandedChange={setAssignmentOpen}
          />
        </div>
      )}
      <PioneerTaskDialog me={me} detail={detail} />
    </main>
  );
}
