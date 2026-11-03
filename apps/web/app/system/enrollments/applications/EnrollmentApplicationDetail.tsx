"use client";

import Link from "next/link";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { enrollmentAnswerText } from "@/lib/enrollment-forms";
import { useEnrollmentApplication } from "./useEnrollmentApplication";
import ForwardApplicationForm from "./ForwardApplicationForm";
import ApplicationRouting from "./ApplicationRouting";
import styles from "../enrollment-workspace.module.css";

export default function EnrollmentApplicationDetail({
  id,
  me,
}: {
  id: string;
  me: Me;
}) {
  const workspace = useEnrollmentApplication(id, me);

  const application = workspace.application;

  if (workspace.loading) {
    return <p role="status">Loading application details…</p>;
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
              Open Manager enrollment review
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
            batches={workspace.batches}
            pending={workspace.pending}
            run={workspace.run}
            onAccessLost={() => {
              void workspace.load();
            }}
          />
        )}
      {application.status === "RECEIVED" &&
        me.role === "coo" &&
        can(me, "ENROLLMENT_APPLICATION_MANAGE") && (
          <ApplicationRouting
            key={`${application.id}-${application.version}`}
            application={application}
            agents={workspace.agents}
            pending={workspace.pending}
            run={workspace.run}
          />
        )}
    </div>
  );
}
