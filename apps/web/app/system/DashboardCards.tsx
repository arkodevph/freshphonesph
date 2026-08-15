"use client";

import { useEffect, useState } from "react";
import { Stack, CheckCircle, Clock, CurrencyCircleDollar } from "@phosphor-icons/react";
import { getDashboard, type DashboardCards as Cards } from "@/lib/api";

export default function DashboardCards() {
  const [cards, setCards] = useState<Cards | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setCards)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700">
        {error}
      </p>
    );
  }

  const items = [
    { icon: Stack, label: "Active batches", value: cards?.active_batches, tone: "text-blue" },
    { icon: CheckCircle, label: "Verified payments", value: cards?.verified_payments, tone: "text-emerald-600" },
    { icon: Clock, label: "Pending verification", value: cards?.pending_verification, tone: "text-amber-600" },
    { icon: CurrencyCircleDollar, label: "Verified total", value: cards ? `₱${cards.verified_total}` : undefined, tone: "text-blue-ink" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="glass-tint flex flex-col gap-2 rounded-2xl p-4">
          <Icon weight="fill" className={`h-6 w-6 ${tone}`} />
          <span className="font-display text-2xl font-700 text-blue-ink">
            {value ?? "…"}
          </span>
          <span className="text-xs font-600 text-ink-soft">{label}</span>
        </div>
      ))}
    </div>
  );
}
