"use client";

import Link from "next/link";
import {
  ArrowRightUp,
  Box,
  Calendar,
  ClockCircle,
  FileSend,
} from "@/app/system/_role-designs/agent/components/SolarIcons";
import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import AgentProfileCard from "./AgentProfileCard";
import ReadFailure from "./AgentReadFailure";
import type { AgentDesk } from "./useAgentDesk";
import styles from "./agent-dashboard.module.css";

export function AgentDeskSummary({ desk }: { desk: AgentDesk }) {
  const { profile, batches, withdrawals, todo, inProgress } = desk;

  const profileKnown =
    !profile.loading && !profile.error && Boolean(profile.data);

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
    <div className={styles.summary}>
      <section
        className={styles.scopeCard}
        aria-labelledby="assigned-scope-title"
        aria-busy={batches.loading || profile.loading}
      >
        <header className={styles.featureHeading}>
          <h2 id="assigned-scope-title">Assigned batches</h2>
          <Box width={20} height={20} aria-hidden="true" />
        </header>
        <p className={styles.featuredValue}>
          {batches.loading || batches.error
            ? "—"
            : (batches.data?.total ?? "—")}
        </p>
        <AgentProfileCard resource={profile} compact />
        {batches.error && (
          <ReadFailure error={batches.error} retry={batches.refresh} />
        )}
        <Link className={styles.featureLink} href="/system/agent-network">
          View your assigned batches
          <ArrowRightUp width={16} height={16} aria-hidden="true" />
        </Link>
      </section>
      <div className={styles.summaryGrid}>
        <section className={styles.smallMetric} aria-busy={profile.loading}>
          <Link href="/system/enrollments?view=requests&status=PENDING">
            <span>
              <FileSend width={16} height={16} aria-hidden="true" />
              With Batch Manager
            </span>
            <strong>
              {profileKnown ? profile.data?.summary.requests.pending : "—"}
            </strong>
            <small>Awaiting an enrollment decision</small>
          </Link>
          {profile.error && (
            <ReadFailure error={profile.error} retry={profile.refresh} />
          )}
        </section>
        <section
          className={styles.smallMetric}
          aria-busy={todo.loading || inProgress.loading}
        >
          <Link href="/system/tasks">
            <span>
              <Calendar width={16} height={16} aria-hidden="true" />
              My open tasks
            </span>
            <strong>
              {tasksKnown ? todo.data!.count + inProgress.data!.count : "—"}
            </strong>
            <small>To do and in progress</small>
          </Link>
          {taskError && <ReadFailure error={taskError} retry={retryTasks} />}
        </section>
      </div>
      <section className={styles.waitingCard} aria-busy={withdrawals.loading}>
        <Link href="/system/withdrawals?status=AWAITING_AGENT">
          <ClockCircle width={19} height={19} aria-hidden="true" />
          <span>
            Withdrawals to review
            <small>Agent context needed before COO review</small>
          </span>
          <strong>
            {withdrawals.loading || withdrawals.error
              ? "—"
              : (withdrawals.data?.total ?? "—")}
          </strong>
        </Link>
        {withdrawals.error && (
          <ReadFailure error={withdrawals.error} retry={withdrawals.refresh} />
        )}
      </section>
    </div>
  );
}

export default function AgentDeskRail({ desk }: { desk: AgentDesk }) {
  const me = useMe();

  const { profile, batches } = desk;

  const profileKnown =
    !profile.loading && !profile.error && Boolean(profile.data);

  const linked = profile.data?.items.find((person) => {
    return person.id === String(me?.id);
  })?.agentProfile;

  return (
    <aside className={styles.rail}>
      <section
        className={styles.panel}
        aria-labelledby="assigned-batches-title"
        aria-busy={batches.loading}
      >
        <header className={styles.panelHeading}>
          <h2 id="assigned-batches-title">
            Your batches{" "}
            <span className={styles.count}>
              {batches.loading || batches.error
                ? "—"
                : (batches.data?.total ?? "—")}
            </span>
          </h2>
          <Box width={20} height={20} aria-hidden="true" />
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
                  <Box width={19} height={19} aria-hidden="true" />
                  <div>
                    <strong>{batch.code}</strong>
                    <small>{batch.model}</small>
                    <span>
                      {batch.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                  <dl className={styles.batchMembers}>
                    <dt>Members</dt>
                    <dd>{batch.memberCount}</dd>
                  </dl>
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
        <p className={styles.footnote}>
          Current memberships are not available capacity.
        </p>
        <Link className={styles.footerLink} href="/system/agent-network">
          View all assigned batches
          <ArrowRightUp width={15} height={15} aria-hidden="true" />
        </Link>
      </section>
    </aside>
  );
}
