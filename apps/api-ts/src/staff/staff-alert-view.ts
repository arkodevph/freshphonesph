import type {
  StaffAlert,
  TaskAlertKind,
  PaymentResultKind,
  PaymentReviewKind,
  EnrollmentAlertKind,
  SupportAlertKind,
  AccountAlertKind,
} from "@freshphones/contracts";
import { paymentReviewTitles } from "./payment-review-alerts";
import { supportAlertTitles } from "./support-alerts";
import { accountAlertTitles } from "./account-alerts";
import { enrollmentAlertTitles } from "./enrollment-alerts";

export type AlertRow = {
  id: string;
  paymentId: string | null;
  caseId: string | null;
  accountId: string | null;
  entity:
    | "task"
    | "payment"
    | "payment-result"
    | "payment-review"
    | "support"
    | "account"
    | "enrollment";
  kind:
    | AccountAlertKind
    | EnrollmentAlertKind
    | TaskAlertKind
    | PaymentResultKind
    | PaymentReviewKind
    | SupportAlertKind
    | "FINANCE_PENDING";
  version: number;
  amount: string | null;
  clientName: string | null;
  batchCode: string | null;
  taskTitle: string | null;
  deadline: Date | null;
  readAt: Date | null;
  occurredAt: Date;
};

const titles: Record<TaskAlertKind, string> = {
  TASK_ASSIGNED: "Task assigned to you",
  TASK_DUE_SOON: "Task due within 24 hours",
  TASK_OVERDUE: "Task overdue",
};

const resultTitles: Record<PaymentResultKind, string> = {
  PAYMENT_VERIFIED: "Payment verified by Finance",
  PAYMENT_REJECTED: "Payment rejected by Finance",
  PAYMENT_CLARIFICATION: "Finance needs payment clarification",
};

export function staffAlertView(row: AlertRow): StaffAlert {
  const base = {
    id: row.id,
    readAt: row.readAt?.toISOString() ?? null,
    occurredAt: row.occurredAt.toISOString(),
  };

  if (row.entity === "enrollment") {
    const kind = row.kind as EnrollmentAlertKind;

    return {
      ...base,
      entity: "enrollment",
      kind,
      version: row.version,
      title: enrollmentAlertTitles[kind],
      message: `${row.batchCode} · ${kind === "ENROLLMENT_PENDING" ? "A member enrollment needs your review." : "Open your enrollment request for the decision and review note."}`,
      targetPath: `/system/enrollments?request=${row.id}`,
    };
  }

  if (row.entity === "account") {
    return {
      ...base,
      entity: "account",
      kind: row.kind as AccountAlertKind,
      accountId: row.accountId!,
      version: row.version,
      title: accountAlertTitles[row.kind as AccountAlertKind],
      message: `${row.clientName} · ${row.taskTitle} · By ${row.batchCode}`,
      targetPath: `/system/team?account=${row.accountId}`,
    };
  }

  if (row.entity === "support") {
    return {
      ...base,
      entity: "support",
      kind: row.kind as SupportAlertKind,
      caseId: row.caseId!,
      version: row.version,
      title: supportAlertTitles[row.kind as SupportAlertKind],
      message: `Case #${row.caseId!.slice(0, 8)} · Open the current concern and conversation`,
      targetPath: `/system/support?case=${row.caseId}`,
    };
  }

  if (row.entity === "payment") {
    return {
      ...base,
      entity: "payment",
      kind: "FINANCE_PENDING",
      version: row.version,
      title: "Payment awaiting verification",
      message: `PHP ${row.amount} · ${row.clientName} · ${row.batchCode}`,
      targetPath: `/system/payments?payment=${row.id}`,
    };
  }

  if (row.entity === "payment-review") {
    return {
      ...base,
      entity: "payment-review",
      kind: row.kind as PaymentReviewKind,
      paymentId: row.paymentId!,
      version: row.version,
      title: paymentReviewTitles[row.kind as PaymentReviewKind],
      message: `${row.clientName} · ${row.batchCode} · Open for the saved review note and current payment status`,
      targetPath: `/system/payments?payment=${row.paymentId}&review=${row.id}`,
    };
  }

  if (row.entity === "payment-result") {
    return {
      ...base,
      entity: "payment-result",
      kind: row.kind as PaymentResultKind,
      paymentId: row.paymentId!,
      version: row.version,
      title: resultTitles[row.kind as PaymentResultKind],
      message: `PHP ${row.amount} · ${row.clientName} · ${row.batchCode} · Open for Finance's decision and notes`,
      targetPath: `/system/payments?payment=${row.paymentId}&result=${row.id}`,
    };
  }

  const kind = row.kind as TaskAlertKind;

  const deadline = row.deadline!.toISOString();

  return {
    ...base,
    entity: "task",
    kind,
    deadline,
    title: titles[kind],
    message: `${row.taskTitle} · Due ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(row.deadline!)} PHT`,
    targetPath: `/system/tasks?task=${row.id}`,
  };
}
