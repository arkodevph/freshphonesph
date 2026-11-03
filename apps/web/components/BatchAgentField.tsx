"use client";

import { useEffect, useState } from "react";
import { getAssignmentOptions, type AssignmentOptions } from "@/lib/api";
import { Field, inputCls } from "@/components/FormField";

export function BatchAgentField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [agents, setAgents] = useState<AssignmentOptions["agents"]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);

    setError(null);

    void getAssignmentOptions()
      .then((options) => {
        if (active) {
          setAgents(
            options.agents.filter((agent) => {
              return agent.active;
            }),
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAgents([]);

          setError(
            error instanceof Error ? error.message : "Could not load agents.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <div className="min-w-0">
      <Field label="Agent">
        <select
          required
          value={value}
          disabled={loading || Boolean(error)}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={inputCls}
          aria-describedby="batch-number-help"
        >
          <option value="">
            {loading ? "Loading agents…" : "Choose an active agent"}
          </option>
          {agents.map((agent) => {
            return (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.code ? ` — ${agent.code}` : ""}
              </option>
            );
          })}
        </select>
      </Field>
      <p id="batch-number-help" className="mt-1 text-xs text-ink-soft">
        The batch number uses this Agent&apos;s code and next sequence, for
        example AB-001.
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setAttempt((value) => {
                return value + 1;
              });
            }}
          >
            Retry agents
          </button>
        </p>
      ) : !loading && agents.length === 0 ? (
        <p role="status" className="mt-1 text-xs text-ink-soft">
          Add an active Agent in the Agent directory before creating a batch.
        </p>
      ) : null}
    </div>
  );
}
