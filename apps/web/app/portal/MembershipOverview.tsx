"use client";

import type { PortalSection } from "./portal-view";
import { type PortalSummary } from "@/lib/api";
import { ArrowRight, Box as Package } from "@/components/SolarIcons";
import Image from "next/image";
import Link from "next/link";
import styles from "./portal.module.css";
import cardStyles from "./membership-card.module.css";
import { displayModelName, formatMoney } from "./portal-view";

type Props = {
  deviceImage: string | null;
  summary: PortalSummary | null;
  section: PortalSection;
};

export default function MembershipOverview({
  deviceImage,
  summary,
  section,
}: Props) {
  return (
    <section
      className={`${styles.overview} ${styles.overviewSingle}`}
      aria-label="Membership overview"
    >
      <div
        data-portal-material="membership"
        data-membership-card=""
        className={`${styles.membership} ${styles.membershipDashboard} ${cardStyles.card} ${deviceImage ? styles.membershipWithArt : ""}`}
      >
        <div className={styles.membershipTop}>
          <dl className={styles.membershipMobileSummary}>
            <div>
              <dt>Remaining balance</dt>
              <dd>{formatMoney(summary?.remaining_balance)}</dd>
            </div>
            <div>
              <dt>Membership</dt>
              <dd className={styles.membershipMobileStatus}>
                {summary?.status ?? "—"}
              </dd>
            </div>
          </dl>
          <span className={`${styles.heroIcon} ${cardStyles.icon}`}>
            <Package aria-hidden="true" />
          </span>
        </div>
        <div className={styles.membershipCopy}>
          <p>My membership</p>
          <h2>
            {summary?.unit_model
              ? displayModelName(summary.unit_model)
              : "Loading your unit…"}
          </h2>
          <span className={`${styles.batch} ${cardStyles.badge}`}>
            Batch {summary?.batch_number ?? "—"}
          </span>
        </div>
        <div className={styles.membershipMobileFooter}>
          <span className={styles.membershipMobileBatch}>
            Batch <strong>{summary?.batch_number ?? "—"}</strong>
          </span>
          {section === "overview" && (
            <Link
              href="/portal/membership"
              className={styles.membershipDetails}
            >
              View details <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
        <Image
          src="/portal/mascot/task-boy-payments.webp"
          alt=""
          width={768}
          height={512}
          sizes="(max-width: 700px) 140px, 280px"
          loading="eager"
          className={styles.membershipMascot}
        />
      </div>
    </section>
  );
}
