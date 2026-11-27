"use client";

import Link from "next/link";
import { ArrowClockwise, Plus } from "@phosphor-icons/react";
import { ApplicationInbox, EnrollmentHandoffs } from "./AgentDeskQueues";
import AgentDeskRail from "./AgentDeskRail";
import { useAgentDesk } from "./useAgentDesk";
import styles from "./agent-dashboard.module.css";

export default function AgentDashboard() {
  const desk = useAgentDesk();

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <p>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Manila",
            })}
          </p>
          <h2>Your enrollment desk</h2>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            aria-label="Refresh agent dashboard"
            disabled={desk.refreshing}
            onClick={desk.refresh}
          >
            <ArrowClockwise size={18} />
          </button>
          <Link
            className={styles.primary}
            href="/system/enrollments?view=requests&new=1"
          >
            <Plus size={17} />
            Submit enrollment
          </Link>
        </div>
      </div>
      <div className={styles.grid}>
        <div className={styles.main}>
          <ApplicationInbox applications={desk.applications} />
          <EnrollmentHandoffs requests={desk.requests} />
        </div>
        <AgentDeskRail desk={desk} />
      </div>
    </div>
  );
}
