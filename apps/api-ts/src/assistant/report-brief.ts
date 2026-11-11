import { ForbiddenException } from "@nestjs/common";
import {
  reportKindsFor,
  type AssistantQuestion,
  type AssistantReply,
  type User,
} from "@freshphones/contracts";
import type { ReportsService } from "../reports/reports.service";
import { chartPeriod } from "../reports/charts";

export async function answerReportBrief(
  user: User,
  input: AssistantQuestion,
  reports: Pick<ReportsService, "assistantSummary">,
): Promise<AssistantReply> {
  const allowed = reportKindsFor(user);

  if (
    !["CEO", "OWNER"].includes(user.role) ||
    !["PAYMENTS", "COLLECTIONS", "RECONCILIATION", "TASKS", "SUPPORT"].every(
      (kind) => {
        return allowed.includes(kind);
      },
    )
  ) {
    throw new ForbiddenException(
      "This report summary requires Owner / CEO report access.",
    );
  }

  const brief = await reports.assistantSummary(
    input.reportRange ?? chartPeriod(6),
  );

  const peso = (value: string) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value));
  };

  return {
    mode: "report-summary",
    kind: "knowledge",
    title: "Your business, at a glance",
    brief,
    paragraphs: [
      `${brief.payments.verifiedPayments} Finance-verified payments contributed ${peso(brief.payments.verifiedAmount)} during this period. ${brief.payments.pendingVerification} payment claims totaling ${peso(brief.payments.pendingAmount)} are awaiting verification.`,
      `${brief.reconciliation.paymentsWithFlags} payments have reconciliation review flags. There are ${brief.support.open} open support cases among cases created in this period and ${brief.tasks.late} tasks marked late among tasks created in this period.`,
      `Current outstanding balances total ${peso(brief.collections.remainingBalance)}. Scheduled installments due in this period total ${peso(brief.scheduled.scheduledAmount)}; scheduled amounts are not collected payments or profit.`,
    ],
    sources: [
      "Payments",
      "Collections",
      "Reconciliation",
      "Tasks",
      "Support",
      "Installment earnings",
    ],
    links: [{ label: "Explore full reports", href: "/system/reports" }],
    policy: {
      scope: "freshphones-only",
      providerConnected: false,
      canExecuteChanges: false,
      changesRequireConfirmation: true,
    },
  };
}
