"use client";

import type { ReactNode } from "react";
import type { Resource } from "./useCsrDashboard";
import WorkspaceProgress from "@/app/system/_role-designs/csr/components/WorkspaceProgress";
import styles from "./csr-dashboard.module.css";

export default function SectionState({
  resource,
  empty,
  children,
}: {
  resource: Resource<unknown>;
  empty?: string;
  children?: ReactNode;
}) {
  if (resource.loading && !resource.data) {
    return (
      <div className={styles.state}>
        <WorkspaceProgress label="Loading…" />
      </div>
    );
  }

  if (resource.error && !resource.data) {
    return (
      <p role="alert" className={styles.state}>
        {resource.error}
      </p>
    );
  }

  return (
    <>
      {resource.error && (
        <p role="alert" className={styles.inlineError}>
          {resource.error}
        </p>
      )}
      {empty && !resource.error ? (
        <p className={styles.state}>{empty}</p>
      ) : (
        children
      )}
    </>
  );
}
