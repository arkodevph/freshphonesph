"use client";

import type { AssistantReportBrief as ReportBrief } from "@freshphones/contracts";
import {
  ChartBar,
  CheckCircle,
  ClipboardText,
  Headset,
  Scales,
  Stack,
} from "@phosphor-icons/react";
import { formatPeso } from "@/lib/currency";
import { reportingDate } from "@/lib/executive-overview";
import styles from "@/app/system/_role-designs/ceo/app/system/ceo-assistant.module.css";

export function AssistantReportBrief({ brief }: { brief: ReportBrief }) {
  const states = [
    {
      label: "Verified",
      count: brief.payments.verifiedPayments,
      tone: "verified",
    },
    {
      label: "Pending",
      count: brief.payments.pendingVerification,
      tone: "pending",
    },
    {
      label: "Clarification",
      count: brief.payments.needsClarification,
      tone: "clarification",
    },
    {
      label: "Rejected",
      count: brief.payments.rejectedPayments,
      tone: "rejected",
    },
  ];

  const sections = [
    {
      icon: CheckCircle,
      title: "Payments",
      value: `${brief.payments.verifiedPayments} verified`,
      note: `${brief.payments.pendingVerification} pending · ${brief.payments.needsClarification} need clarification`,
    },
    {
      icon: Stack,
      title: "Collections",
      value: `${brief.collections.clients} memberships`,
      note: `${brief.collections.clientsWithoutSchedule} without an issued schedule · balances reflect current records`,
    },
    {
      icon: Scales,
      title: "Reconciliation",
      value: `${brief.reconciliation.paymentsWithFlags} review flags`,
      note: `${brief.reconciliation.unmatchedVerifiedPayments} verified payments without matching verification audit evidence. Not an external-statement match.`,
    },
    {
      icon: ClipboardText,
      title: "Tasks",
      value: `${brief.tasks.byStatus.DONE ?? 0} / ${brief.tasks.total} done`,
      note: `${brief.tasks.late} marked late · timing facts only, no automatic wage action`,
    },
    {
      icon: Headset,
      title: "Support",
      value: `${brief.support.open} open cases`,
      note: `${brief.support.closed} closed / ${brief.support.total} created in the period`,
    },
    {
      icon: ChartBar,
      title: "Scheduled installments",
      value: formatPeso(brief.scheduled.scheduledAmount),
      note: `${brief.scheduled.installments} installments due · scheduled amounts, not collections or profit`,
    },
  ];

  return (
    <section
      className={styles.reportBrief}
      aria-label="Company report summary"
      data-report-brief
    >
      <header className={styles.briefHeader}>
        <span className={styles.briefKicker}>
          <ChartBar aria-hidden="true" />
          REPORT BRIEF <span>6 reports</span>
        </span>
        <h2>Your business, at a glance.</h2>
        <p>
          {reportingDate(brief.dateFrom)} – {reportingDate(brief.dateTo)}
        </p>
      </header>
      <dl className={styles.briefMetrics}>
        <div>
          <dt>Verified collections</dt>
          <dd>{formatPeso(brief.payments.verifiedAmount)}</dd>
          <small>Finance-verified, in the period</small>
        </div>
        <div>
          <dt>Pending claims</dt>
          <dd>{formatPeso(brief.payments.pendingAmount)}</dd>
          <small>Awaiting verification, in the period</small>
        </div>
        <div>
          <dt>Outstanding balance</dt>
          <dd>{formatPeso(brief.collections.remainingBalance)}</dd>
          <small>Current lifetime balance</small>
        </div>
      </dl>
      <figure className={styles.paymentBreakdown}>
        <figcaption>
          <strong>Payment status</strong>
          <span>{brief.payments.total} recorded payments</span>
        </figcaption>
        {brief.payments.total ? (
          <div className={styles.statusTrack} aria-hidden="true">
            {states
              .filter((state) => {
                return state.count > 0;
              })
              .map((state) => {
                return (
                  <span
                    key={state.label}
                    data-tone={state.tone}
                    style={{
                      width: `${(state.count / brief.payments.total) * 100}%`,
                    }}
                  />
                );
              })}
          </div>
        ) : (
          <p className={styles.briefEmpty}>
            No payment activity recorded for this period.
          </p>
        )}
        <dl className={styles.statusLegend}>
          {states.map((state) => {
            return (
              <div key={state.label}>
                <dt>
                  <i data-tone={state.tone} aria-hidden="true" />
                  {state.label}
                </dt>
                <dd>{state.count.toLocaleString()}</dd>
              </div>
            );
          })}
        </dl>
      </figure>
      <div className={styles.briefSections}>
        {sections.map(({ icon: Icon, title, value, note }) => {
          return (
            <section key={title}>
              <div className={styles.briefSectionTitle}>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
              </div>
              <strong>{value}</strong>
              <p>{note}</p>
            </section>
          );
        })}
      </div>
      <p className={styles.briefBasis}>
        Amounts in PHP. Payments use payment dates; tasks and support use
        creation dates. Outstanding balances use lifetime verified credit.
        Read-only snapshot generated{" "}
        {new Intl.DateTimeFormat("en-PH", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        }).format(new Date(brief.generatedAt))}{" "}
        (Manila).
      </p>
    </section>
  );
}
