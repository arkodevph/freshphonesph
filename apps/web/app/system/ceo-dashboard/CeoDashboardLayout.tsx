"use client";

import type { useCeoOverview } from "./useCeoOverview";
import CeoBalanceCard from "./CeoBalanceCard";
import CeoMonthlyInsight from "./CeoMonthlyInsight";
import CeoPaymentActivity from "./CeoPaymentActivity";
import CeoAssistantEntry from "./CeoAssistantEntry";
import CeoCollectionsPanel from "./CeoCollectionsPanel";
import CeoBatchCommitments from "./CeoBatchCommitments";
import CeoDashboardHeader from "./CeoDashboardHeader";
import CeoDashboardFooter from "./CeoDashboardFooter";
import styles from "../ceo-portal.module.css";

export default function CeoDashboardLayout({
  name,
  overview,
}: {
  name: string;
  overview: ReturnType<typeof useCeoOverview>;
}) {
  const {
    data,
    summary,
    error,
    summaryError,
    pending,
    months,
    selectMonths,
    refreshAll,
  } = overview;

  const chartsLoading = !data && !error;

  const summaryLoading = !summary && !summaryError;

  return (
    <div className={styles.dashboard} aria-busy={pending}>
      {pending && (
        <span className="sr-only" role="status">
          {data || summary
            ? "Refreshing overview. Previously loaded figures remain visible."
            : "Loading CEO overview"}
        </span>
      )}
      <CeoDashboardHeader
        name={name}
        pending={pending}
        error={error || summaryError}
        hasData={Boolean(data || summary)}
        refresh={refreshAll}
      />
      <div className={styles.overview}>
        <CeoBalanceCard summary={summary} loading={summaryLoading} />
        <CeoCollectionsPanel
          data={data}
          error={error}
          months={months}
          selectMonths={selectMonths}
        />
        <CeoPaymentActivity data={data} loading={chartsLoading} />
        <CeoMonthlyInsight data={data} error={error} />
        <CeoBatchCommitments
          data={data}
          error={error}
          loading={chartsLoading}
        />
        <CeoAssistantEntry />
      </div>
      <CeoDashboardFooter />
    </div>
  );
}
