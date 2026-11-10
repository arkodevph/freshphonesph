import { ArrowRight, FileText } from "@phosphor-icons/react";
import Link from "next/link";
import styles from "./portal-application-summary.module.css";

export default function PortalApplicationSummary({
  membershipId,
}: {
  membershipId: string;
}) {
  return (
    <section className={styles.panel} aria-label="Application summary">
      <div className={styles.copy}>
        <span className={styles.icon} aria-hidden="true">
          <FileText weight="duotone" />
        </span>
        <div>
          <h2>Application summary</h2>
          <p>View a printable copy of your recorded membership details.</p>
        </div>
      </div>
      <Link
        href={`/portal/application-summary?membership=${encodeURIComponent(membershipId)}`}
        className={styles.link}
      >
        View application summary <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
