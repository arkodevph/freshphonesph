"use client";

import Link from "next/link";
import { ChatCircle, ListChecks } from "@phosphor-icons/react";
import { supportSourceLabel } from "@/lib/api";
import { can } from "@/lib/useMe";
import type { CsrDesk } from "./useCsrDashboard";
import SectionState from "./CsrSectionState";
import styles from "./csr-dashboard.module.css";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

export default function CsrWorkPanels({ desk }: { desk: CsrDesk }) {
  const { me, report, followup, inquiries, tasks } = desk;

  const reportData = report.data;

  const sources =
    reportData?.sources.slice().sort((a, b) => {
      return b.total - a.total;
    }) ?? [];

  const waiting = followup.data?.results.slice(0, 3) ?? [];

  const fresh = inquiries.data?.results.slice(0, 2) ?? [];

  const assignments = tasks.data?.results.slice(0, 2) ?? [];

  return (
    <>
      <div className={styles.workGrid}>
        <section
          className={styles.card}
          aria-labelledby="csr-followup-title"
          aria-busy={followup.loading}
        >
          <header className={styles.heading}>
            <div>
              <h3 id="csr-followup-title">Next in line</h3>
              <span className={styles.count}>
                {followup.data?.count ?? "—"}
              </span>
            </div>
            <Link href="/system/customer-work">All follow-up</Link>
          </header>
          <SectionState
            resource={followup}
            empty={
              followup.data && !waiting.length
                ? "No concerns waiting on your team."
                : undefined
            }
          >
            <ul className={styles.followupList}>
              {waiting.map((item) => {
                return (
                  <li key={item.id}>
                    <Link href={item.href}>
                      <span className={styles.avatar} aria-hidden="true">
                        {item.clientName.charAt(0)}
                      </span>
                      <div>
                        <strong>{item.clientName}</strong>
                        <small>{item.label}</small>
                      </div>
                      <span className={styles.queueMeta}>
                        {item.customerReplied ? (
                          <b>Customer replied</b>
                        ) : (
                          <span>Needs follow-up</span>
                        )}
                        <time dateTime={item.waitingSince}>
                          {date(item.waitingSince)}
                        </time>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SectionState>
        </section>
        <section
          className={styles.card}
          aria-labelledby="csr-channels-title"
          aria-busy={report.loading}
        >
          <header className={styles.heading}>
            <h3 id="csr-channels-title">Contact sources</h3>
            <ChatCircle aria-hidden="true" />
          </header>
          <SectionState
            resource={report}
            empty={
              reportData && !sources.length
                ? "Source mix appears when cases are recorded."
                : undefined
            }
          >
            <dl className={styles.sources}>
              {sources.map((item) => {
                return (
                  <div key={item.source}>
                    <div>
                      <dt>{supportSourceLabel(item.source)}</dt>
                      <dd>{item.total.toLocaleString("en-PH")}</dd>
                    </div>
                    <div className={styles.sourceTrack} aria-hidden="true">
                      <span
                        style={{
                          width: `${reportData?.total ? (item.total / reportData.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </SectionState>
        </section>
      </div>
      <div className={styles.bottomGrid}>
        <section
          className={styles.card}
          aria-labelledby="csr-inquiries-title"
          aria-busy={inquiries.loading}
        >
          <header className={styles.heading}>
            <div>
              <h3 id="csr-inquiries-title">New device inquiries</h3>
              <span className={styles.count}>
                {inquiries.data?.count ?? "—"}
              </span>
            </div>
            <Link href="/system/inquiries">View inquiries</Link>
          </header>
          <SectionState
            resource={inquiries}
            empty={
              inquiries.data && !fresh.length
                ? "No new website inquiries."
                : undefined
            }
          >
            <ul className={styles.shortList}>
              {fresh.map((item) => {
                return (
                  <li key={item.id}>
                    <Link href="/system/inquiries">
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.deviceName}</small>
                      </div>
                      <time dateTime={item.createdAt}>
                        {date(item.createdAt)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SectionState>
        </section>
        {can(me, "TASK_READ") && (
          <section
            className={styles.card}
            aria-labelledby="csr-tasks-title"
            aria-busy={tasks.loading}
          >
            <header className={styles.heading}>
              <div>
                <ListChecks aria-hidden="true" />
                <h3 id="csr-tasks-title">My open tasks</h3>
                <span className={styles.count}>{tasks.data?.count ?? "—"}</span>
              </div>
              <Link href="/system/tasks">View tasks</Link>
            </header>
            <SectionState
              resource={tasks}
              empty={
                tasks.data && !assignments.length
                  ? "No open tasks assigned to you."
                  : undefined
              }
            >
              <ul className={styles.shortList}>
                {assignments.map((item) => {
                  return (
                    <li key={item.id}>
                      <Link href={`/system/tasks?task=${item.id}`}>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.status.replaceAll("_", " ")}</small>
                        </div>
                        <time dateTime={item.deadline}>
                          Due {date(item.deadline)}
                        </time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SectionState>
          </section>
        )}
      </div>
    </>
  );
}
