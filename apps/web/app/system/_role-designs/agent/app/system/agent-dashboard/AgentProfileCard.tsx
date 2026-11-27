"use client";

import { Users } from "@phosphor-icons/react";
import type { NetworkAgent, NetworkPage } from "@freshphones/contracts";
import type { AgentResource } from "@/lib/useAgentResource";
import { useMe } from "@/lib/useMe";
import styles from "./agent-dashboard.module.css";

export default function AgentProfileCard({
  resource,
}: {
  resource: AgentResource<NetworkPage<NetworkAgent>>;
}) {
  const me = useMe();

  const known = !resource.loading && !resource.error && Boolean(resource.data);

  const person = known
    ? resource.data?.items.find((person) => {
        return person.id === String(me?.id);
      })
    : null;

  const profile = person?.agentProfile;

  const message = !known
    ? resource.error
      ? "Assignment could not be checked. Try again to confirm your profile."
      : "Checking your Agent profile…"
    : !profile
      ? "Agent profile not linked. Ask the COO to link your profile before batch-dependent work."
      : !profile.active
        ? "Agent profile inactive. Ask the COO to review your profile before batch-dependent work."
        : "Active Agent profile";

  return (
    <section
      className={styles.identity}
      aria-label="Agent profile readiness"
      aria-busy={resource.loading}
    >
      <span className={styles.identityIcon}>
        <Users size={23} />
      </span>
      <div>
        <h2>{me?.full_name ?? "Agent"}</h2>
        <p>{profile?.code ?? (known ? "Agent code unavailable" : "—")}</p>
        <small>
          Pioneer · {known ? (person?.supervisor?.name ?? "Not assigned") : "—"}
        </small>
        <p
          className={styles.readiness}
          role={resource.error ? "alert" : "status"}
        >
          {message}
        </p>
        {known && !profile?.active && (
          <small>Your own tasks and account security remain available.</small>
        )}
        {resource.error && (
          <button
            type="button"
            className={styles.identityRetry}
            onClick={() => {
              void resource.refresh();
            }}
          >
            Retry assignment
          </button>
        )}
      </div>
    </section>
  );
}
