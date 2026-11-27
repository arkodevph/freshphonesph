"use client";

import Link from "next/link";
import { Stack } from "@phosphor-icons/react";
import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import AgentProfileCard from "./AgentProfileCard";
import ReadFailure from "./AgentReadFailure";
import type { AgentDesk } from "./useAgentDesk";
import styles from "./agent-dashboard.module.css";

export default function AgentDeskRail({ desk }: { desk: AgentDesk }) {
  const me = useMe();

  const { profile, batches, withdrawals, todo, inProgress } = desk;

  const profileKnown =
    !profile.loading && !profile.error && Boolean(profile.data);

  const linked = profile.data?.items.find((person) => {
    return person.id === String(me?.id);
  })?.agentProfile;

  const tasksKnown =
    !todo.loading &&
    !inProgress.loading &&
    !todo.error &&
    !inProgress.error &&
    todo.data &&
    inProgress.data;

  const taskError = todo.error || inProgress.error;

  async function retryTasks() {
    await Promise.all([todo.refresh(), inProgress.refresh()]);
  }

  return (
    <aside className={styles.rail}>
      <AgentProfileCard resource={profile} />
      <section
        className={styles.panel}
        aria-labelledby="assigned-batches-title"
        aria-busy={batches.loading}
      >
        <header className={styles.panelHeading}>
          <h2 id="assigned-batches-title">
            Assigned batches{" "}
            <span className={styles.count}>
              {batches.loading || batches.error
                ? "—"
                : (batches.data?.total ?? "—")}
            </span>
          </h2>
        </header>
        {batches.error ? (
          <ReadFailure error={batches.error} retry={batches.refresh} />
        ) : !batches.data ? (
          <WorkspaceProgress label="Loading assigned batches…" />
        ) : !batches.data.items.length ? (
          <p className={styles.state}>
            {!profileKnown
              ? "No batches are currently available. Check your Agent profile above."
              : !linked?.active
                ? "Batch access needs an active linked Agent profile. Ask the COO to review your assignment."
                : "No batches assigned. Ask the COO to review your batch assignments."}
          </p>
        ) : (
          <ul className={styles.batches}>
            {batches.data.items.slice(0, 3).map((batch) => {
              return (
                <li key={batch.id}>
                  <Stack size={20} />
                  <div>
                    <strong>{batch.code}</strong>
                    <small>{batch.model}</small>
                    <span>
                      {batch.memberCount} current memberships ·{" "}
                      {batch.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!batches.loading &&
          !batches.error &&
          batches.data &&
          batches.data.total > 3 && (
            <p className={styles.footnote}>
              Showing 3 of {batches.data.total} assigned batches.
            </p>
          )}
        <Link className={styles.footerLink} href="/system/agent-network">
          View all assigned batches
        </Link>
      </section>
      <section className={styles.panel} aria-label="Agent follow-up">
        <h2>Follow-up</h2>
        <Link
          className={styles.followup}
          href="/system/enrollments?view=requests&status=PENDING"
        >
          <span>With Batch Manager</span>
          <strong>
            {profileKnown ? profile.data?.summary.requests.pending : "—"}
          </strong>
        </Link>
        {profile.error && (
          <ReadFailure error={profile.error} retry={profile.refresh} />
        )}
        <Link
          className={styles.followup}
          href="/system/withdrawals?status=AWAITING_AGENT"
        >
          <span>Withdrawals to review</span>
          <strong>
            {withdrawals.loading || withdrawals.error
              ? "—"
              : (withdrawals.data?.total ?? "—")}
          </strong>
        </Link>
        {withdrawals.error && (
          <ReadFailure error={withdrawals.error} retry={withdrawals.refresh} />
        )}
        <Link className={styles.followup} href="/system/tasks">
          <span>My open tasks</span>
          <strong>
            {tasksKnown ? todo.data!.count + inProgress.data!.count : "—"}
          </strong>
        </Link>
        {taskError && <ReadFailure error={taskError} retry={retryTasks} />}
        <p className={styles.footnote}>
          Open tasks are to do or in progress. Submitted, done and cancelled
          tasks are excluded.
        </p>
        <Link className={styles.footerLink} href="/system/tasks">
          View my tasks
        </Link>
      </section>
    </aside>
  );
}
