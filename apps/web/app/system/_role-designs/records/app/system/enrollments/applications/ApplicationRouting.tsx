"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/records/components/WorkspaceNativeSelect";
import { useState } from "react";
import type {
  EnrollmentFormConfig,
  PublicEnrollmentApplication,
} from "@freshphones/contracts";
import {
  assignEnrollmentApplication,
  closeEnrollmentApplication,
} from "@/lib/enrollment-forms";
import styles from "@/app/system/_role-designs/records/app/system/enrollments/enrollment-workspace.module.css";

export default function ApplicationRouting({
  application,
  agents,
  pending,
  run,
}: {
  application: PublicEnrollmentApplication;
  agents: EnrollmentFormConfig["agents"];
  pending: boolean;
  run: (work: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  const [agentId, setAgentId] = useState(application.assignedAgent.id);

  const [reason, setReason] = useState("");

  return (
    <section
      className={styles.panel}
      aria-labelledby="application-routing-title"
    >
      <h2 id="application-routing-title">COO routing</h2>
      <p>
        Reassign this received application to an active Agent, or close it with
        a reason. Enrollment approval stays with the assigned Batch Manager.
      </p>
      <fieldset
        disabled={pending}
        style={{ minWidth: 0, border: 0, padding: 0 }}
      >
        <legend className={styles.srOnly}>Route or close application</legend>
        <label className={styles.field}>
          Assigned Agent
          <WorkspaceNativeSelect
            value={agentId}
            onChange={(event) => {
              setAgentId(event.target.value);
            }}
          >
            {!agents.some((agent) => {
              return agent.id === application.assignedAgent.id;
            }) && (
              <option value={application.assignedAgent.id}>
                {application.assignedAgent.name} · current assignment
              </option>
            )}
            {agents.map((agent) => {
              return (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.agentCode}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!agentId || agentId === application.assignedAgent.id}
            onClick={() => {
              void run(() => {
                return assignEnrollmentApplication(
                  application.id,
                  application.version,
                  agentId,
                );
              }, "Application reassigned. The selected Agent can now review it.");
            }}
          >
            Reassign application
          </button>
        </div>
        <label className={styles.field} style={{ marginTop: 24 }}>
          Reason for closing
          <textarea
            minLength={3}
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={reason.trim().length < 3}
            onClick={() => {
              void run(() => {
                return closeEnrollmentApplication(
                  application.id,
                  application.version,
                  reason.trim(),
                );
              }, "Application closed. The original submission is retained.");
            }}
          >
            Close application
          </button>
        </div>
      </fieldset>
    </section>
  );
}
