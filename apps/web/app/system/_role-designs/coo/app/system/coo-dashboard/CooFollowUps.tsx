"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SkeletonLine } from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import {
  getCustomerWork,
  type CustomerWorkKind,
  type CustomerWorkPage,
} from "@/lib/customer-work";
import { useLiveRecords } from "@/lib/useLiveRecords";
import {
  ChatRoundDots,
  FileText,
  Wallet,
  CheckCircle,
} from "@/app/system/_role-designs/coo/components/SolarIcons";
import { PendingValue } from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooLoading";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

const queues = {
  support: {
    title: "Customer concerns",
    description: "Open or in progress cases",
    icon: ChatRoundDots,
  },
  documents: {
    title: "Document review",
    description: "Files awaiting Records review",
    icon: FileText,
  },
  payments: {
    title: "Finance checks",
    description: "Payments awaiting verification",
    icon: Wallet,
  },
};

function WorkQueue({ kind }: { kind: CustomerWorkKind }) {
  const [data, setData] = useState<CustomerWorkPage | null>(null);

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    try {
      const result = await getCustomerWork(kind);

      if (request === sequence.current) {
        setData(result);

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load this queue.",
        );
      }
    }
  }, [kind]);

  useEffect(() => {
    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh]);

  useLiveRecords(refresh);

  return (
    <WorkQueueView kind={kind} data={data} error={error} refresh={refresh} />
  );
}

function WorkQueueView({
  kind,
  data,
  error,
  refresh,
}: {
  kind: CustomerWorkKind;
  data: CustomerWorkPage | null;
  error: string | null;
  refresh: () => void;
}) {
  const { title, description, icon: Icon } = queues[kind];

  return (
    <section className={styles.queue} aria-label={title}>
      <div className={styles.queueHeading}>
        <Icon />
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <span className={styles.queueCount}>
          {error ? "—" : data ? data.count : <PendingValue />}
        </span>
      </div>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <p className={styles.queueEmpty} aria-label="Loading requests">
          <SkeletonLine width="36ch" />
        </p>
      ) : data.count === 0 ? (
        <p className={styles.queueEmpty}>
          <CheckCircle /> Nothing waiting. New requests will appear here.
        </p>
      ) : (
        <ul className={styles.requestList}>
          {data.results.slice(0, 3).map((item) => {
            return (
              <li key={item.id}>
                <Link href={item.href}>
                  <strong>{item.clientName}</strong>
                  <span>
                    {item.label}
                    {item.customerReplied ? " · Customer replied" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {data && !error && data.count > 3 && (
        <Link
          className={styles.textLink}
          href={`/system/customer-work#${kind}`}
        >
          View all {data.count}
        </Link>
      )}
    </section>
  );
}

export default function CooFollowUps({
  me,
  loading = false,
}: {
  me: Me;
  loading?: boolean;
}) {
  const kinds: CustomerWorkKind[] = [
    ...(can(me, "SUPPORT_MANAGE") ? ["support" as const] : []),
    ...(["system_admin", "records"].includes(me.role ?? "")
      ? ["documents" as const]
      : []),
    ...(can(me, "PAYMENT_VERIFY") ? ["payments" as const] : []),
  ];

  if (!kinds.length) {
    return null;
  }

  return (
    <section className={styles.panel} aria-labelledby="staff-followups-title">
      <header className={styles.panelHeader}>
        <div>
          <h3 id="staff-followups-title">Customer follow-up</h3>
          <p>Requests waiting for your team.</p>
        </div>
        <Link href="/system/customer-work" className={styles.textLink}>
          Open work queue
        </Link>
      </header>
      <div className={styles.queues}>
        {kinds.map((kind) => {
          return loading ? (
            <WorkQueueView
              key={kind}
              kind={kind}
              data={null}
              error={null}
              refresh={() => {}}
            />
          ) : (
            <WorkQueue key={kind} kind={kind} />
          );
        })}
      </div>
    </section>
  );
}
