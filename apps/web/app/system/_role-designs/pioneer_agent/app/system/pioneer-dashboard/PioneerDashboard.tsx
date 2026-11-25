"use client";

import Link from "next/link";
import type {
  PioneerTeamOverview,
  PioneerTaskOverview,
} from "@freshphones/contracts";
import {
  ArrowRightUp,
  Calendar,
  CheckCircle,
  Compass,
  DangerCircle,
  FileText,
  UserCircle,
} from "@/app/system/_role-designs/pioneer_agent/components/SolarIcons";
import { can, useMe } from "@/lib/useMe";
import { canOpenWorkspace } from "@/lib/workspace-access";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { label, type Task, type Page } from "../tasks/task-view";
import PioneerTaskSummary from "./PioneerTaskSummary";
import { usePioneerRead } from "./usePioneerDashboard";
import styles from "./pioneer-dashboard.module.css";

type ReadState<T> = ReturnType<typeof usePioneerRead<T>>;

const destinations = [
  {
    href: "/system/agent-network",
    title: "Agent network",
    detail: "Agents and assigned batches",
    Icon: Compass,
  },
  {
    href: "/system/enrollments",
    title: "Enrollment progress",
    detail: "Requests and review outcomes",
    Icon: FileText,
  },
  {
    href: "/system/tasks",
    title: "Coaching and tasks",
    detail: "Your work and team follow-ups",
    Icon: Calendar,
  },
  {
    href: "/system/personnel",
    title: "Team directory",
    detail: "Reporting relationships",
    Icon: UserCircle,
  },
];

function ReadNotice({
  error,
  stale,
  refresh,
}: {
  error: string | null;
  stale: boolean;
  refresh: () => Promise<void>;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className={styles.error} role="alert">
      <p>{error}</p>
      {stale && (
        <p>
          Showing the last successful update. These records may have changed.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          return void refresh();
        }}
      >
        Try again
      </button>
    </div>
  );
}

function displayCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-PH").format(value);
}

function EnrollmentSummary({ team }: { team: ReadState<PioneerTeamOverview> }) {
  return (
    <section
      className={styles.summary}
      aria-labelledby="pioneer-enrollment-title"
      aria-busy={team.pending}
    >
      <div className={styles.summaryGrid}>
        <div className={styles.featuredMetric}>
          <div className={styles.featureHeading}>
            <h3 id="pioneer-enrollment-title">Enrollment progress</h3>
            <FileText />
          </div>
          <dl>
            <dt>Pending approval</dt>
            <dd>{displayCount(team.data?.enrollments.pending ?? null)}</dd>
          </dl>
          <p>Current active Agent accounts · all recorded dates</p>
          <Link href="/system/enrollments">
            View requests <ArrowRightUp />
          </Link>
        </div>
        <div className={styles.smallMetric}>
          <dl>
            <dt>
              <CheckCircle /> Approved
            </dt>
            <dd>{displayCount(team.data?.enrollments.approved ?? null)}</dd>
          </dl>
        </div>
        <div className={styles.smallMetric}>
          <dl>
            <dt>
              <DangerCircle /> Rejected
            </dt>
            <dd>{displayCount(team.data?.enrollments.rejected ?? null)}</dd>
          </dl>
        </div>
        <dl className={styles.totalMetric}>
          <dt>
            <FileText />
            <span>
              Total requests<small>From your current team</small>
            </span>
          </dt>
          <dd>{displayCount(team.data?.enrollments.total ?? null)}</dd>
        </dl>
      </div>
      <ReadNotice
        error={team.error}
        stale={Boolean(team.data)}
        refresh={team.refresh}
      />
      {team.pending && !team.data && (
        <WorkspaceProgress label="Loading enrollment progress…" />
      )}
      {team.updatedAt && (
        <p className={styles.updated}>
          Updated{" "}
          {team.updatedAt.toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          })}{" "}
          PHT
        </p>
      )}
    </section>
  );
}

