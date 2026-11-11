import WorkspaceDetails from "@/components/WorkspaceDetails";
import type { ReactNode } from "react";
import { Plus } from "@phosphor-icons/react";
import styles from "./recruitment.module.css";

export default function JobOpeningComposer({
  isCoo,
  children,
}: {
  isCoo: boolean;
  children: ReactNode;
}) {
  if (!isCoo) {
    return (
      <section className={styles.panel} aria-labelledby="publish-job-heading">
        <div className={styles.panelHeading}>
          <div>
            <span>Public board</span>
            <h2 id="publish-job-heading">Post a job opening</h2>
          </div>
        </div>
        {children}
      </section>
    );
  }

  return (
    <WorkspaceDetails className={styles.jobComposer}>
      <summary>
        <span>
          <Plus aria-hidden="true" /> Post a job opening
        </span>
        <small>Publish to the public job board</small>
      </summary>
      <div className={styles.composerBody}>
        <h2 id="publish-job-heading">New job opening</h2>
        <p>
          Review the details before publishing. Closing this section keeps your
          draft.
        </p>
        {children}
      </div>
    </WorkspaceDetails>
  );
}
