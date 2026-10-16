"use client";

import { createAgent, listAgents, type AgentRecord } from "@/lib/api";
import { IdentificationCard } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "./recruitment-view";
import styles from "./recruitment.module.css";

export function AgentsPanel() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);

  const [form, setForm] = useState({ full_name: "", agent_code: "" });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const sequence = useRef(0);

  const lock = useRef(false);

  const mounted = useRef(false);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    setError("");

    try {
      const page = await listAgents();

      if (mounted.current && request === sequence.current) {
        setAgents(page.results);
      }
    } catch (caught) {
      if (mounted.current && request === sequence.current) {
        setAgents([]);

        setError(errorText(caught));
      }
    } finally {
      if (mounted.current && request === sequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    void load();

    return () => {
      mounted.current = false;

      sequence.current++;
    };
  }, [load]);

  return (
    <section className={styles.panel} aria-labelledby="agents-heading">
      <div className={styles.panelHeading}>
        <div>
          <span>Public verification</span>
          <h2 id="agents-heading">Agent records</h2>
        </div>
        <Link href="/system/agents" className={styles.publicLink}>
          Open full agent directory
        </Link>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              return void load();
            }}
          >
            Retry agents
          </button>
        </p>
      )}
      <form
        className={styles.agentForm}
        onSubmit={(event) => {
          event.preventDefault();

          if (lock.current) {
            return;
          }

          lock.current = true;

          setSaving(true);

          setError("");

          void createAgent({ ...form, is_active: true })
            .then(() => {
              if (mounted.current) {
                setForm({ full_name: "", agent_code: "" });

                void load();
              }
            })
            .catch((caught) => {
              if (mounted.current) {
                setError(errorText(caught));
              }
            })
            .finally(() => {
              lock.current = false;

              if (mounted.current) {
                setSaving(false);
              }
            });
        }}
      >
        <label>
          <span>Agent full name</span>
          <input
            required
            maxLength={200}
            disabled={saving}
            value={form.full_name}
            onChange={(event) => {
              return setForm({ ...form, full_name: event.target.value });
            }}
          />
        </label>
        <label>
          <span>Agent code</span>
          <input
            required
            maxLength={60}
            disabled={saving}
            value={form.agent_code}
            onChange={(event) => {
              return setForm({ ...form, agent_code: event.target.value });
            }}
          />
        </label>
        <button
          type="submit"
          className={styles.secondaryButton}
          disabled={saving}
        >
          {saving ? "Adding…" : "Add agent"}
        </button>
      </form>
      <p className={styles.scopeNote}>
        Recent directory records; use the full agent directory for search and
        all pages.
      </p>
      <ul className={styles.agentList}>
        {agents.map((row) => {
          return (
            <li key={row.id}>
              <IdentificationCard aria-hidden="true" />
              <strong>{row.full_name}</strong>
              <span>{row.agent_code}</span>
              <span
                className={
                  row.is_active ? styles.openStatus : styles.closedStatus
                }
              >
                {row.is_active ? "Active" : "Inactive"}
              </span>
            </li>
          );
        })}
      </ul>
      {loading && <p role="status">Loading agents…</p>}
    </section>
  );
}
