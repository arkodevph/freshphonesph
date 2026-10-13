"use client";

import type { PortalSection } from "./portal-view";
import { type PortalSummary } from "@/lib/api";
import { ArrowRight, Package } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./portal.module.css";
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
        className={`${styles.membership} ${styles.membershipDashboard} ${deviceImage ? styles.membershipWithArt : ""}`}
      >
        <div className={styles.membershipSky} aria-hidden="true">
          <Image
            src="/brand/doodles/cloud-soft.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 700px) 120px, 220px"
            className={`${styles.membershipCloud} ${styles.membershipCloudOne}`}
          />
          <Image
            src="/brand/doodles/cloud-round.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 700px) 144px, 210px"
            className={`${styles.membershipCloud} ${styles.membershipCloudTwo}`}
          />
          <Image
            src="/brand/doodles/bird-flight.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 700px) 55px, 86px"
            className={styles.membershipBird}
          />
          <Image
            src="/about/glossy-heart.webp"
            alt=""
            width={1248}
            height={1248}
            sizes="(max-width: 700px) 28px, 60px"
            className={styles.membershipHeart}
          />
          <Image
            src="/about/glass-bubble.webp"
            alt=""
            width={1248}
            height={1248}
            sizes="(max-width: 700px) 22px, 38px"
            className={styles.membershipBubble}
          />
        </div>
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
          <span className={styles.heroIcon}>
            <Package weight="duotone" aria-hidden="true" />
          </span>
          <span className={styles.membershipStatus}>
            {summary?.status ?? "Loading"}
          </span>
        </div>
        <div className={styles.membershipCopy}>
          <p>My membership</p>
          <h2>
            {summary?.unit_model
              ? displayModelName(summary.unit_model)
              : "Loading your unit…"}
          </h2>
          <span className={styles.batch}>
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
              View details <ArrowRight weight="bold" aria-hidden="true" />
            </Link>
          )}
        </div>
        {deviceImage && (
          <Image
            src={deviceImage}
            alt=""
            width={1024}
            height={1536}
            sizes="(max-width: 700px) 120px, 230px"
            loading="eager"
            className={`${styles.deviceArt} ${/ipad/i.test(summary?.unit_model ?? "") ? styles.tabletArt : ""}`}
          />
        )}
      </div>
    </section>
  );
}
