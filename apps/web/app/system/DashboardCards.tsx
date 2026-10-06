"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, CurrencyCircleDollar, Stack, Users } from "@phosphor-icons/react";
import { getDashboard, getRecordOverview, type RecordOverview, type DashboardCards as Cards } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";

const formatPeso = (value: string) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function DashboardCards() {
  const me = useMe();
  const handler = TYPESCRIPT_API && me?.role === "core_handler";
  const reportAccess = !TYPESCRIPT_API || can(me, "REPORT_VIEW");
  const [cards, setCards] = useState<Cards | null>(null);
  const [assigned, setAssigned] = useState<RecordOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (handler) {
      void getRecordOverview().then(setAssigned).then(() => setError(null))
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load assignments."));
      return;
    }
    if (!reportAccess) return;
    getDashboard()
      .then(setCards)
      .then(() => setError(null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load"));
  }, [handler, reportAccess]);
  useEffect(load, [load]);
  useLiveRecords(load, handler || reportAccess);
  if (!handler && !reportAccess) return null;

  if (error) {
    return <p className="system-alert is-error">{error}</p>;
  }

  const items = handler ? [
    { icon: Stack, label: "Assigned active batches", value: assigned?.activeBatches, note: "Groups assigned to you", tone: "violet" },
    { icon: Users, label: "Assigned clients", value: assigned?.clients, note: "Members of your batches", tone: "blue" },
    { icon: CheckCircle, label: "Ready for release", value: assigned?.readyForRelease, note: "Within your assigned batches", tone: "green" },
  ] : [
    { icon: Stack, label: "Active batches", value: cards?.active_batches, note: "Current Paluwagan groups", tone: "violet" },
    { icon: CheckCircle, label: "Verified payments", value: cards?.verified_payments, note: "Finance-approved records", tone: "green" },
    { icon: Clock, label: "Pending review", value: cards?.pending_verification, note: "Awaiting verification", tone: "amber" },
    { icon: CurrencyCircleDollar, label: "Verified total", value: cards ? formatPeso(cards.verified_total) : undefined, note: "Approved collections", tone: "blue" },
  ];

  return (
    <section className="system-metrics" aria-label="Operations overview">
      {items.map(({ icon: Icon, label, value, note, tone }) => (
        <article key={label} className="system-metric-card">
          <div className={`system-metric-icon tone-${tone}`}><Icon weight="fill" /></div>
          <div>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
            <small>{note}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
