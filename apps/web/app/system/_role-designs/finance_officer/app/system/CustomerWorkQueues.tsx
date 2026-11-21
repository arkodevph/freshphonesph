"use client";

import WorkspaceProgress from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import {
  getCustomerWork,
  type CustomerWorkKind,
  type CustomerWorkPage,
} from "@/lib/customer-work";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Headset,
  Receipt,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./customer-work-queues.module.css";

const sections = {
  support: {
    title: "Customer concerns",
    description: "Open or in progress cases",
    Icon: Headset,
  },
  documents: {
    title: "Document review",
    description: "Files submitted to Records",
    Icon: FileText,
  },
  payments: {
    title: "Ready for Finance",
    description: "Current approvals and required evidence are complete",
    Icon: Receipt,
  },
} as const;

function waitingFor(date: string) {
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime());

  const hours = Math.floor(elapsed / 3600000);

  if (hours < 1) {
    return "Less than 1 hour";
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"}`;
}

function WorkSection({
  kind,
  compact,
}: {
  kind: CustomerWorkKind;
  compact: boolean;
}) {
  const [page, setPage] = useState(1);

  const [data, setData] = useState<CustomerWorkPage | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);

    void getCustomerWork(kind, page)
      .then((result) => {
        if (page > 1 && result.results.length === 0) {
          setPage(Math.max(1, Math.ceil(result.count / 20)));

          return;
        }

        setData(result);

        setError(null);
      })
      .catch((caught) => {
        return setError(
          caught instanceof Error
            ? caught.message
            : "Could not load this queue.",
        );
      })
      .finally(() => {
        return setLoading(false);
      });
  }, [kind, page]);

  useEffect(load, [load]);

  useLiveRecords(load);

  const { title, description, Icon } = sections[kind];

  const items = compact ? data?.results.slice(0, 3) : data?.results;

  return (
    <section
      id={kind}
      className={`${styles.section} glass rounded-3xl p-4 sm:p-5`}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`${styles.accent} grid h-10 w-10 shrink-0 place-items-center rounded-2xl`}
          >
            <Icon weight="duotone" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-700 text-blue-ink">
              {title}
            </h3>
            <p className="text-xs text-ink-soft">{description}</p>
          </div>
        </div>
        <span
          className={`${styles.accent} rounded-full px-2.5 py-1 text-xs font-700`}
          aria-label={`${data?.count ?? 0} ${title.toLowerCase()} waiting`}
        >
          {data?.count ?? "—"}
        </span>
      </div>
      {error && (
        <p
          className={`${styles.error} mt-4 rounded-xl p-3 text-sm`}
          role="alert"
        >
          {error}
        </p>
      )}
      {loading && !data ? (
        <WorkspaceProgress
          className="mt-4 text-sm text-ink-soft"
          label="Loading queue…"
        />
      ) : !items?.length && !error ? (
        <p className={`${styles.empty} mt-4 rounded-xl p-3 text-sm`}>
          Nothing waiting here.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {items?.map((item) => {
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${styles.row} group flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors`}
                >
                  <span className="min-w-0">
                    <strong className={`${styles.name} block truncate text-sm`}>
                      {item.clientName}
                    </strong>
                    <span className={`${styles.detail} block truncate text-xs`}>
                      {item.label}
                      {item.customerReplied ? " · Customer replied" : ""}
                    </span>
                  </span>
                  <span
                    className={`${styles.action} flex shrink-0 items-center gap-2 text-xs font-700`}
                  >
                    <span>{waitingFor(item.waitingSince)}</span>
                    <ArrowUpRight weight="bold" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {compact && (data?.count ?? 0) > 3 && (
        <Link
          href={`/system/customer-work#${kind}`}
          className={`${styles.action} mt-3 inline-flex items-center gap-1 text-xs font-700 hover:underline`}
        >
          View all {data?.count} <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
      )}
      {!compact && data && data.count > 20 && (
        <nav
          className="mt-4 flex items-center justify-between text-xs text-ink-soft"
          aria-label={`${title} pages`}
        >
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => {
              return setPage((current) => {
                return current - 1;
              });
            }}
            className={`${styles.pageButton} rounded-lg px-3 py-1.5 font-700 disabled:opacity-40`}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(data.count / 20)}
          </span>
          <button
            type="button"
            disabled={!data.next || loading}
            onClick={() => {
              return setPage((current) => {
                return current + 1;
              });
            }}
            className={`${styles.pageButton} rounded-lg px-3 py-1.5 font-700 disabled:opacity-40`}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default function CustomerWorkQueues({
  compact = false,
}: {
  compact?: boolean;
}) {
  const me = useMe();

  if (!me) {
    return null;
  }

  const kinds: CustomerWorkKind[] = [
    ...(can(me, "SUPPORT_MANAGE") ? ["support" as const] : []),
    ...(["system_admin", "records"].includes(me.role ?? "")
      ? ["documents" as const]
      : []),
    ...(can(me, "PAYMENT_VERIFY") ? ["payments" as const] : []),
  ];

  if (!kinds.length) {
    return compact ? null : (
      <p className="glass rounded-3xl p-6 text-sm text-ink-soft">
        Your role has no customer work queues.
      </p>
    );
  }

  return (
    <div className="coo-customer-work-grid grid gap-4 lg:grid-cols-3">
      {kinds.map((kind) => {
        return <WorkSection key={kind} kind={kind} compact={compact} />;
      })}
    </div>
  );
}
