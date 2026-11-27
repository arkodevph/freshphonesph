"use client";

import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/app/system/_role-designs/agent/components/WorkspaceNativeSelect";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Me } from "@/lib/api";
import { useAgentResource } from "@/lib/useAgentResource";
import type { Page, PublicEnrollmentApplication } from "@freshphones/contracts";
import { useEnrollmentLocation } from "../useEnrollmentLocation";
import { enrollmentHref } from "../enrollment-location";
import EnrollmentApplicationDetail from "@/app/system/_role-designs/agent/app/system/enrollments/applications/EnrollmentApplicationDetail";
import styles from "@/app/system/_role-designs/agent/app/system/enrollments/enrollment-workspace.module.css";

export default function EnrollmentApplications({
  me,
  applicationId,
}: {
  me: Me;
  applicationId?: string;
}) {
  const { location, navigate } = useEnrollmentLocation();

  const { page, status, q: query } = location;

  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  const params = new URLSearchParams({
    page: String(applicationId ? 1 : page),
    ...(!applicationId && query ? { q: query } : {}),
    ...(!applicationId && status ? { status } : {}),
    ...(applicationId ? { applicationId } : {}),
  });

  const workspace = useAgentResource<Page<PublicEnrollmentApplication>>(
    `/enrollment/applications?${params}`,
  );

  const listHref = enrollmentHref(location, { application: undefined });

  function setPage(value: number) {
    navigate({ page: value });
  }

  return (
    <div className={styles.workspace}>
      <section
        className={styles.panel}
        aria-labelledby="website-applications-title"
      >
        <h1 id="website-applications-title">Website applications</h1>
        <p>
          Applications are reviewed by their assigned Agent before enrollment
          requests go to a Batch Manager. Applications do not hold batch
          positions.
        </p>
        {applicationId && (
          <p>
            <Link className={styles.link} href={listHref}>
              View all website applications
            </Link>
          </p>
        )}
        {!applicationId && (
          <form
            className={styles.filters}
            onSubmit={(event) => {
              event.preventDefault();

              navigate({ q: search.trim(), page: 1 });
            }}
          >
            <label className={styles.field}>
              Search name, phone or email
              <input
                value={search}
                maxLength={100}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Application status
              <WorkspaceNativeSelect
                value={status}
                onChange={(event) => {
                  navigate({ status: event.target.value, page: 1 });
                }}
              >
                <option value="">All statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="FORWARDED">Forwarded to Manager</option>
                <option value="CLOSED">Closed</option>
              </WorkspaceNativeSelect>
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={workspace.loading}>
                Search applications
              </button>
            </div>
          </form>
        )}
        {!applicationId && workspace.loading && (
          <WorkspaceProgress label="Loading website applications…" />
        )}
        {!applicationId && workspace.error && (
          <div className={styles.error}>
            <p role="alert">{workspace.error}</p>
            <button
              className={styles.button}
              type="button"
              onClick={() => {
                void workspace.refresh();
              }}
            >
              Retry applications
            </button>
          </div>
        )}
        {!applicationId && !workspace.error && workspace.data && (
          <>
            <ul className={styles.list}>
              {workspace.data.items.map((application) => {
                return (
                  <li key={application.id}>
                    <h3>{application.contact.name}</h3>
                    <p>
                      {application.status === "FORWARDED"
                        ? "Forwarded to Manager"
                        : application.status === "CLOSED"
                          ? "Closed"
                          : "Received"}{" "}
                      · Agent {application.assignedAgent.name}
                    </p>
                    <p>
                      {new Date(application.createdAt).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </p>
                    <Link
                      className={styles.link}
                      href={enrollmentHref(location, {
                        application: application.id,
                      })}
                    >
                      Review application
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!workspace.data.items.length && (
              <p>No website applications in this view.</p>
            )}
            {!applicationId && (
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={page <= 1 || workspace.loading}
                  onClick={() => {
                    setPage(page - 1);
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {workspace.data.page} · {workspace.data.total}{" "}
                  applications
                </span>
                <button
                  type="button"
                  disabled={
                    workspace.loading ||
                    page * workspace.data.pageSize >= workspace.data.total
                  }
                  onClick={() => {
                    setPage(page + 1);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {applicationId && (
        <EnrollmentApplicationDetail
          key={applicationId}
          id={applicationId}
          me={me}
        />
      )}
    </div>
  );
}
