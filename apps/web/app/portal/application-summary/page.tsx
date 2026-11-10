"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, DownloadSimple, Printer } from "@phosphor-icons/react";
import type { User } from "@freshphones/contracts";
import { getPortalApplicationSummary } from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import {
  capturedApplicationMembership,
  createApplicationSummaryLoader,
  type ApplicationSummaryState,
} from "@/lib/application-summary";
import { downloadApplicationSummaryPdf } from "@/lib/application-summary-pdf";
import ApplicationSummarySheet from "./ApplicationSummarySheet";
import styles from "./application-summary.module.css";

function SummaryLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingBar} aria-hidden="true" />
      <span className={styles.loadingBar} aria-hidden="true" />
      <p>Loading your application summary…</p>
    </div>
  );
}

function ApplicationSummaryWorkspace() {
  const searchParams = useSearchParams();

  const query = searchParams.toString();

  const membershipId = capturedApplicationMembership(query);

  const [state, setState] = useState<ApplicationSummaryState>({
    status: "loading",
    membershipId: null,
  });

  const [loader] = useState(() => {
    return createApplicationSummaryLoader(async (id) => {
      const user = await tsRequest<User>("/auth/me");

      if (user.role !== "CUSTOMER") {
        throw new Error("A customer account is required to view this summary.");
      }

      return getPortalApplicationSummary(id);
    }, setState);
  });

  const downloadGeneration = useRef(0);

  const [downloadError, setDownloadError] = useState("");

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    ++downloadGeneration.current;

    setDownloading(false);

    setDownloadError("");

    void loader.load(membershipId);

    return () => {
      ++downloadGeneration.current;

      loader.cancel();
    };
  }, [query, membershipId, loader]);

  const current = state.membershipId === membershipId ? state : null;

  const summary = current?.status === "ready" ? current.summary : null;

  const backHref = membershipId
    ? `/portal/documents?membership=${encodeURIComponent(membershipId)}`
    : "/portal/documents";

  async function download() {
    if (!summary || downloading) {
      return;
    }

    const generation = downloadGeneration.current;

    const isCurrent = () => {
      return generation === downloadGeneration.current;
    };

    setDownloadError("");

    setDownloading(true);

    try {
      await downloadApplicationSummaryPdf(summary, isCurrent);
    } catch (error) {
      if (isCurrent()) {
        setDownloadError(
          error instanceof Error
            ? error.message
            : "Could not download PDF. Please try again.",
        );
      }
    } finally {
      if (isCurrent()) {
        setDownloading(false);
      }
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.heading}>
          <p>Fresh Phones PH</p>
          <h1>Application summary</h1>
        </div>
        <div className={styles.actions}>
          <Link href={backHref}>
            <ArrowLeft aria-hidden="true" /> Back to documents
          </Link>
          <button
            type="button"
            disabled={!summary || downloading}
            onClick={() => {
              void download();
            }}
          >
            <DownloadSimple aria-hidden="true" />{" "}
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={!summary}
            onClick={() => {
              window.print();
            }}
          >
            <Printer aria-hidden="true" /> Print
          </button>
        </div>
      </header>
      {downloading && (
        <p className={styles.message} role="status">
          Preparing your application summary PDF…
        </p>
      )}
      {downloadError && (
        <p className={styles.message} role="alert">
          {downloadError}
        </p>
      )}
      {current?.status === "error" ? (
        <div className={styles.message}>
          <p role="alert">{current.message}</p>
          {membershipId && (
            <button
              type="button"
              onClick={() => {
                setDownloadError("");

                void loader.load(membershipId);
              }}
            >
              Retry application summary
            </button>
          )}
        </div>
      ) : summary ? (
        <ApplicationSummarySheet summary={summary} />
      ) : (
        <SummaryLoading />
      )}
    </main>
  );
}

export default function ApplicationSummaryPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <SummaryLoading />
        </main>
      }
    >
      <ApplicationSummaryWorkspace />
    </Suspense>
  );
}
