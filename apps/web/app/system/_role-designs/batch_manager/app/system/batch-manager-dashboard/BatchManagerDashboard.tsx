"use client";

import Link from "next/link";
import type { Me } from "@/lib/api";
import { canOpenWorkspace } from "@/lib/workspace-access";
import { useBatchManagerOverview } from "./useBatchManagerOverview";
import BatchManagerSummary from "./BatchManagerSummary";
import BatchManagerTasks from "./BatchManagerTasks";
import BatchManagerBatches from "./BatchManagerBatches";
import BatchManagerReviews from "./BatchManagerReviews";
import styles from "./batch-manager-dashboard.module.css";

export default function BatchManagerDashboard({ me }: { me: Me }) {
  const overview = useBatchManagerOverview();
  const access = (route: string) =>
    canOpenWorkspace(me.role, route, me.permissions);
  return (
    <div className={styles.dashboard}>
      <div className={styles.toolbar}>
        <span>Your assigned operations</span>
        <nav aria-label="Batch Manager actions">
          {access("/system/clients") && (
            <Link href="/system/clients">Member records</Link>
          )}
          {access("/system/enrollments") && (
            <Link href="/system/enrollments" className={styles.primaryAction}>
              Review enrollments
            </Link>
          )}
        </nav>
      </div>
      <BatchManagerSummary {...overview} />
      <div className={styles.workspace}>
        {access("/system/records") && <BatchManagerBatches />}
        <aside
          className={styles.sideColumn}
          aria-label="Batch Manager follow-ups"
        >
          {access("/system/enrollments") && <BatchManagerReviews />}
          {access("/system/tasks") && <BatchManagerTasks />}
          {access("/system/payments") && (
            <Link href="/system/payments" className={styles.monitorLink}>
              Monitor assigned payments
              <span>View payment and verification status</span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
