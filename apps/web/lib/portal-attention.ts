import type { DocumentRequirement, PortalScheduleItem, SupportCase } from "./api";

export type PortalAttention = {
  key: string;
  title: string;
  detail: string;
  href: string;
  action: string;
};

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function portalAttention(
  documents: DocumentRequirement[], cases: SupportCase[], schedule: PortalScheduleItem[], today = manilaToday(),
): PortalAttention[] {
  const items: PortalAttention[] = [];

  const waiting = cases.filter((item) => item.status.toLowerCase() === "waiting_for_client");
  if (waiting.length) {
    items.push({
      key: "support-waiting",
      title: waiting.length === 1 ? "Support request needs your attention" : `${waiting.length} support requests need your attention`,
      detail: "Customer Service is waiting for details. Review the request and contact them in Messenger.",
      href: `/portal/support#case-${waiting[0].id}`,
      action: "View support request",
    });
  }

  const due = schedule.filter((item) => {
    const remaining = Number(item.expected_amount) - Number(item.paid_applied || 0);
    return item.due_date.slice(0, 10) <= today && Number.isFinite(remaining) && remaining > 0.005;
  });
  if (due.length) {
    const total = due.reduce((sum, item) => sum + Math.max(0, Number(item.expected_amount) - Number(item.paid_applied || 0)), 0);
    items.push({
      key: "installments-due",
      title: due.length === 1 ? `Installment ${due[0].sequence_no} has an amount due` : `${due.length} installments have amounts due`,
      detail: `${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(total)} remaining across installments due by today. Payments are coordinated in Messenger; this amount reflects Finance-verified records.`,
      href: `/portal/schedule#installment-${due[0].sequence_no}`,
      action: "Review payment schedule",
    });
  }

  const actionableDocuments = documents.filter((document) =>
    document.status === "MISSING" || document.status === "NEEDS_CLARIFICATION",
  ).sort((a, b) => Number(b.status === "NEEDS_CLARIFICATION") - Number(a.status === "NEEDS_CLARIFICATION"));
  for (const document of actionableDocuments) {
    items.push({
      key: `document-${document.key}`,
      title: document.status === "MISSING" ? `${document.label} needed` : `${document.label} needs a correction`,
      detail: document.status === "NEEDS_CLARIFICATION"
        ? document.latest?.clarification?.trim() || "Records asked for a corrected file."
        : "Upload this requirement for Records review.",
      href: `/portal/documents#document-${document.key}`,
      action: document.status === "MISSING" ? "Upload document" : "Review correction",
    });
  }

  return items;
}
