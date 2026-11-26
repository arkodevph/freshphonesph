"use client";

import Link from "next/link";
import { Headset } from "@phosphor-icons/react";
import Select from "@/app/system/_role-designs/csr/components/Select";
import { can } from "@/lib/useMe";
import { supportPeriodQuery } from "./csr-dashboard-data";
import type { CsrDesk } from "./useCsrDashboard";
import SectionState from "./CsrSectionState";
import styles from "./csr-dashboard.module.css";

export default function CsrReportOverview({ desk }: { desk: CsrDesk }) {
  const { report } = desk;

  const reportData = report.data;

  const categories = reportData?.categories.slice(0, 4) ?? [];

  const maxCategory = Math.max(
    1,
    ...categories.map((item) => {
      return item.total;
    }),
  );

  const range = supportPeriodQuery(desk.period);

  const reportRange =
    desk.period === "all"
      ? "All received dates"
      : `${range.dateFrom} – ${range.dateTo} · UTC`;

  const activeWidth = reportData?.total
    ? (reportData.open / reportData.total) * 100
    : 0;

  const resolvedWidth = reportData?.total
    ? (reportData.closed / reportData.total) * 100
    : 0;

  return (
    <>
      <div className={styles.reportToolbar}>
        <div>
          <h2>Case overview</h2>
          <p>{reportRange}</p>
        </div>
        <div className={styles.period}>
          <span id="csr-report-period">Received</span>
          <Select
            id="csr-report-period-control"
            labelId="csr-report-period"
            value={desk.period}
            options={[
              { value: "month", label: "This month" },
              { value: "30days", label: "Last 30 days" },
              { value: "all", label: "All time" },
            ]}
            onValueChange={(value) => {
              if (value === "month" || value === "30days" || value === "all") {
                desk.setPeriod(value);
              }
            }}
            fitViewport
          />
        </div>
      </div>
      <div className={styles.topGrid}>
        <section
          className={styles.volume}
          aria-labelledby="csr-volume-title"
          aria-busy={report.loading}
        >
          <header>
            <h3 id="csr-volume-title">Cases received</h3>
            <Headset aria-hidden="true" />
          </header>
          <strong className={styles.volumeNumber}>
            {reportData?.total.toLocaleString("en-PH") ?? "—"}
          </strong>
          {report.error && <p role="alert">{report.error}</p>}
          <div className={styles.volumeLegend}>
            <div>
              <span>Active</span>
              <b>{reportData?.open.toLocaleString("en-PH") ?? "—"}</b>
            </div>
            <div>
              <span>Resolved / closed</span>
              <b>{reportData?.closed.toLocaleString("en-PH") ?? "—"}</b>
            </div>
          </div>
          <div className={styles.volumeTrack} aria-hidden="true">
            <span style={{ width: `${activeWidth}%` }} />
            <span style={{ width: `${resolvedWidth}%` }} />
          </div>
          {can(desk.me, "REPORT_VIEW") && (
            <Link href="/system/reports">View reports</Link>
          )}
        </section>
        <section
          className={styles.card}
          aria-labelledby="csr-category-title"
          aria-busy={report.loading}
        >
          <header className={styles.heading}>
            <h3 id="csr-category-title">Concern categories</h3>
            <span className={styles.note}>
              {reportData?.categories.length ?? "—"} categories
            </span>
          </header>
          <SectionState
            resource={report}
            empty={
              reportData && !categories.length
                ? "No concerns received in this period."
                : undefined
            }
          >
            <dl className={styles.categoryList}>
              {categories.map((item, index) => {
                return (
                  <div key={item.category}>
                    <div className={styles.barLabel}>
                      <dt>{item.category}</dt>
                      <dd>{item.total.toLocaleString("en-PH")}</dd>
                    </div>
                    <div className={styles.categoryTrack} aria-hidden="true">
                      <span
                        data-tone={index % 2}
                        style={{
                          width: `${(item.total / maxCategory) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </SectionState>
          {!!categories.length && (
            <p className={styles.chartFootnote}>
              Top {categories.length} by case count
            </p>
          )}
        </section>
      </div>
    </>
  );
}
