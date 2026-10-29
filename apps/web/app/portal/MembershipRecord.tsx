"use client";

import type { PortalScheduleItem, PortalSummary } from "@/lib/api";
import Link from "next/link";
import { Box, ArrowRight } from "@/components/SolarIcons";
import styles from "./membership-context.module.css";

export default function MembershipRecord({
  summary,
  schedule,
}: {
  summary: PortalSummary;
  schedule: PortalScheduleItem[];
}) {
  return (
    <section
      className={styles.record}
      aria-labelledby="enrollment-record-title"
    >
      <header className={styles.recordHeader}>
        <span className={styles.icon}>
          <Box aria-hidden="true" />
        </span>
        <div>
          <p className={styles.eyebrow}>Enrollment record</p>
          <h2 id="enrollment-record-title">{summary.unit_model}</h2>
          <p className={styles.batch}>Batch {summary.batch_number}</p>
        </div>
      </header>
      <dl className={styles.recordFacts}>
        <div>
          <dt>Membership status</dt>
          <dd className={styles.status}>{summary.status || "Not available"}</dd>
        </div>
        <div>
          <dt>Issued installment plan</dt>
          <dd>
            {schedule.length
              ? `${schedule.length} installments`
              : "Not issued yet"}
          </dd>
        </div>
      </dl>
      <footer className={styles.recordLinks}>
        <Link href="/portal/schedule">
          View payment schedule <ArrowRight aria-hidden="true" />
        </Link>
        <Link href="/portal/financial-document">
          View account statement <ArrowRight aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
