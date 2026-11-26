import { FloppyDisk } from "@phosphor-icons/react";
import { SkeletonLine } from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import styles from "@/app/system/_role-designs/coo/app/system/notification-settings/notification-settings.module.css";

export type EmailTemplate = {
  kind: string;
  subject: string;
  body: string;
  version: number;
};

export default function EmailTemplateEditor({
  kind,
  title,
  template,
  hidden = false,
  saving,
  onEdit,
  onSave,
}: {
  kind: string;
  title: string;
  template?: EmailTemplate;
  hidden?: boolean;
  saving: boolean;
  onEdit: (field: "subject" | "body", value: string) => void;
  onSave: () => void;
}) {
  return (
    <section hidden={hidden} className={styles.editor} aria-busy={!template}>
      <h2>{title}</h2>
      <label htmlFor={template ? `subject-${kind}` : undefined}>Subject</label>
      {template ? (
        <input
          id={`subject-${kind}`}
          value={template.subject}
          onChange={(event) => {
            return onEdit("subject", event.target.value);
          }}
          maxLength={180}
        />
      ) : (
        <div className={styles.pendingSubject}>
          <SkeletonLine width="70%" />
        </div>
      )}
      <label htmlFor={template ? `body-${kind}` : undefined}>Email body</label>
      {template ? (
        <textarea
          id={`body-${kind}`}
          value={template.body}
          onChange={(event) => {
            return onEdit("body", event.target.value);
          }}
          maxLength={2500}
          rows={7}
        />
      ) : (
        <div className={styles.pendingBody}>
          {Array.from({ length: 7 }, (_, index) => {
            return (
              <SkeletonLine key={index} width={index === 6 ? "45%" : "85%"} />
            );
          })}
        </div>
      )}
      <button type="button" disabled={!template || saving} onClick={onSave}>
        <FloppyDisk aria-hidden="true" />
        {saving ? "Saving…" : "Save email"}
      </button>
    </section>
  );
}
