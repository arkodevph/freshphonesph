import type { PortalApplicationSummary } from "@freshphones/contracts";
import { formatPeso } from "./currency";

export type ApplicationSummarySection = {
  title: string;
  fields: { label: string; value: string }[];
  note?: string;
};

export function capturedApplicationMembership(query: string): string | null {
  const values = new URLSearchParams(query).getAll("membership");

  return values.length === 1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      values[0],
    )
    ? values[0].toLowerCase()
    : null;
}

function recorded(value: string | null | undefined) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim() || "Not recorded";
}

export function applicationSummaryDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(`${value.slice(0, 10)}T00:00:00+08:00`);

  return Number.isNaN(parsed.getTime())
    ? "Not recorded"
    : parsed.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export function applicationSummaryGeneratedAt(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function applicationSummarySections(
  summary: PortalApplicationSummary,
): ApplicationSummarySection[] {
  const { membership, batch, plan } = summary;

  const status = (value: string) => {
    return value.toLowerCase().replaceAll("_", " ");
  };

  const cadence = {
    WEEKLY: "Weekly",
    SEMIMONTHLY: "Twice monthly",
    MONTHLY: "Monthly",
  };

  const sections: ApplicationSummarySection[] = [
    {
      title: "Member details",
      fields: [
        { label: "Full name", value: recorded(membership.name) },
        { label: "Email", value: recorded(membership.email) },
        { label: "Phone", value: recorded(membership.phone) },
        { label: "Membership reference", value: membership.id },
        { label: "Membership status", value: status(membership.status) },
        {
          label: "Joined date",
          value: applicationSummaryDate(membership.joinedAt),
        },
      ],
    },
    {
      title: "Batch and unit",
      fields: [
        { label: "Batch", value: recorded(batch.code) },
        { label: "Unit", value: recorded(membership.unitModel || batch.model) },
        { label: "Batch status", value: status(batch.status) },
        {
          label: "Batch start date",
          value: applicationSummaryDate(batch.startDate),
        },
        {
          label: "Batch end date",
          value: applicationSummaryDate(batch.endDate),
        },
      ],
    },
    {
      title: "Recorded installment plan",
      fields: [
        {
          label: "Plan",
          value: plan.individual ? "Individual membership plan" : "Batch plan",
        },
        {
          label: "Plan start date",
          value: applicationSummaryDate(plan.startDate),
        },
        { label: "Plan end date", value: applicationSummaryDate(plan.endDate) },
        {
          label: "Installment frequency",
          value: plan.cadence ? cadence[plan.cadence] : "Not recorded",
        },
        {
          label: "Installments issued",
          value: plan.issuedSchedule
            ? String(plan.issuedSchedule.installmentCount)
            : "No schedule issued",
        },
        {
          label: "First installment due",
          value: applicationSummaryDate(plan.issuedSchedule?.firstDueDate),
        },
        {
          label: "Last installment due",
          value: applicationSummaryDate(plan.issuedSchedule?.lastDueDate),
        },
        {
          label: "Original scheduled amount",
          value: plan.issuedSchedule
            ? formatPeso(plan.issuedSchedule.originalTotal)
            : "No schedule issued",
        },
      ],
      note: "Payment activity is available in your statement of account.",
    },
  ];

  if (membership.replacementCompletedAt) {
    sections[0].fields.push({
      label: "Replacement completed",
      value: applicationSummaryDate(membership.replacementCompletedAt),
    });
  }

  return sections;
}

export type ApplicationSummaryState =
  | { status: "loading"; membershipId: string | null }
  | { status: "ready"; membershipId: string; summary: PortalApplicationSummary }
  | { status: "error"; membershipId: string | null; message: string };

export function createApplicationSummaryLoader(
  read: (membershipId: string) => Promise<PortalApplicationSummary>,
  onChange: (state: ApplicationSummaryState) => void,
) {
  let generation = 0;

  async function load(membershipId: string | null) {
    const request = ++generation;

    if (!membershipId) {
      onChange({
        status: "error",
        membershipId: null,
        message:
          "Choose a batch in My documents to open its application summary.",
      });

      return;
    }

    onChange({ status: "loading", membershipId });

    try {
      const summary = await read(membershipId);

      if (request !== generation) {
        return;
      }

      if (summary.membership.id !== membershipId) {
        throw new Error(
          "This summary does not match the selected membership. Please retry.",
        );
      }

      onChange({ status: "ready", membershipId, summary });
    } catch (error) {
      if (request !== generation) {
        return;
      }

      onChange({
        status: "error",
        membershipId,
        message:
          error instanceof Error
            ? error.message
            : "Could not load your application summary. Please retry.",
      });
    }
  }

  return {
    load,
    cancel() {
      ++generation;
    },
  };
}
