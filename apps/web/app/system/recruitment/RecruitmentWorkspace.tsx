"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowSquareOut, Briefcase } from "@phosphor-icons/react";
import { AgentsPanel } from "./AgentsPanel";
import styles from "./recruitment.module.css";
import { RecruitmentDesk } from "./RecruitmentDesk";

export default function RecruitmentWorkspace({
  canRecruit,
  canAgents,
  canReadApplicants,
}: {
  canRecruit: boolean;
  canAgents: boolean;
  canReadApplicants: boolean;
}) {
  const [denied, setDenied] = useState(false);

  const onDenied = useCallback(() => {
    setDenied(true);

    window.dispatchEvent(new Event("focus"));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>People operations</span>
          <h1>Recruitment</h1>
          <p>
            Publish roles, review applications, and keep the public job board
            current.
          </p>
        </div>
        <Link href="/careers" target="_blank" className={styles.publicLink}>
          View public job board <ArrowSquareOut aria-hidden="true" />
        </Link>
      </header>
      {canRecruit && !denied ? (
        <RecruitmentDesk
          key={String(canReadApplicants)}
          onDenied={onDenied}
          canReadApplicants={canReadApplicants}
        />
      ) : (
        (!canAgents || denied) && (
          <section className={styles.noAccess}>
            <Briefcase aria-hidden="true" />
            <h2>No recruitment access</h2>
            <p>
              Your current access does not allow applicant or job management.
            </p>
          </section>
        )
      )}
      {canAgents && <AgentsPanel />}
    </div>
  );
}
