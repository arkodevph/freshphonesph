import type { PortalApplicationSummary } from "@freshphones/contracts";
import {
  applicationSummaryGeneratedAt,
  applicationSummarySections,
} from "@/lib/application-summary";
import styles from "./application-summary.module.css";

export default function ApplicationSummarySheet({
  summary,
}: {
  summary: PortalApplicationSummary;
}) {
  return (
    <article className={styles.sheet}>
      <header className={styles.sheetHeader}>
        <p className={styles.brand}>
          Fresh Phones <span>PH</span>
        </p>
        <h2>{summary.title}</h2>
        <p className={styles.generated}>
          Generated {applicationSummaryGeneratedAt(summary.generatedAt)}{" "}
          (Philippine time)
        </p>
        <p className={styles.notice}>{summary.notice}</p>
      </header>
      {applicationSummarySections(summary).map((section) => {
        return (
          <section
            className={styles.detailSection}
            key={section.title}
            aria-label={section.title}
          >
            <h3>{section.title}</h3>
            <dl className={styles.details}>
              {section.fields.map((field) => {
                return (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                );
              })}
            </dl>
            {section.note && (
              <p className={styles.sectionNote}>{section.note}</p>
            )}
          </section>
        );
      })}
      <footer className={styles.sheetFooter}>
        Fresh Phones PH · Application summary
      </footer>
    </article>
  );
}
