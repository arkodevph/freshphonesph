"use client";

import Link from "next/link";
import { ArrowClockwise, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { can } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/csr/components/WorkspaceProgress";
import { useCsrDashboard } from "./useCsrDashboard";
import CsrReportOverview from "./CsrReportOverview";
import CsrWorkPanels from "./CsrWorkPanels";
import styles from "./csr-dashboard.module.css";

export default function CsrDashboard() {
  const desk = useCsrDashboard();

  const { me } = desk;

  if (!me) {
    return <WorkspaceProgress label="Loading customer support…" />;
  }

  return (
    <div className={styles.desk} data-csr-dashboard>
      <header className={styles.toolbar}>
        <p>
          {new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(new Date())}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Refresh support dashboard"
            disabled={desk.loading}
            onClick={() => {
              void desk.load();
            }}
          >
            <ArrowClockwise aria-hidden="true" />
          </button>
          <Link className={styles.button} href="/system/support?view=lookup">
            <MagnifyingGlass aria-hidden="true" />
            Find customer
          </Link>
          {can(me, "SUPPORT_CREATE") && (
            <Link className={styles.primary} href="/system/support?view=create">
              <Plus aria-hidden="true" />
              Log concern
            </Link>
          )}
        </div>
      </header>
      <CsrReportOverview desk={desk} />
      <CsrWorkPanels desk={desk} />
    </div>
  );
}
