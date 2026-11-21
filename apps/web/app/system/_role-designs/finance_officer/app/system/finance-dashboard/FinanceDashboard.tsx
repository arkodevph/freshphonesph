"use client";

import Link from "next/link";
import type { FinanceOverviewPeriod } from "@freshphones/contracts";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
import {
  Calendar,
  FileText,
  Wallet,
  ClockCircle,
} from "@/app/system/_role-designs/finance_officer/components/SolarIcons";
import FinanceSummary from "./FinanceSummary";
import {
  FinanceQueues,
  FinanceRefunds,
  FinanceTasks,
} from "./FinanceWorkPanels";
import { useFinanceOverview } from "./useFinanceOverview";
import styles from "./finance-dashboard.module.css";

const shortcuts = [
  {
    href: "/system/reports",
    label: "Financial reports",
    detail: "Collections and reconciliation",
    icon: FileText,
  },
  {
    href: "/system/gcash-history",
    label: "GCash evidence",
    detail: "Statement readings and history",
    icon: ClockCircle,
  },
  {
    href: "/system/payments?queue=all",
    label: "Payment history",
    detail: "All claims and financial decisions",
    icon: Wallet,
  },
  {
    href: "/system/tasks",
    label: "Finance tasks",
    detail: "Department assignments and submissions",
    icon: Calendar,
  },
];

function FinanceDashboardView({ me }: { me: Me }) {
  const state = useFinanceOverview();

  const { data, pending, error, period, selectPeriod, refresh } = state;

  const motion = useWorkspaceMotion();

  const firstName = me.full_name.trim().split(/\s+/)[0];

  return (
    <div className={styles.dashboard} ref={motion}>
      <header className={styles.heading}>
        <div>
          <h2>{firstName ? `Hello, ${firstName}.` : "Hello."}</h2>
        </div>
        <div className={styles.headingActions}>
          <label className={styles.periodControl}>
            Collections period
            <select
              value={period}
              onChange={(event) => {
                return selectPeriod(
                  event.target.value as FinanceOverviewPeriod,
                );
              }}
            >
              <option value="this_month">This month to date</option>
              <option value="last_month">Last month</option>
              <option value="year_to_date">Year to date</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              return void refresh();
            }}
            disabled={pending}
            className={styles.textLink}
          >
            {pending ? "Updating…" : "Refresh overview"}
          </button>
          <Link
            href="/system/payments?queue=ready"
            className={styles.primaryAction}
          >
            <Wallet />
            Review payments
          </Link>
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          {data && (
            <p>
              Showing the last successful update from{" "}
              {new Date(data.updatedAt).toLocaleTimeString("en-PH", {
                timeZone: "Asia/Manila",
              })}
              . These figures may have changed.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              return void refresh();
            }}
            disabled={pending}
          >
            Try again
          </button>
        </div>
      )}
      <div role="status" className="sr-only">
        {pending
          ? data
            ? "Refreshing Finance figures…"
            : "Loading Finance overview…"
          : error
            ? "Overview could not be refreshed."
            : "Finance overview is up to date."}
      </div>
      <div className={styles.overview} aria-busy={pending}>
        <FinanceSummary data={data} error={error} />
        <FinanceQueues data={data} error={error} />
      </div>
      <div className={styles.workArea} aria-busy={pending}>
        <FinanceRefunds data={data} error={error} />
        <FinanceTasks data={data} error={error} />
      </div>
      <section
        className={`${styles.panel} ${styles.toolsPanel}`}
        aria-labelledby="finance-shortcuts-title"
      >
        <header className={styles.panelHeader}>
          <div>
            <h3 id="finance-shortcuts-title">Your workspaces</h3>
            <p>Reports, evidence and follow-through.</p>
          </div>
        </header>
        <nav className={styles.shortcuts} aria-label="Finance shortcuts">
          {shortcuts.map(({ href, label, detail, icon: Icon }) => {
            return (
              <Link key={href} href={href}>
                <span className={styles.shortcutIcon}>
                  <Icon />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </section>
      <p className={styles.footer}>
        Payments are made externally. Only Finance-verified credit updates a
        member&apos;s balance.
      </p>
    </div>
  );
}

export default function FinanceDashboard({ me }: { me: Me }) {
  return can(me, "PAYMENT_VERIFY") ? (
    <FinanceDashboardView me={me} />
  ) : (
    <p role="alert">No access to this Finance workspace.</p>
  );
}
