import { Info } from "@phosphor-icons/react";
import EmailTemplateEditor, {
  type EmailTemplate,
} from "@/app/system/_role-designs/coo/app/system/notification-settings/EmailTemplateEditor";
import styles from "@/app/system/_role-designs/coo/app/system/notification-settings/notification-settings.module.css";

export default function EmailTemplates({
  templates,
  labels,
  selected,
  onSelect,
  saving,
  onEdit,
  onSave,
}: {
  templates?: EmailTemplate[];
  labels: Record<string, string>;
  selected: string;
  onSelect: (kind: string) => void;
  saving: string;
  onEdit: (kind: string, field: "subject" | "body", value: string) => void;
  onSave: (template: EmailTemplate) => void;
}) {
  return (
    <div className={styles.templateLayout} aria-busy={!templates}>
      <div
        className={styles.templateNav}
        role="group"
        aria-label="Email templates"
      >
        {(
          templates?.map((template) => {
            return template.kind;
          }) ?? Object.keys(labels)
        ).map((kind) => {
          return (
            <button
              key={kind}
              type="button"
              disabled={!templates}
              aria-pressed={selected === kind}
              onClick={() => {
                return onSelect(kind);
              }}
            >
              {labels[kind]}
            </button>
          );
        })}
      </div>
      <div>
        <div className={styles.note}>
          <Info aria-hidden="true" />
          <span>
            Use <code>{"{title}"}</code> in every subject and{" "}
            <code>{"{message}"}</code> and <code>{"{url}"}</code> in each email
            body. The system fills them from the customer’s own event.
          </span>
        </div>
        <div className={styles.grid}>
          {templates ? (
            templates.map((template) => {
              return (
                <EmailTemplateEditor
                  key={template.kind}
                  kind={template.kind}
                  title={labels[template.kind]}
                  template={template}
                  hidden={template.kind !== selected}
                  saving={saving === template.kind}
                  onEdit={(field, value) => {
                    return onEdit(template.kind, field, value);
                  }}
                  onSave={() => {
                    return onSave(template);
                  }}
                />
              );
            })
          ) : (
            <EmailTemplateEditor
              kind={selected}
              title={labels[selected]}
              saving={false}
              onEdit={() => {}}
              onSave={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}
