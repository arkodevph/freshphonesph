"use client";

import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import Link from "next/link";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { enrollmentAnswerText } from "@/lib/enrollment-forms";
import { useAgentApplication } from "./useAgentApplication";
import CloseApplicationForm from "./CloseApplicationForm";
import { useAgentResource } from "@/lib/useAgentResource";
import type { EnrollmentBatchChoice } from "@/lib/enrollment-forms";
import ForwardApplicationForm from "@/app/system/_role-designs/agent/app/system/enrollments/applications/ForwardApplicationForm";
import styles from "@/app/system/_role-designs/agent/app/system/enrollments/enrollment-workspace.module.css";

export default function EnrollmentApplicationDetail({
  id,
  me,
}: {
  id: string;
  me: Me;
}) {
  const workspace = useAgentApplication(id);

  const batches = useAgentResource<EnrollmentBatchChoice[]>(
    "/enrollment/batches",
  );

  const blocked = workspace.pending || workspace.stale || workspace.uncertain;

  const application = workspace.application;

  if (workspace.loading) {
    return <WorkspaceProgress label="Loading application details…" />;
  }

  if (!application) {
    return (
      <div className={styles.panel}>
        <p className={styles.error} role="alert">
          {workspace.error || "Application not available."}
        </p>
        <button
          className={styles.button}
          type="button"
          onClick={() => {
            void workspace.load();
          }}
        >
          Retry application details
        </button>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      {workspace.stale && (
        <div className={styles.notice} role="status">
          This application changed. Your draft is preserved.
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              if (
                window.confirm(
                  "Discard your draft and load the latest application?",
                )
              ) {
                void workspace.load();
              }
            }}
          >
            Load latest application
          </button>
        </div>
      )}
      {workspace.uncertain && (
        <div className={styles.notice} role="status">
          <p>
            The last action’s result is unconfirmed. Your details are locked to
            the original attempt. Retry that exact action or load the latest
            application before editing.
          </p>
          <button
            type="button"
            className={styles.button}
            disabled={workspace.pending || workspace.stale}
            onClick={() => {
              void workspace.retry();
            }}
          >
            Retry original action
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={workspace.pending}
            onClick={() => {
              if (
                window.confirm(
                  "Load the current application and discard unsaved draft changes?",
                )
              ) {
                void workspace.load();
              }
            }}
          >
            Check latest application
          </button>
        </div>
      )}
      {workspace.error && (
        <p className={styles.error} role="alert">
          {workspace.error}
        </p>
      )}
      {workspace.notice && (
        <p className={styles.notice} role="status">
          {workspace.notice}
        </p>
      )}
      <article
        className={styles.panel}
        aria-labelledby="original-application-title"
      >
        <h2 id="original-application-title">Original website application</h2>
        <p>
          Reference {application.id} · Form version{" "}
          {application.revision.number} · {application.status.toLowerCase()}
        </p>
        <p>
          Received{" "}
          {new Date(application.createdAt).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          })}{" "}
          · Assigned Agent: {application.assignedAgent.name}
        </p>
        <h3>{application.revision.definition.title}</h3>
        {application.revision.definition.description && (
          <p>{application.revision.definition.description}</p>
        )}
        <dl className={styles.details}>
          {(["name", "phone", "email"] as const).map((key) => {
            return (
              <div key={key}>
                <dt>{application.revision.definition.contact[key].label}</dt>
                <dd>{application.contact[key] || "Not provided"}</dd>
              </div>
            );
          })}
          {application.revision.definition.questions.map((question) => {
            return (
              <div key={question.id}>
                <dt>{question.label}</dt>
                <dd>
                  {enrollmentAnswerText(
                    question,
                    application.answers[question.id],
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {application.closeReason && (
          <p style={{ marginTop: 20 }}>Closed: {application.closeReason}</p>
        )}
        {application.enrollmentRequest && (
          <div className={styles.notice} style={{ marginTop: 20 }}>
            <p>
              Enrollment request:{" "}
              {application.enrollmentRequest.status.toLowerCase()}
            </p>
            <Link
              className={styles.link}
              href={`/system/enrollments?request=${encodeURIComponent(application.enrollmentRequest.id)}`}
            >
              Open enrollment request
            </Link>
          </div>
        )}
      </article>
      {application.status === "RECEIVED" &&
        application.assignedAgent.id === String(me.id) &&
        me.role === "agent" &&
        can(me, "ENROLLMENT_APPLICATION_MANAGE") && (
          <ForwardApplicationForm
            key={`${application.id}-${application.version}`}
            application={application}
            batches={batches.error ? [] : (batches.data ?? [])}
            batchLoading={batches.loading}
            batchError={batches.error}
            retryBatches={batches.refresh}
            blocked={blocked}
            pending={workspace.operation === "forward"}
            run={workspace.run}
            onAccessLost={() => {
              void workspace.load();
            }}
          />
        )}
      {application.status === "RECEIVED" &&
        application.assignedAgent.id === String(me.id) &&
        me.role === "agent" &&
        can(me, "ENROLLMENT_APPLICATION_MANAGE") && (
          <CloseApplicationForm
            key={`close-${application.id}-${application.version}`}
            application={application}
            blocked={blocked}
            pending={workspace.operation === "close"}
            run={workspace.run}
          />
        )}
    </div>
  );
}
