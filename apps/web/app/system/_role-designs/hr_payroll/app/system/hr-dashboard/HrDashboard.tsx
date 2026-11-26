"use client";

import Link from "next/link";
import { roleLabels } from "@freshphones/contracts";
import {
  Briefcase,
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
import WorkspaceDetails from "@/app/system/_role-designs/hr_payroll/components/WorkspaceDetails";
import { SkeletonLine } from "@/app/system/_role-designs/hr_payroll/components/WorkspaceProgress";
import CooTasks from "./CooTasks";
import PersonnelAvatars from "./PersonnelAvatars";
import { useHrOverview } from "./useHrOverview";
import styles from "./hr-dashboard.module.css";

const count = new Intl.NumberFormat("en-PH");

function Value({
  value,
  failed,
}: {
  value: number | undefined;
  failed?: boolean;
}) {
  if (failed) {
    return <span className={styles.unavailable}>Unavailable</span>;
  }

  return value === undefined ? (
    <SkeletonLine width="2ch" />
  ) : (
    count.format(value)
  );
}

function ReadError({
  error,
  refresh,
}: {
  error: string | null;
  refresh: () => void;
}) {
  return error ? (
    <div className={styles.error} role="alert">
      <p>{error}</p>
      <button type="button" onClick={refresh}>
        Try again
      </button>
    </div>
  ) : null;
}

export default function HrDashboard({ me }: { me: Me }) {
  const motion = useWorkspaceMotion();

  const access = {
    personnel: can(me, "STAFF_READ"),
    recruitment: can(me, "RECRUITMENT_MANAGE"),
    confidential: can(me, "HR_CONFIDENTIAL"),
  };

  const { personnel, recruitment, requests } = useHrOverview(access);

  const staff = personnel.data;

  const active = staff?.filter((person) => person.active).length;

  const summary = recruitment.data?.summary;

  const roleCounts = staff
    ? [...new Set(staff.map((person) => person.role))]
        .map((role) => ({
          role,
          total: staff.filter((person) => person.role === role).length,
          members: staff.filter((person) => person.role === role),
        }))
        .sort(
          (a, b) =>
            b.total - a.total ||
            roleLabels[a.role].localeCompare(roleLabels[b.role]),
        )
    : [];

  const firstName = me.full_name.trim().split(/\s+/)[0];

  const metrics = [
    ...(access.personnel
      ? [
          {
            label: "Active personnel",
            value: active,
            failed: Boolean(personnel.error),
            detail: staff
              ? `${count.format(staff.length)} in the directory`
              : "Personnel directory",
            href: "/system/personnel",
            Icon: Users,
            featured: true,
          },
        ]
      : []),
    ...(access.recruitment
      ? [
          {
            label: "Open positions",
            value: summary?.openJobs,
            failed: Boolean(recruitment.error),
            detail: "Current job openings",
            href: "/system/recruitment",
            Icon: Briefcase,
            featured: false,
          },
          {
            label: "Applicants to review",
            value: summary?.awaitingReview,
            failed: Boolean(recruitment.error),
            detail: summary
              ? `${count.format(summary.applicants)} applicants in total`
              : "Recruitment",
            href: "/system/recruitment",
            Icon: UserPlus,
            featured: false,
          },
        ]
      : []),
    ...(access.confidential
      ? [
          {
            label: "Pending HR requests",
            value: requests.data?.count,
            failed: Boolean(requests.error),
            detail: "Awaiting a COO decision",
            href: "/system/hr-actions",
            Icon: ShieldCheck,
            featured: false,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.dashboard} ref={motion}>
      <header className={styles.heading}>
        <div>
          <p>
            {new Intl.DateTimeFormat("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Manila",
            }).format(new Date())}
          </p>
          <h2>{firstName ? `Hello, ${firstName}.` : "Hello."}</h2>
        </div>
        {access.personnel && (
          <Link href="/system/personnel" className={styles.primaryAction}>
            <Users aria-hidden="true" />
            Personnel directory
          </Link>
        )}
      </header>

      <section className={styles.metrics} aria-label="HR overview">
        {metrics.map(
          ({ label, value, failed, detail, href, Icon, featured }) => (
            <Link
              key={label}
              href={href}
              className={styles.metric}
              data-featured={featured || undefined}
            >
              <div>
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong>
                <Value value={value} failed={failed} />
              </strong>
              <small>{detail}</small>
            </Link>
          ),
        )}
      </section>

      <div className={styles.mainGrid}>
        {access.personnel && (
          <section
            className={styles.panel}
            aria-labelledby="hr-people-title"
            aria-busy={personnel.pending}
          >
            <header className={styles.panelHeader}>
              <div>
                <h3 id="hr-people-title">Personnel by role</h3>
                <p>
                  {staff
                    ? `${count.format(active ?? 0)} active · ${count.format(staff.length - (active ?? 0))} inactive`
                    : "Personnel directory"}
                </p>
              </div>
              <Link href="/system/personnel" className={styles.textLink}>
                View directory
              </Link>
            </header>
            <ReadError error={personnel.error} refresh={personnel.refresh} />
            {!staff && !personnel.error ? (
              <div className={styles.roleGrid} aria-label="Loading personnel">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div className={styles.roleItem} key={i}>
                    <SkeletonLine width="18ch" />
                    <PersonnelAvatars loading />
                  </div>
                ))}
              </div>
            ) : staff && staff.length ? (
              <>
                <ul className={styles.roleGrid}>
                  {roleCounts.slice(0, 6).map(({ role, total, members }) => (
                    <li key={role} className={styles.roleItem}>
                      <div>
                        <span>{roleLabels[role]}</span>
                        <strong>{count.format(total)}</strong>
                      </div>
                      <PersonnelAvatars members={members} />
                    </li>
                  ))}
                </ul>
                {roleCounts.length > 6 && (
                  <WorkspaceDetails className={styles.moreRoles}>
                    <summary>{`View all ${roleCounts.length} roles`}</summary>
                    <ul className={styles.roleGrid}>
                      {roleCounts.slice(6).map(({ role, total, members }) => (
                        <li key={role} className={styles.roleItem}>
                          <div>
                            <span>{roleLabels[role]}</span>
                            <strong>{count.format(total)}</strong>
                          </div>
                          <PersonnelAvatars members={members} />
                        </li>
                      ))}
                    </ul>
                  </WorkspaceDetails>
                )}
              </>
            ) : (
              !personnel.error && (
                <div className={styles.empty}>
                  <Users aria-hidden="true" />
                  <strong>No personnel yet</strong>
                  <Link href="/system/personnel" className={styles.textLink}>
                    Open directory
                  </Link>
                </div>
              )
            )}
          </section>
        )}

        {access.recruitment && (
          <section
            className={styles.panel}
            aria-labelledby="hr-hiring-title"
            aria-busy={recruitment.pending}
          >
            <header className={styles.panelHeader}>
              <div>
                <h3 id="hr-hiring-title">Recruitment</h3>
                <p>Openings and applicant review</p>
              </div>
              <Link href="/system/recruitment" className={styles.textLink}>
                Manage
              </Link>
            </header>
            <ReadError
              error={recruitment.error}
              refresh={recruitment.refresh}
            />
            {!recruitment.data && !recruitment.error ? (
              <div className={styles.empty}>
                <SkeletonLine width="20ch" />
                <SkeletonLine width="28ch" />
              </div>
            ) : (
              recruitment.data && (
                <>
                  <div className={styles.hiringStats}>
                    <div>
                      <strong>{count.format(summary?.applicants ?? 0)}</strong>
                      <span>Total applicants</span>
                    </div>
                    <div>
                      <strong>
                        {count.format(summary?.awaitingReview ?? 0)}
                      </strong>
                      <span>Awaiting review</span>
                    </div>
                  </div>
                  {recruitment.data.jobs.length ? (
                    <ul className={styles.jobList}>
                      {recruitment.data.jobs.map((job) => (
                        <li key={job.id}>
                          <Link href="/system/recruitment">
                            <Briefcase aria-hidden="true" />
                            <span>
                              <strong>{job.title}</strong>
                              <small>
                                {[job.employment_type, job.location]
                                  .filter(Boolean)
                                  .join(" · ") || "Open position"}
                              </small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={styles.hiringEmpty}>
                      <Briefcase aria-hidden="true" />
                      <div>
                        <strong>No open positions</strong>
                        <p>Manage openings when you're ready to hire.</p>
                      </div>
                      <Link
                        href="/system/recruitment"
                        className={styles.secondaryAction}
                      >
                        Job openings
                      </Link>
                    </div>
                  )}
                </>
              )
            )}
          </section>
        )}

        {can(me, "TASK_READ") && <CooTasks />}

        {access.confidential && (
          <section
            className={styles.panel}
            aria-labelledby="hr-decisions-title"
            aria-busy={requests.pending}
          >
            <header className={styles.panelHeader}>
              <div>
                <h3 id="hr-decisions-title">HR requests</h3>
                <p>Recommendations submitted for review</p>
              </div>
              <Link href="/system/hr-actions" className={styles.textLink}>
                View all
              </Link>
            </header>
            <ReadError error={requests.error} refresh={requests.refresh} />
            {!requests.data && !requests.error ? (
              <div className={styles.empty}>
                <SkeletonLine width="22ch" />
              </div>
            ) : (
              requests.data && (
                <div className={styles.requestSummary}>
                  <span className={styles.stateIcon}>
                    {requests.data.count ? (
                      <ShieldCheck aria-hidden="true" />
                    ) : (
                      <CheckCircle aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <strong>
                      {requests.data.count
                        ? `${count.format(requests.data.count)} awaiting decision`
                        : "No pending decisions"}
                    </strong>
                    <p>
                      {requests.data.count
                        ? "COO reviews and decides on submitted requests."
                        : "Submitted requests and decision history are available in HR actions."}
                    </p>
                  </div>
                </div>
              )
            )}
          </section>
        )}
      </div>

      <section
        className={`${styles.panel} ${styles.onboarding}`}
        aria-labelledby="hr-onboarding-title"
      >
        <header className={styles.panelHeader}>
          <div>
            <h3 id="hr-onboarding-title">Onboarding handoff</h3>
          </div>
        </header>
        <ol className={styles.steps}>
          {[
            {
              title: "Orientation & training",
              detail: "Completed externally",
              owner: "Trainee",
            },
            {
              title: "Training evidence",
              detail: "Record completion and submit",
              owner: "HR",
            },
            {
              title: "Account enrollment",
              detail: "Review and create the account",
              owner: "COO",
            },
          ].map(({ title, detail, owner }, index) => (
            <li key={title}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
              <span className={styles.stepOwner}>{owner}</span>
            </li>
          ))}
        </ol>
        <WorkspaceDetails className={styles.notes}>
          <summary>HR access &amp; payroll</summary>
          <p>
            {access.confidential
              ? "Confidential HR access approved."
              : "Private applicant evidence and HR requests require an approved confidential grant."}{" "}
            Payroll preparation remains external.
          </p>
        </WorkspaceDetails>
      </section>
    </div>
  );
}
