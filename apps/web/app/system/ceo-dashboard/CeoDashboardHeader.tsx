"use client";

import Link from "next/link";
import styles from "../ceo-portal.module.css";
import { ArrowsClockwise, ShieldCheck, Sparkle } from "@phosphor-icons/react";
export default function CeoDashboardHeader({
  name,
  pending,
  error,
  hasData,
  refresh,
}: {
  name: string;
  pending: boolean;
  error: string | null;
  hasData: boolean;
  refresh: () => void;
}) {
  return (
    <>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Your business, in perspective</p>
          <h1>Good day, {name.split(" ")[0]}.</h1>
          <p className={styles.subtitle}>
            A clear view of collections, commitments, and what needs a closer
            look.
          </p>
        </div>
        <div className={styles.introActions}>
          <Link href="/system/assistant" className={styles.askAiButton}>
            <Sparkle aria-hidden="true" weight="fill" />
            Ask Cloud
          </Link>
          <span className={styles.accessBadge}>
            <ShieldCheck aria-hidden="true" />
            Owner / CEO
          </span>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.refreshButton}`}
            onClick={refresh}
            disabled={pending}
            aria-label={pending ? "Refreshing overview" : "Refresh overview"}
            aria-busy={pending}
          >
            <ArrowsClockwise
              aria-hidden="true"
              className={pending ? styles.spinning : undefined}
            />
            <span>{pending ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          <strong>
            {hasData
              ? "Some figures could not be refreshed."
              : "The overview could not be loaded."}
          </strong>
          <span>
            {error}{" "}
            {hasData
              ? "Previously loaded figures may still be shown."
              : "Amounts are unavailable, not zero."}
          </span>
          <button type="button" onClick={refresh} disabled={pending}>
            Try again
          </button>
        </div>
      )}
    </>
  );
}