function AgentTeam({ team }: { team: ReadState<PioneerTeamOverview> }) {
  return (
    <section
      className={`${styles.panel} ${styles.teamPanel}`}
      aria-labelledby="pioneer-agents-title"
      aria-busy={team.pending}
    >
      <header className={styles.panelHeading}>
        <div>
          <h3 id="pioneer-agents-title">Assigned Agents</h3>
          <p>Active accounts currently assigned to you</p>
        </div>
        <Link href="/system/agent-network">
          View team <ArrowRightUp />
        </Link>
      </header>
      <dl className={styles.teamCounts} aria-label="Assigned Agent totals">
        {(
          [
            ["total", "Assigned Agents"],
            ["ready", "Active profile"],
            ["missingProfile", "No linked profile"],
            ["inactiveProfile", "Inactive profile"],
          ] as const
        ).map(([key, title]) => {
          return (
            <div key={key}>
              <dt>{title}</dt>
              <dd>{displayCount(team.data?.agents[key] ?? null)}</dd>
            </div>
          );
        })}
      </dl>
      {!team.data ? (
        team.error ? (
          <p className={styles.muted}>
            Team details are unavailable. Retry the enrollment overview.
          </p>
        ) : (
          <WorkspaceProgress label="Loading assigned Agents…" />
        )
      ) : team.data.agents.total === 0 ? (
        <div className={styles.teamEmpty}>
          <span className={styles.emptyIcon}>
            <UserCircle />
          </span>
          <strong>No assigned Agents yet</strong>
          <p>
            Your team’s profiles and assigned batches will appear here. The COO
            manages team assignments.
          </p>
          <Link className={styles.secondaryAction} href="/system/agent-network">
            Open Agent network <ArrowRightUp />
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {team.data.preview.map((agent) => {
              return (
                <li className={styles.agent} key={agent.id}>
                  <span className={styles.avatar} aria-hidden="true">
                    {agent.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => {
                        return part[0];
                      })
                      .join("")}
                  </span>
                  <div>
                    <strong>{agent.name}</strong>
                    <span>
                      {agent.agentProfile?.code ?? "Agent profile not linked"}
                    </span>
                  </div>
                  {agent.agentProfile?.active === false && (
                    <span className={styles.profileState}>
                      Profile inactive
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className={styles.previewNote}>
            Showing {team.data.preview.length} of{" "}
            {displayCount(team.data.agents.total)} assigned Agents. Profile
            status describes the linked profile, not training or performance.
          </p>
        </>
      )}
    </section>
  );
}

function RecentTasks({
  tasks,
  summary,
}: {
  tasks: ReadState<Page<Task>>;
  summary: ReadState<PioneerTaskOverview>;
}) {
  return (
    <section
      className={`${styles.panel} ${styles.taskPanel}`}
      aria-labelledby="pioneer-tasks-title"
      aria-busy={tasks.pending}
    >
      <header className={styles.panelHeading}>
        <div>
          <h3 id="pioneer-tasks-title">Recent tasks</h3>
          <p>Your work and assigned-Agent follow-ups</p>
        </div>
        <Link href="/system/tasks">
          View tasks <ArrowRightUp />
        </Link>
      </header>
      <PioneerTaskSummary data={summary.data} />
      <ReadNotice
        error={summary.error}
        stale={Boolean(summary.data)}
        refresh={summary.refresh}
      />
      {!summary.data && !summary.error && (
        <WorkspaceProgress label="Loading task totals…" />
      )}
      <ReadNotice
        error={tasks.error}
        stale={Boolean(tasks.data)}
        refresh={tasks.refresh}
      />
      {!tasks.data ? (
        !tasks.error && <WorkspaceProgress label="Loading team tasks…" />
      ) : !tasks.data.results.length ? (
        <div className={styles.taskEmpty}>
          <Calendar />
          <div>
            <strong>No tasks in your current team scope</strong>
            <p>Assignments for you and your Agents will appear here.</p>
            <Link href="/system/tasks">
              Open task workspace <ArrowRightUp />
            </Link>
          </div>
        </div>
      ) : (
        <ul className={styles.list}>
          {tasks.data.results.slice(0, 3).map((task) => {
            return (
              <li key={task.id}>
                <Link
                  className={styles.task}
                  href={`/system/tasks?task=${encodeURIComponent(task.id)}`}
                >
                  <Calendar />
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.assigneeName}</span>
                  </div>
                  <span className={styles.status}>{label(task.status)}</span>
                  <ArrowRightUp />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function PioneerDashboard() {
  const me = useMe();

  const team = usePioneerRead<PioneerTeamOverview>(
    can(me, "AGENT_NETWORK_READ") ? "/pioneer/overview/team" : null,
  );

  const taskSummary = usePioneerRead<PioneerTaskOverview>(
    can(me, "TASK_READ") ? "/pioneer/overview/tasks" : null,
  );

  const tasks = usePioneerRead<Page<Task>>(
    can(me, "TASK_READ") ? "/tasks?page=1" : null,
  );

  if (!me) {
    return <WorkspaceProgress label="Loading your workspace…" />;
  }

  const firstName = me.full_name.trim().split(/\s+/)[0];

  const pending = team.pending || tasks.pending || taskSummary.pending;

  const tools = destinations.filter(({ href }) => {
    return canOpenWorkspace(me.role, href, me.permissions);
  });

  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <h2>{firstName ? `Hello, ${firstName}.` : "Hello."}</h2>
        <div className={styles.headingActions}>
          <button
            className={styles.refresh}
            type="button"
            disabled={pending}
            onClick={() => {
              void team.refresh();

              void tasks.refresh();

              void taskSummary.refresh();
            }}
          >
            {pending ? "Updating…" : "Refresh overview"}
          </button>
          {can(me, "AGENT_NETWORK_READ") && (
            <Link className={styles.primaryAction} href="/system/agent-network">
              <UserCircle /> View Agent team
            </Link>
          )}
        </div>
      </header>
      {can(me, "AGENT_NETWORK_READ") && (
        <div className={styles.overview}>
          <EnrollmentSummary team={team} />
          <AgentTeam team={team} />
        </div>
      )}
      <div className={styles.workArea}>
        {can(me, "TASK_READ") && (
          <RecentTasks tasks={tasks} summary={taskSummary} />
        )}
        <section
          className={`${styles.panel} ${styles.toolsPanel}`}
          aria-labelledby="pioneer-tools-title"
        >
          <header className={styles.panelHeading}>
            <div>
              <h3 id="pioneer-tools-title">Your workspaces</h3>
              <p>The tools for your Agent team</p>
            </div>
            <Compass className={styles.panelIcon} />
          </header>
          <nav
            className={styles.tools}
            aria-label="Pioneer workspace shortcuts"
          >
            {tools.map(({ href, title, detail, Icon }) => {
              return (
                <Link href={href} className={styles.tool} key={href}>
                  <Icon />
                  <div>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </section>
      </div>
    </div>
  );
}
