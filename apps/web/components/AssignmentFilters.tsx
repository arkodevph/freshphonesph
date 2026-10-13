"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getAssignmentOptions, type AssignmentOptions } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function AssignmentFilters({ handlerId, agentId, onChange }: {
  handlerId: string; agentId: string; onChange: (key: "handlerId" | "agentId", value: string) => void;
}) {
  const [options, setOptions] = useState<AssignmentOptions>({ handlers: [], agents: [] });
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const labelId = useId();
  const load = useCallback(async () => {
    const current = ++sequence.current;
    try { const result = await getAssignmentOptions(); if (current === sequence.current) { setOptions(result); setError(null); } }
    catch (error) { if (current === sequence.current) { setOptions({ handlers: [], agents: [] }); setError(error instanceof Error ? error.message : "Could not load assignment filters."); } }
  }, []);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  useLiveRecords(load);
  return <div className="mb-4">
    <div className="grid gap-3 sm:grid-cols-2">{(["handlerId", "agentId"] as const).map((key) => {
      const items = key === "handlerId" ? options.handlers : options.agents;
      const selected = key === "handlerId" ? handlerId : agentId;
      const label = key === "handlerId" ? "Filter by handler" : "Filter by agent";
      return <label key={key} htmlFor={`${labelId}-${key}`} className="grid gap-1 text-sm text-blue-ink">
        <span id={`${labelId}-${key}-label`}>{label}</span>
        <select id={`${labelId}-${key}`} aria-labelledby={`${labelId}-${key}-label`} value={selected} onChange={(event) => onChange(key, event.target.value)}
          className="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink focus:border-blue">
          <option value="">All {key === "handlerId" ? "handlers" : "agents"}</option>
          {selected && !items.some((item) => item.id === selected) && <option value={selected}>Selected assignment unavailable</option>}
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (inactive)"}</option>)}
        </select>
      </label>;
    })}</div>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error} <button type="button" className="underline" onClick={() => void load()}>Retry filters</button></p>}
  </div>;
}
