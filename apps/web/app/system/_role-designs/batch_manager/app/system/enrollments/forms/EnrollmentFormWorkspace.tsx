"use client";

import WorkspaceProgress from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/app/system/_role-designs/batch_manager/components/WorkspaceNativeSelect";
import { useState } from "react";
import Link from "next/link";
import {
  enrollmentFormDefinitionSchema,
  type EnrollmentAnswers,
} from "@freshphones/contracts";
import FormFields from "@/app/system/_role-designs/batch_manager/components/enrollment-form/FormFields";
import EnrollmentFormEditor from "@/app/system/_role-designs/batch_manager/app/system/enrollments/forms/EnrollmentFormEditor";
import { useEnrollmentFormDraft } from "@/app/system/enrollments/forms/useEnrollmentFormDraft";
import styles from "@/app/system/_role-designs/batch_manager/app/system/enrollments/enrollment-workspace.module.css";

export default function EnrollmentFormWorkspace() {
  const draft = useEnrollmentFormDraft();

  const [preview, setPreview] = useState(false);

  const [previewContact, setPreviewContact] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [previewAnswers, setPreviewAnswers] = useState<EnrollmentAnswers>({});

  if (draft.loading) {
    return <WorkspaceProgress label="Loading enrollment form…" />;
  }

  if (!draft.config || !draft.definition) {
    return (
      <div className={styles.panel}>
        <p className={styles.error} role="alert">
          {draft.error || "Enrollment form unavailable."}
        </p>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            void draft.load();
          }}
        >
          Retry enrollment form
        </button>
      </div>
    );
  }

  const valid = enrollmentFormDefinitionSchema.safeParse(
    draft.definition,
  ).success;

  return (
    <div className={styles.workspace}>
      <header className={`${styles.panel} ${styles.heading}`}>
        <div>
          <h1>Enrollment form</h1>
          <p>
            COO and Records can prepare and publish the website application. The
            receiving Agent reviews applications before Manager approval.
          </p>
          <p>
            {draft.config.published
              ? `Published version ${draft.config.published.revisionNumber}`
              : "Not published. Website applications are not open yet."}{" "}
            ·{" "}
            {draft.dirty
              ? "Unsaved draft changes"
              : draft.config.version === 0
                ? "Draft not saved yet"
                : "Draft is up to date"}
          </p>
          {draft.config.published && (
            <Link
              className={styles.link}
              href="/enroll"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open published application form
            </Link>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              setPreview(!preview);
            }}
          >
            {preview ? "Back to editor" : "Preview draft"}
          </button>
          <button
            type="button"
            disabled={
              draft.pending ||
              draft.outdated ||
              (!draft.dirty && draft.config.version > 0)
            }
            onClick={() => {
              void draft.save();
            }}
          >
            {draft.pending ? "Please wait…" : "Save draft"}
          </button>
          <button
            type="button"
            data-variant="primary"
            className={styles.primary}
            disabled={
              draft.pending ||
              draft.outdated ||
              draft.dirty ||
              !valid ||
              !draft.receivingAgentId ||
              draft.config.version === 0
            }
            onClick={() => {
              void draft.publish();
            }}
          >
            Publish form
          </button>
        </div>
      </header>
      {draft.error && (
        <p className={styles.error} role="alert">
          {draft.error}
        </p>
      )}
      {draft.notice && (
        <p className={styles.notice} role="status">
          {draft.notice}
        </p>
      )}
      {draft.outdated && (
        <div className={styles.notice}>
          <p>
            This form changed in another session. Your local edits are still
            shown. Reload the latest draft before saving or publishing.
          </p>
          <button
            type="button"
            className={styles.button}
            disabled={draft.pending}
            onClick={() => {
              void draft.load();
            }}
          >
            Discard local edits and reload latest draft
          </button>
        </div>
      )}
      <section className={styles.panel}>
        <label className={styles.field}>
          Receiving Agent
          <WorkspaceNativeSelect
            value={draft.receivingAgentId ?? ""}
            disabled={draft.pending || draft.outdated}
            onChange={(event) => {
              draft.setReceivingAgentId(event.target.value || null);
            }}
          >
            <option value="">
              Choose the Agent who receives new applications
            </option>
            {draft.receivingAgentId &&
              !draft.config.agents.some((agent) => {
                return agent.id === draft.receivingAgentId;
              }) && (
                <option value={draft.receivingAgentId} disabled>
                  Previously selected Agent is unavailable. Choose another.
                </option>
              )}
            {draft.config.agents.map((agent) => {
              return (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.agentCode}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
        <p>
          Choose an active Agent, save the draft, then publish. Changing this
          Agent affects new applications after publication. Existing
          applications keep their assigned Agent unless the COO reassigns them.
        </p>
      </section>
      {preview ? (
        <section
          className={`${styles.panel} ${styles.preview}`}
          aria-label="Enrollment form draft preview"
        >
          <h2>Draft preview</h2>
          <p>Preview only. These answers are not sent or saved.</p>
          <FormFields
            definition={draft.definition}
            contact={previewContact}
            answers={previewAnswers}
            onContactChange={setPreviewContact}
            onAnswersChange={setPreviewAnswers}
          />
        </section>
      ) : (
        <EnrollmentFormEditor
          definition={draft.definition}
          onChange={draft.setDefinition}
          readOnly={draft.pending || draft.outdated}
          errors={draft.errors}
        />
      )}
    </div>
  );
}
