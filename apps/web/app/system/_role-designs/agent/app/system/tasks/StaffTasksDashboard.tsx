"use client";

import { Suspense } from "react";
import { can, useMe } from "@/lib/useMe";
import WorkspaceProgress from "../../../components/WorkspaceProgress";
import AgentTasksWorkspace from "./AgentTasksWorkspace";

export default function StaffTasksDashboard() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading task access…" />;
  }

  if (me.account_type !== "employee" || !can(me, "TASK_READ")) {
    return (
      <section>
        <h1>No access</h1>
        <p>Your task access is unavailable.</p>
      </section>
    );
  }

  return (
    <Suspense fallback={<WorkspaceProgress label="Loading my tasks…" />}>
      <AgentTasksWorkspace key={`${me.id}:${can(me, "TASK_SUBMIT")}`} me={me} />
    </Suspense>
  );
}
