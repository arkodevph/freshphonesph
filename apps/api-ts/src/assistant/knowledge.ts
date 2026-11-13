import type { AssistantQuestion, AssistantReply } from "@freshphones/contracts";
import { assistantPolicy } from "./policy";

// Reviewed product knowledge, never instructions extracted from user messages.
// No customer records, credentials, sample figures or external content belong here.
const topics = [
  {
    terms:
      /\b(payment|payments|verified|verification|pending|gcash|finance|receipt|receipts)\b/gi,
    title: "Payments and verification",
    paragraphs: [
      "Customers pay externally, such as through GCash or Messenger. Freshphones records those payments; it does not process or transfer money.",
      "Only Finance-verified payments affect a customer's balance. Pending, rejected and needs-clarification claims do not count as paid. Corrections and reversals follow the Finance workflow and retain an audit trail.",
      "Payment verification is a human Finance decision. A CEO or Owner confirmation does not grant Finance permission. Statements of Account and Payment Confirmations are operational documents, not official BIR invoices.",
    ],
    sources: [
      "Payment and finance scope (§7)",
      "Payment corrections and reversals",
    ],
  },
  {
    terms: /\b(balance|balances|remaining|due|outstanding|paid)\b/gi,
    title: "Customer balances",
    paragraphs: [
      "A customer's balance is derived from the agreement total due minus net Finance-verified payments. Pending payment claims are excluded. Approved corrections and reversals affect the verified credit through the Finance workflow.",
      "Balances are calculated from records rather than directly edited. Open Collections in Reports to review actual outstanding balances by batch. This guide has not retrieved a customer's balance.",
    ],
    sources: ["Records and balances (§6–7)", "Batch collection reports"],
  },
  {
    terms:
      /\b(sales|revenue|collections|reports?|monthly|trends?|earnings|reconciliation|summary|summarize)\b/gi,
    title: "Company reports",
    paragraphs: [
      "Use Payments for claim and verification status, Collections for batch totals and outstanding balances, Reconciliation for review exceptions, Tasks for task outcomes, Support for concerns, and Installment earnings for the installment earnings calculation.",
      "Set the reporting period and review the report's definitions before comparing totals. Sales, verified collections and installment earnings are different measures. This guide does not retrieve live figures or forecast results; open Reports for current authorized data.",
    ],
    sources: ["Reports (§9)", "Reports page and installment earnings"],
  },
  {
    terms:
      /\b(batch|batches|enrollment|enrollments|paluwagan|schedule|installments?|membership|memberships)\b/gi,
    title: "Batches and enrollment",
    paragraphs: [
      "Freshphones manages iPhone and iPad Paluwagan group-savings installment operations. Batches organize agreements, payment schedules, assigned staff and member records. Enrollment follows the system's submission and human review workflow.",
      "Installment schedules come from recorded agreement terms. A customer can have multiple memberships; select the intended membership before viewing its schedule or balance. Changes must use the authorized enrollment or records workflow.",
    ],
    sources: [
      "Records and enrollment (§6)",
      "Calendar schedules and multiple memberships",
    ],
  },
  {
    terms:
      /\b(catalog|catalogue|product|products|price|prices|availability|photo|photos|iphone|ipad|device|devices)\b/gi,
    title: "Catalog and offers",
    paragraphs: [
      "The public catalog shows published device listings, entered prices, availability and offer terms. Staff with catalog-management permission maintain listings and photos. Catalog offers are separate from a customer's recorded agreement.",
      "Review the item and its latest version before changing a listing. Confirm publication, price or photo changes in the authorized catalog workflow. This guide cannot add, edit, publish or remove a listing.",
    ],
    sources: ["Public catalog (§4)", "Catalog installment breakdown"],
  },
  {
    terms:
      /\b(task|tasks|kpi|salary|salaries|wage|wages|deduction|deductions|payroll|hr|employee|employees)\b/gi,
    title: "Tasks and human decisions",
    paragraphs: [
      "Task deadlines and completion status are objective records. KPI outcomes and consequential HR actions require authorized human review. Freshphones does not automatically calculate or apply salary deductions.",
      "Confidential HR records require the specific approved access grant. Confirmation cannot bypass this requirement, and this guide does not retrieve confidential employee data.",
    ],
    sources: [
      "Tasks and KPI (§8)",
      "Confidential HR access and action approvals",
    ],
  },
  {
    terms: /\b(withdrawal|withdrawals|refund|refunds|replacement)\b/gi,
    title: "Withdrawals and refunds",
    paragraphs: [
      "Membership withdrawals use separate submission, review, decision and refund permissions. Follow the withdrawal record's authorized workflow and preserve agreement and payment history.",
      "A refund decision and recording a refund payment are separate human actions. The assistant cannot approve a withdrawal, authorize a refund or transfer money.",
    ],
    sources: ["Member withdrawals and refund decisions"],
  },
  {
    terms:
      /\b(support|concern|concerns|ticket|tickets|inquiry|inquiries|complaint|complaints)\b/gi,
    title: "Customer support",
    paragraphs: [
      "Support concerns record their source, status and authorized handling. Customers use the portal support entry; staff use their permitted support workspace. Keep private contact details and attachments within the authorized record.",
      "Sending messages, assigning cases or changing status affects the system and requires the responsible user's review and confirmation. This guide does not send messages or change cases.",
    ],
    sources: ["Support (§10)", "Support concern source tracking"],
  },
  {
    terms:
      /\b(privacy|retention|erase|erasure|deletion|personal|document|documents|bir|invoice|invoices)\b/gi,
    title: "Privacy and records",
    paragraphs: [
      "Private documents and personal information are available only through authorized workflows. Public agent verification shows only the allowed name, masked code and active status, without private phone numbers, addresses or identity documents.",
      "Removal of personal data follows retention policy, holds, preview and approved erasure workflows. Financial and audit history must not be silently deleted. Operational payment documents are not official BIR invoices.",
    ],
    sources: [
      "Privacy and security (§14, §16)",
      "Retention and deletion",
      "Public agent verification (§18.8)",
    ],
  },
  {
    terms:
      /\b(account|accounts|role|roles|permission|permissions|access|confirm|confirmation|approval|approve|security|password|passwords)\b/gi,
    title: "Permissions and confirmation",
    paragraphs: [
      "Cloud is limited to Freshphones operations and approved system knowledge. Reading permitted guidance does not require a change confirmation. Access to business records still requires the user's existing role and record scope.",
      "Adding, editing, deleting, publishing, verifying, approving, rejecting, uploading, importing, exporting private data, sending messages and changing access require explicit review and confirmation of the specific action. Confirmation never grants a missing permission.",
      "Cloud currently has no record-changing tools. Changes must be completed by authorized staff in the existing system workflows.",
    ],
    sources: [
      "Role and access controls (§3, §16)",
      "Cloud confirmation policy",
    ],
  },
  {
    terms: /\b(recruitment|applicant|applicants|careers?|hiring|job|jobs)\b/gi,
    title: "Recruitment",
    paragraphs: [
      "Public career applications enter the recruitment review workflow. Authorized staff review applicants and maintain job records. Applicant details and attachments are private; consequential hiring and HR decisions remain human decisions.",
      "Review and confirm changes in the recruitment workspace with the required permissions. This guide cannot submit hiring decisions or expose private applicant records.",
    ],
    sources: ["Recruitment (§11)", "Recruitment directory"],
  },
  {
    terms:
      /\b(freshphones|fresh\s+phones|fresh\s+ai|system|help|capabilities|operate)\b/gi,
    title: "Freshphones operations guide",
    paragraphs: [
      "Fresh Phones PH manages Paluwagan phone and tablet installment operations: public catalog, enrollment, batches, clients, external payment records, Finance verification, schedules, reports, support, tasks and recruitment.",
      "Ask about these workflows, balances, payment status, reports or permissions. Cloud explains approved Freshphones knowledge. Live records and record-changing actions are not available in chat.",
    ],
    sources: ["Freshphones scope and system overview"],
  },
];

