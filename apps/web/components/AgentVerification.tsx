"use client";

import { useId, useState, type FormEvent } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { verifyAgent, type AgentVerifyResult } from "@/lib/api";
import DoodleIcon from "./DoodleIcon";
import hero from "./Hero.module.css";
import styles from "./AgentVerification.module.css";

export default function AgentVerification() {
  const id = useId();

  const [query, setQuery] = useState("");

  const [result, setResult] = useState<AgentVerifyResult | null>(null);

  const [searched, setSearched] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();

    if (!query.trim() || loading) {
      return;
    }

    setLoading(true);

    setError(null);

    setResult(null);

    setSearched(true);

    try {
      setResult(await verifyAgent(query.trim()));
    } catch {
      setError("Could not check the agent directory. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card} data-agent-verification>
      <div className={styles.cardHeading}>
        <DoodleIcon name="shield-heart" size={64} />
        <p className={styles.eyebrow}>Fresh Phones directory</p>
        <h3>Verify an agent</h3>
        <p className={styles.cardDescription}>
          Know who you&apos;re talking to, before the next step.
        </p>
      </div>
      <form onSubmit={search} className={styles.form} aria-busy={loading}>
        <label htmlFor={`${id}-query`} className={styles.label}>
          Agent ID or complete name
        </label>
        <div className={styles.searchRow}>
          <input
            id={`${id}-query`}
            value={query}
            maxLength={200}
            disabled={loading}
            onChange={(event) => {
              setQuery(event.target.value);

              setResult(null);

              setError(null);

              setSearched(false);
            }}
            placeholder="Enter their ID or full name"
            aria-describedby={`${id}-privacy`}
            className={styles.input}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={`${hero.cta} ${styles.submit}`}
          >
            <DoodleIcon name="shield-heart" size={28} />
            {loading ? "Checking…" : "Verify agent"}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className={`${styles.feedback} ${styles.negative}`}>
          {error}
        </p>
      )}
      {searched && !loading && result && (
        <div aria-live="polite" aria-atomic="true">
          {result.found ? (
            <div
              className={`${styles.feedback} ${result.is_active ? styles.positive : styles.negative}`}
            >
              <CheckCircle
                weight="fill"
                className={styles.feedbackIcon}
                aria-hidden="true"
              />
              <div>
                <p className={styles.agentName}>{result.full_name}</p>
                <p className={styles.agentCode}>Code {result.agent_code}</p>
                <span className={styles.status}>
                  {result.is_active ? "Active agent" : "Inactive"}
                </span>
              </div>
            </div>
          ) : (
            <div className={`${styles.feedback} ${styles.negative}`}>
              <XCircle
                weight="fill"
                className={styles.feedbackIcon}
                aria-hidden="true"
              />
              <p>
                No matching agent found. Be cautious and verify before sending
                money.
              </p>
            </div>
          )}
        </div>
      )}
      <div className={styles.privacy} id={`${id}-privacy`}>
        <DoodleIcon name="lock-heart" size={28} />
        <p>
          Only their name, masked code, and status are shown.
          <span>Private contact and identity records stay private.</span>
        </p>
      </div>
    </div>
  );
}
