"use client";

import { useEffect, useState } from "react";
import { tsRequest } from "@/lib/ts-api";
import type { AccessDraft } from "./team-view";
import type { Employee } from "@/lib/api";

type Options = {
  staff: { id: string; name: string; role: string }[];
  profiles: {
    id: string;
    name: string;
    code: string;
    account: { id: string } | null;
  }[];
};

export default function AccountAssignments({
  account,
  role,
  draft,
  edit,
  disabled,
}: {
  account: Employee;
  role: string;
  draft: AccessDraft | null;
  edit: (patch: Partial<AccessDraft>) => void;
  disabled: boolean;
}) {
  const [options, setOptions] = useState<Options | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void tsRequest<Options>("/access/assignment-options")
      .then((data) => {
        if (active) {
          setOptions(data);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load assignment choices.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const supervisors: Record<string, readonly string[]> = {
    coo: ["CEO"],
    batch_manager: ["COO"],
    hr_payroll: ["COO"],
    finance_officer: ["COO"],
    records_monitoring: ["COO"],
    kpi_officer: ["COO"],
    operations_coordinator: ["COO"],
    csr: ["COO"],
    pioneer_agent: ["OPERATIONS_COORDINATOR"],
    agent: ["PIONEER_AGENT"],
    batch_handler: ["BATCH_MANAGER"],
  };

  const selected =
    draft?.supervisorId !== undefined
      ? draft.supervisorId
      : account.supervisor_id;

  const profile =
    draft?.agentProfileId !== undefined
      ? draft.agentProfileId
      : account.agent_profile_id;

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <fieldset disabled={disabled || !options} className="space-y-3">
      <legend className="font-bold">Business assignments</legend>
      {supervisors[role] && (
        <label className="team-form-field">
          <span>Supervisor</span>
          <select
            value={selected ?? ""}
            onChange={(event) => {
              return edit({ supervisorId: event.target.value || null });
            }}
          >
            <option value="">Not assigned</option>
            {options?.staff
              .filter((person) => {
                return (
                  person.id !== String(account.id) &&
                  supervisors[role].includes(person.role)
                );
              })
              .map((person) => {
                return (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                );
              })}
          </select>
        </label>
      )}
      {role === "agent" && (
        <label className="team-form-field">
          <span>Agent profile</span>
          <select
            value={profile ?? ""}
            onChange={(event) => {
              return edit({ agentProfileId: event.target.value || null });
            }}
          >
            <option value="">Not assigned</option>
            {options?.profiles
              .filter((item) => {
                return !item.account || item.account.id === String(account.id);
              })
              .map((item) => {
                return (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.code}
                  </option>
                );
              })}
          </select>
          <small>
            The linked Agent profile determines which batches this account can
            submit enrollments for.
          </small>
        </label>
      )}
    </fieldset>
  );
}
