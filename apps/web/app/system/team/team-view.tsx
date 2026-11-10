"use client";

import { ROLES } from "@/lib/api";
import { Users, X } from "@phosphor-icons/react";
import { type ReactNode } from "react";

export const PAGE_SIZE = 20;

export const EMPTY_FORM = {
  email: "",
  full_name: "",
  role: "records_monitoring",
  password: "",
};

export const roleDescriptions: Record<string, string> = {
  system_admin: "Technical administration; Finance alone verifies payments.",
  ceo: "Business Owner / CEO: company overview and reports only.",
  batch_manager: "Assigned batches, Handlers and enrollment approvals.",
  kpi_officer:
    "Staff targets, factual performance and KPI evaluations; no private payroll files.",
  operations_coordinator:
    "Assigned Pioneer and Agent teams, coordination and tasks.",
  pioneer_agent: "Assigned Agents, coaching and recruitment progress.",
  agent: "Own endorsements and enrollment requests; approval is required.",
  batch_handler: "Assigned members, pending payment entry and proof uploads.",
  csr: "Customer lookup, inquiries and support; no financial edits.",
  coo: "Business operations, role assignment and oversight; no final payment verification.",
  general_manager: "Operations, clients, records, and management reporting.",
  hr_payroll: "Approved HR and payroll responsibilities.",
  finance_officer:
    "Final payment verification, audited corrections and financial reports.",
  records_monitoring: "Paluwagan batches, client records, and monitoring.",
  analytics: "Authorized summaries, reports, and trends.",
  cs_head: "Customer service oversight and resolution workflows.",
  cs_team: "Customer support work assigned to the service team.",
  core_handler: "Only assigned operational work and records.",
  customer: "Access to the customer’s own portal records only.",
};

export const roleLabel = (value: string) => {
  return value === "customer"
    ? "Customer"
    : (ROLES.find(([key]) => {
        return key === value;
      })?.[1] ?? value);
};

export const initials = (name: string) => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0];
    })
    .join("")
    .toUpperCase();
};

export const formatDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

export type Toast = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export type CreateField = keyof typeof EMPTY_FORM;

export type AccessDraft = {
  role: string;
  supervisorId?: string | null;
  agentProfileId?: string | null;
  active: boolean;
  version?: number;
  hrConfidentialAccess: boolean;
  hrAccessReason: string;
  hrDecision: boolean;
};

export function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <article className="team-summary-card">
      <span className={`team-summary-icon is-${tone}`}>
        <Users weight="fill" />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function Field({
  label,
  error,
  inputId,
  children,
}: {
  label: string;
  error?: string;
  inputId: string;
  children: ReactNode;
}) {
  return (
    <label className="team-form-field" htmlFor={inputId}>
      <span>{label}</span>
      {children}
      {error && <em id={`${inputId}-error`}>{error}</em>}
    </label>
  );
}

export function DialogHeading({
  headingId,
  title,
  description,
  onClose,
  disabled = false,
}: {
  headingId: string;
  title: string;
  description: string;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="team-dialog-heading">
      <div>
        <h3 id={headingId}>{title}</h3>
        <p>{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X />
      </button>
    </header>
  );
}

export function SkeletonRow() {
  return (
    <tr className="team-skeleton-row" aria-hidden="true">
      <td>
        <span className="team-skeleton is-person" />
      </td>
      <td>
        <span className="team-skeleton" />
      </td>
      <td>
        <span className="team-skeleton is-short" />
      </td>
      <td>
        <span className="team-skeleton" />
      </td>
      <td>
        <span className="team-skeleton is-short" />
      </td>
    </tr>
  );
}