const changeRequest =
  /\b(add|create|edit|update|delete|remove|erase|publish|unpublish|verify|approve|reject|send|upload|import|export|assign|revoke|grant|reset|cancel|refund|change|save|record|mark|restore|archive|disable|enable|execute|run)\b/i;

export function answerFreshphones(input: AssistantQuestion): AssistantReply {
  const matches = topics
    .map((topic) => {
      return {
        topic,
        score: new Set(input.question.toLowerCase().match(topic.terms)).size,
      };
    })
    .filter(({ score }) => {
      return score > 0;
    })
    .sort((a, b) => {
      return b.score - a.score;
    });

  const topic = matches[0]?.topic;

  const change = changeRequest.test(input.question);

  return {
    mode: "knowledge-guide",
    kind: change ? "change-request" : topic ? "knowledge" : "out-of-scope",
    title: change
      ? "Review required before any system change"
      : (topic?.title ?? "Freshphones questions only"),
    paragraphs: [
      ...(change
        ? [
            "No action has been taken. Cloud has no connected change tools. Use the authorized system workflow to review the exact record and proposed changes before submitting. A chat message, including ‘yes’ or ‘confirmed’, does not authorize execution.",
          ]
        : []),
      ...(topic?.paragraphs ?? [
        "I can help with Freshphones workflows, balances, payments, reports, enrollment, catalog, support and permissions. Ask a specific Freshphones question. I cannot answer unrelated questions or retrieve private records from this guide.",
      ]),
      ...(input.period
        ? [
            "Your selected period is a date label only. No report figures or business records were attached to this answer.",
          ]
        : []),
    ],
    sources: topic?.sources ?? [],
    // This endpoint is restricted to CEO/Owner; do not offer operational workspaces
    // whose permissions these reporting roles do not possess.
    links: [{ label: "Open company reports", href: "/system/reports" }],
    policy: assistantPolicy,
  };
}

export const freshphonesKnowledge = topics.map((topic) => {
  return {
    title: topic.title,
    paragraphs: topic.paragraphs,
    sources: topic.sources,
  };
});
