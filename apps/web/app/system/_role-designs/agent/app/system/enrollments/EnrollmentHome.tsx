"use client";

import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import Link from "next/link";
import { can, useMe } from "@/lib/useMe";
import AgentEnrollmentRequests from "./AgentEnrollmentRequests";
import EnrollmentFormWorkspace from "@/app/system/_role-designs/agent/app/system/enrollments/forms/EnrollmentFormWorkspace";
import EnrollmentApplications from "@/app/system/_role-designs/agent/app/system/enrollments/applications/EnrollmentApplications";
import styles from "@/app/system/_role-designs/agent/app/system/enrollments/enrollment-workspace.module.css";
import { useEnrollmentLocation } from "./useEnrollmentLocation";

export type EnrollmentView = "requests" | "applications" | "form";

export default function EnrollmentHome({
  view,
  requestId,
  applicationId,
}: {
  view?: EnrollmentView;
  requestId?: string;
  applicationId?: string;
}) {
  const me = useMe();

  const route = useEnrollmentLocation();

  view = route.location.view;

  requestId = route.location.request;

  applicationId = route.location.application;

  if (!me) {
    return <WorkspaceProgress label="Loading enrollment workspace…" />;
  }

  const tabs = [
    {
      id: "requests" as const,
      label: "Enrollment requests",
      allowed: can(
        me,
        "ENROLLMENT_SUBMIT",
        "ENROLLMENT_REVIEW",
        "AGENT_NETWORK_READ",
      ),
    },
    {
      id: "applications" as const,
      label: "Website applications",
      allowed: can(me, "ENROLLMENT_APPLICATION_READ"),
    },
    {
      id: "form" as const,
      label: "Enrollment form",
      allowed: can(me, "ENROLLMENT_FORM_MANAGE"),
    },
  ];

  const selected =
    view ??
    tabs.find((tab) => {
      return tab.allowed;
    })?.id;

  const permitted = tabs.some((tab) => {
    return tab.id === selected && tab.allowed;
  });

  return (
    <div className={styles.workspace}>
      {route.invalid && (
        <p className={styles.notice} role="status">
          These enrollment filters are invalid. Showing all requests.{" "}
          <button
            type="button"
            onClick={() => {
              route.navigate(
                {
                  view: "requests",
                  page: 1,
                  status: "",
                  q: "",
                  request: undefined,
                  application: undefined,
                  new: undefined,
                },
                true,
              );
            }}
          >
            Reset enrollment filters
          </button>
        </p>
      )}
      <nav className={styles.tabs} aria-label="Enrollment workspaces">
        {tabs
          .filter((tab) => {
            return tab.allowed;
          })
          .map((tab) => {
            return (
              <Link
                key={tab.id}
                href={`/system/enrollments?view=${tab.id}`}
                aria-current={selected === tab.id ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
      </nav>
      {!permitted ? (
        <p className={styles.panel} role="alert">
          Your account does not have access to this enrollment workspace.
        </p>
      ) : selected === "requests" ? (
        <AgentEnrollmentRequests key={String(me.id)} requestId={requestId} />
      ) : selected === "applications" ? (
        <EnrollmentApplications
          key={String(me.id)}
          me={me}
          applicationId={applicationId}
        />
      ) : (
        <EnrollmentFormWorkspace key={String(me.id)} />
      )}
    </div>
  );
}
