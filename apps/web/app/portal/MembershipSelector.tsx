"use client";

import { useEffect, useState } from "react";
import { tsRequest } from "@/lib/ts-api";
import styles from "./portal.module.css";

type Membership = {
  id: string;
  status: string;
  unitModel: string;
  batch: { code: string; model: string };
};

export default function MembershipSelector({
  selectedId,
}: {
  selectedId?: string | null;
}) {
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [error, setError] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setError(false);

    void tsRequest<Membership[]>("/portal/memberships")
      .then((items) => {
        if (active) {
          setMemberships(items);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <p role="alert">
        Could not load your batches.{" "}
        <button
          type="button"
          onClick={() => {
            return setAttempt(attempt + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }

  if (!memberships.length) {
    return null;
  }

  return (
    <section
      className={styles.membershipSelector}
      aria-label="Batch membership"
    >
      <label htmlFor="portal-membership">Viewing batch</label>
      <select
        id="portal-membership"
        value={selectedId ?? ""}
        onChange={(event) => {
          const url = new URL(window.location.href);

          url.searchParams.set("membership", event.target.value);

          url.hash = "";

          window.location.assign(url.toString());
        }}
      >
        {!memberships.some((membership) => {
          return membership.id === selectedId;
        }) && <option value="">Choose your batch</option>}
        {memberships.map((membership) => {
          return (
            <option key={membership.id} value={membership.id}>
              {membership.batch.code} ·{" "}
              {membership.unitModel || membership.batch.model} ·{" "}
              {membership.status.toLowerCase().replaceAll("_", " ")}
            </option>
          );
        })}
      </select>
      <p>Schedules, payments and balances below belong to this batch.</p>
    </section>
  );
}
