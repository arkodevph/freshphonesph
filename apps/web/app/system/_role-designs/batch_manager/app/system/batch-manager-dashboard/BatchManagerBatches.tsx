"use client";

import { useState } from "react";
import Link from "next/link";
import BatchManagerBatchCard from "./BatchManagerBatchCard";
import { BatchCardsSkeleton } from "./BatchManagerLoading";
import { RecordDetails } from "@/app/system/_role-designs/batch_manager/components/RecordDetails";
import { useBatchManagerBatches } from "./useBatchManagerBatches";
import type { RecordId } from "@/lib/api";
import styles from "./batch-manager-dashboard.module.css";

export default function BatchManagerBatches() {
  const [status, setStatus] = useState("ACTIVE");
  const [selected, setSelected] = useState<RecordId | null>(null);
  const { data, error, pending, refresh } = useBatchManagerBatches(status);
  return (
    <section
      className={styles.panel}
      aria-labelledby="assigned-batches-title"
      aria-busy={pending}
    >
      <header className={styles.panelHeader}>
        <h2 id="assigned-batches-title">
          Assigned batches{" "}
          {data && <span className={styles.count}>{data.count}</span>}
        </h2>
        <Link href="/system/records" className={styles.textLink}>
          View all
        </Link>
      </header>
      <div className={styles.filters} role="group" aria-label="Batch status">
        {[
          ["ACTIVE", "Active"],
          ["PLANNED", "Forming"],
          ["", "All batches"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <BatchCardsSkeleton />
      ) : data.items.length ? (
        <div className={styles.batchGrid}>
          {data.items.map((batch) => (
            <BatchManagerBatchCard
              key={batch.id}
              batch={batch}
              onOpen={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>
            No{" "}
            {status === "PLANNED"
              ? "forming"
              : status === "ACTIVE"
                ? "active"
                : "assigned"}{" "}
            batches
          </strong>
          <p>
            {status
              ? "Try another status to see your other batches."
              : "Batches will appear here when they are assigned to you."}
          </p>
        </div>
      )}
      {data && data.count > data.items.length && (
        <p className={styles.listNote}>
          Showing {data.items.length} of {data.count} batches.{" "}
          <Link href="/system/records">Open all records</Link>
        </p>
      )}
      {selected !== null && (
        <RecordDetails
          kind="batch"
          id={selected}
          mode="edit"
          onClose={() => setSelected(null)}
          onSaved={() => {
            void refresh();
          }}
        />
      )}
    </section>
  );
}
