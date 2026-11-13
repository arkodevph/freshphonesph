"use client";

import { useRef, useState, type FormEvent } from "react";
import { tsRequest } from "@/lib/ts-api";

type Match = {
  id: string;
  name: string;
  batchCode: string;
  status: string;
  releaseStatus: string;
  latestPaymentStatus: string;
};

export default function CustomerLookup() {
  const [query, setQuery] = useState("");

  const [matches, setMatches] = useState<Match[] | null>(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const sequence = useRef(0);

  async function search(event: FormEvent) {
    event.preventDefault();

    const current = ++sequence.current;

    setLoading(true);

    setError("");

    try {
      const rows = await tsRequest<Match[]>(
        `/support/customer-lookup?q=${encodeURIComponent(query.trim())}`,
      );

      if (current === sequence.current) {
        setMatches(rows);
      }
    } catch (caught) {
      if (current === sequence.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not look up the customer.",
        );
      }
    } finally {
      if (current === sequence.current) {
        setLoading(false);
      }
    }
  }

  return (
    <section className="system-panel mb-4 p-5">
      <h2 className="mb-2 text-lg font-bold">Customer lookup</h2>
      <p className="mb-3 text-sm">
        Find the customer and check their latest recorded payment status for a
        concern.
      </p>
      <form onSubmit={search} className="flex flex-wrap gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Customer name, phone or batch</span>
          <input
            className="w-full rounded-xl border p-2"
            required
            minLength={2}
            maxLength={100}
            value={query}
            onChange={(e) => {
              return setQuery(e.target.value);
            }}
            placeholder="Name, phone or batch"
          />
        </label>
        <button
          className="rounded-xl border px-4 py-2"
          disabled={loading}
          type="submit"
        >
          {loading ? "Searching…" : "Find customer"}
        </button>
      </form>
      {error && (
        <p className="mt-3" role="alert">
          {error}
        </p>
      )}
      {matches && (
        <ul className="mt-3 space-y-3">
          {matches.map((row) => {
            return (
              <li key={row.id} className="rounded-xl border p-3">
                <strong>{row.name}</strong> · {row.batchCode}
                <p className="text-sm">
                  Latest payment:{" "}
                  {row.latestPaymentStatus.toLowerCase().replaceAll("_", " ")} ·
                  Release:{" "}
                  {row.releaseStatus.toLowerCase().replaceAll("_", " ")}
                </p>
              </li>
            );
          })}
          {!matches.length && <li>No matching customer found.</li>}
        </ul>
      )}
    </section>
  );
}
