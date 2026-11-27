"use client";

import Link from "next/link";
import { FileText, Users } from "@phosphor-icons/react";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import ReadFailure from "./AgentReadFailure";
import type { AgentDesk } from "./useAgentDesk";
import styles from "./agent-dashboard.module.css";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

export function ApplicationInbox({
  applications,
}: Pick<AgentDesk, "applications">) {
  return (
    <section
      className={styles.panel}
      aria-labelledby="application-inbox-title"
      aria-busy={applications.loading}
    >
      <header className={styles.panelHeading}>
        <div>
          <h2 id="application-inbox-title">
            Website applications{" "}
            <span className={styles.count}>
              {applications.loading || applications.error
                ? "—"
                : (applications.data?.total ?? "—")}
            </span>
          </h2>
        </div>
        <Link href="/system/enrollments?view=applications">
          All applications
        </Link>
      </header>
      {applications.error ? (
        <ReadFailure error={applications.error} retry={applications.refresh} />
      ) : !applications.data ? (
        <WorkspaceProgress label="Loading applications…" />
      ) : !applications.data.items.length ? (
        <div className={styles.empty}>
          <FileText size={30} weight="light" />
          <h3>No applications to review</h3>
          <p>New website applications assigned to you appear here.</p>
          <Link href="/system/enrollments?view=applications">
            View application history
          </Link>
        </div>
      ) : (
        <ul className={styles.rows}>
          {applications.data.items.slice(0, 5).map((application) => {
            return (
              <li key={application.id}>
                <span className={styles.avatar}>
                  {application.contact.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{application.contact.name}</strong>
                  <small>
                    {application.contact.phone ||
                      application.contact.email ||
                      "Contact details in application"}{" "}
                    · {date(application.createdAt)}
                  </small>
                </div>
                <Link
                  className={styles.review}
                  aria-label={`Review application: ${application.contact.name}`}
                  href={`/system/enrollments?view=applications&application=${encodeURIComponent(application.id)}`}
                >
                  Review
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!applications.loading &&
        !applications.error &&
        applications.data &&
        applications.data.total > 5 && (
          <p className={styles.footnote}>
            Showing 5 of {applications.data.total} received applications.
          </p>
        )}
    </section>
  );
}

export function EnrollmentHandoffs({ requests }: Pick<AgentDesk, "requests">) {
  return (
    <section
      className={styles.panel}
      aria-labelledby="recent-enrollments-title"
      aria-busy={requests.loading}
    >
      <header className={styles.panelHeading}>
        <h2 id="recent-enrollments-title">Enrollment handoffs</h2>
        <Link href="/system/enrollments?view=requests">All requests</Link>
      </header>
      {requests.error ? (
        <ReadFailure error={requests.error} retry={requests.refresh} />
      ) : !requests.data ? (
        <WorkspaceProgress label="Loading enrollment requests…" />
      ) : !requests.data.items.length ? (
        <p className={styles.state}>No enrollment requests submitted yet.</p>
      ) : (
        <ul className={styles.rows}>
          {requests.data.items.slice(0, 4).map((request) => {
            return (
              <li key={request.id}>
                <span className={styles.avatar}>
                  <Users size={18} />
                </span>
                <div>
                  <strong>{request.name}</strong>
                  <small>{request.batchCode}</small>
                </div>
                <Link
                  className={styles.requestLink}
                  href={`/system/enrollments?request=${encodeURIComponent(request.id)}`}
                >
                  <span data-status={request.status}>
                    {request.status === "PENDING"
                      ? "With Manager"
                      : request.status === "APPROVED"
                        ? "Approved"
                        : "Rejected"}
                  </span>
                  <small>View request</small>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
