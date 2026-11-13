"use client";

import WorkspaceProgress from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import Link from "next/link";
import { can, useMe } from "@/lib/useMe";
import RoleWorkspace from "@/app/system/_role-designs/system_admin/app/system/RoleWorkspace";
import EnrollmentFormWorkspace from "@/app/system/_role-designs/system_admin/app/system/enrollments/forms/EnrollmentFormWorkspace";
import EnrollmentApplications from "@/app/system/_role-designs/system_admin/app/system/enrollments/applications/EnrollmentApplications";
import styles from "@/app/system/_role-designs/system_admin/app/system/enrollments/enrollment-workspace.module.css";

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
        <RoleWorkspace
          key={`${me.id}-${requestId ?? "all"}`}
          section="enrollments"
          requestId={requestId}
        />
      ) : selected === "applications" ? (
        <EnrollmentApplications
          key={`${me.id}-${applicationId ?? "all"}`}
          me={me}
          applicationId={applicationId}
        />
      ) : (
        <EnrollmentFormWorkspace key={String(me.id)} />
      )}
    </div>
  );
}
