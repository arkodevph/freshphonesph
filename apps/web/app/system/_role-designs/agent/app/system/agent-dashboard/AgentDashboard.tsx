"use client";

import Link from "next/link";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Add } from "@/app/system/_role-designs/agent/components/SolarIcons";
import { ApplicationInbox, EnrollmentHandoffs } from "./AgentDeskQueues";
import AgentDeskRail, { AgentDeskSummary } from "./AgentDeskRail";
import { useAgentDesk } from "./useAgentDesk";
import styles from "./agent-dashboard.module.css";

export default function AgentDashboard() {
  const desk = useAgentDesk();

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <h1>Your enrollment desk</h1>
          <p>
            Review assigned applications and follow your work through to the
            next step.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            aria-label="Refresh agent dashboard"
            disabled={desk.refreshing}
            onClick={desk.refresh}
          >
            <ArrowClockwise size={17} aria-hidden="true" />
            Refresh desk
          </button>
          <Link
            className={styles.primary}
            href="/system/enrollments?view=requests&new=1"
          >
            <Add width={18} height={18} aria-hidden="true" />
            Submit enrollment
          </Link>
        </div>
      </div>
      <div className={styles.overview}>
        <AgentDeskSummary desk={desk} />
        <ApplicationInbox applications={desk.applications} />
      </div>
      <div className={styles.grid}>
        <EnrollmentHandoffs requests={desk.requests} />
        <AgentDeskRail desk={desk} />
      </div>
    </div>
  );
}
