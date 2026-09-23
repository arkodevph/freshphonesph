"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, CurrencyCircleDollar, Stack } from "@phosphor-icons/react";
import { getDashboard, type DashboardCards as Cards } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

const formatPeso = (value: string) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function DashboardCards() {
  const [cards, setCards] = useState<Cards | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getDashboard()
      .then(setCards)
      .then(() => setError(null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load"));
  }, []);
  useEffect(load, [load]);
  useLiveRecords(load);

  if (error) {
    return <p className="system-alert is-error">{error}</p>;
  }

  const items = [
    { icon: Stack, label: "Active batches", value: cards?.active_batches, note: "Current Paluwagan groups", tone: "violet" },
    { icon: CheckCircle, label: "Verified payments", value: cards?.verified_payments, note: "Finance-approved records", tone: "green" },
    { icon: Clock, label: "Pending review", value: cards?.pending_verification, note: "Awaiting verification", tone: "amber" },
    { icon: CurrencyCircleDollar, label: "Verified total", value: cards ? formatPeso(cards.verified_total) : undefined, note: "Approved collections", tone: "blue" },
  ] as const;

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
