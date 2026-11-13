"use client";

import type { useCeoOverview } from "@/app/system/ceo-dashboard/useCeoOverview";
import CeoBalanceCard from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoBalanceCard";
import CeoMonthlyInsight from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoMonthlyInsight";
import CeoPaymentActivity from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoPaymentActivity";
import CeoAssistantEntry from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoAssistantEntry";
import CeoCollectionsPanel from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoCollectionsPanel";
import CeoBatchCommitments from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoBatchCommitments";
import CeoDashboardHeader from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoDashboardHeader";
import CeoDashboardFooter from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoDashboardFooter";
import styles from "@/app/system/_role-designs/ceo/app/system/ceo-portal.module.css";

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
