"use client";

import type {
  DocumentRequirement,
  PortalSummary,
  ReleaseUpdate,
} from "@/lib/api";
import Link from "next/link";
import { ArrowRight } from "@/components/SolarIcons";
import { formatDate } from "./portal-view";
import { PortalLoadingRows } from "./PortalSkeleton";
import styles from "./membership-context.module.css";

type LoadStatus = "loading" | "ready" | "error";

const documentLabels: Record<DocumentRequirement["status"], string> = {
  MISSING: "Upload needed",
  NEEDS_CLARIFICATION: "Correction needed",
  SUBMITTED: "Awaiting review",
  APPROVED: "Approved",
};

const releaseCopy: Record<string, { title: string; description: string }> = {
  "not ready": {
    title: "Awaiting release readiness",
    description: "Your unit has not been marked ready for collection.",
  },
  processing: {
    title: "Your unit is being prepared",
    description: "Follow staff updates for the next release step.",
  },
  ready: {
    title: "Ready for collection",
    description:
      "Your unit is marked ready. Follow the collection instructions from the team.",
  },
  released: {
    title: "Unit released",
    description:
      "Your unit has been marked as released in your membership record.",
  },
};

export default function MembershipContext({
  summary,
  documents,
  documentsStatus,
  onRetryDocuments,
  updates,
  updatesStatus,
  onRetryUpdates,
}: {
  summary: PortalSummary | null;
  documents: DocumentRequirement[];
  documentsStatus: LoadStatus;
  onRetryDocuments: () => void;
  updates: ReleaseUpdate[];
  updatesStatus: LoadStatus;
  onRetryUpdates: () => void;
}) {
  const approved = documents.filter(
    (item) => item.status === "APPROVED",
  ).length;
  const release = releaseCopy[summary?.release_status ?? ""];
  const latest = updates[0];

  return (
    <aside
      className={styles.context}
      aria-label="Membership requirements and next steps"
    >
      <section
        className={styles.contextCard}
        aria-labelledby="membership-requirements-title"
      >
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Your requirements</p>
            <h2 id="membership-requirements-title">Document review</h2>
          </div>
          {documentsStatus === "ready" && documents.length > 0 && (
            <span className={styles.count}>
              {approved} of {documents.length} approved
            </span>
          )}
        </header>
        {documentsStatus === "loading" ? (
          <PortalLoadingRows rows={2} label="Loading membership requirements" />
        ) : documentsStatus === "error" ? (
          <div className={styles.state} role="alert">
            <p>Document requirements are unavailable.</p>
            <button type="button" onClick={onRetryDocuments}>
              Try again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <p className={styles.body}>
            No document requirements are listed for your account.
          </p>
        ) : (
          <ul className={styles.documentList}>
            {documents.map((item) => (
              <li key={item.key}>
                <Link href={`/portal/documents#document-${item.key}`}>
                  <span>
                    <strong>{item.label}</strong>
                    <span>{documentLabels[item.status]}</span>
                    {item.status === "NEEDS_CLARIFICATION" &&
                      item.latest?.clarification && (
                        <small>{item.latest.clarification}</small>
                      )}
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.caption}>
          Reviewed by Records. Collection readiness is confirmed separately.
        </p>
      </section>
      <section
        className={styles.contextCard}
        aria-labelledby="membership-release-title"
      >
        <p className={styles.eyebrow}>Next milestone</p>
        <h2 id="membership-release-title">
          {release?.title ?? "Release status unavailable"}
        </h2>
        {release && <p className={styles.body}>{release.description}</p>}
        {updatesStatus === "loading" ? (
          <p className={styles.caption} role="status">
            Checking the latest staff update…
          </p>
        ) : updatesStatus === "error" ? (
          <div className={styles.state} role="alert">
            <p>Staff updates are unavailable.</p>
            <button type="button" onClick={onRetryUpdates}>
              Try again
            </button>
          </div>
        ) : latest ? (
          <div className={styles.staffUpdate}>
            {latest.note && <p>{latest.note}</p>}
            <p>
              {latest.collection_date
                ? `Collection date: ${formatDate(latest.collection_date)}`
                : "No collection date in the latest update."}
            </p>
            <small>
              Updated{" "}
              {new Intl.DateTimeFormat("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              }).format(new Date(latest.updated_at))}
            </small>
          </div>
        ) : (
          <p className={styles.caption}>
            No collection updates have been posted yet.
          </p>
        )}
        <Link className={styles.actionLink} href="/portal/release">
          View release updates <ArrowRight aria-hidden="true" />
        </Link>
      </section>
      <section className={styles.help} aria-labelledby="membership-help-title">
        <h2 id="membership-help-title">Need help with your membership?</h2>
        <p>
          Customer Service can follow up on your record or a pending review.
        </p>
        <Link className={styles.actionLink} href="/portal/support#new-request">
          Contact Customer Service <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </aside>
  );
}
