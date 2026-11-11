import type { Client, ClientBalance, Payment } from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export type AccountStatement = {
  documentType: "STATEMENT_OF_ACCOUNT";
  officialTaxInvoice: false;
  title: string;
  notice: string;
  generatedAt: string;
  balance: ClientBalance;
  verifiedPayments: Pick<
    Payment,
    | "id"
    | "amount"
    | "effectiveAmount"
    | "adjustments"
    | "paymentDate"
    | "method"
    | "referenceNumber"
  >[];
};

export type PaymentConfirmation = {
  documentType: "PAYMENT_CONFIRMATION";
  officialTaxInvoice: false;
  title: string;
  notice: string;
  generatedAt: string;
  payment: Payment;
};

export type AccountDocument = AccountStatement | PaymentConfirmation;

export type AccountDocumentTarget = {
  kind: "statement" | "confirmation";
  id: string;
};

export type AccountDocumentSnapshot = {
  client: Client;
  record: AccountDocument;
};

/** Read fresh scoped records. Confirmation identity comes from that payment's membership. */
export async function getStaffAccountDocument(
  target: AccountDocumentTarget,
  signal?: AbortSignal,
): Promise<AccountDocumentSnapshot> {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(target.id)) {
    throw new Error("Invalid document reference.");
  }

  const record =
    target.kind === "statement"
      ? await tsRequest<AccountStatement>(`/clients/${target.id}/statement`, {
          signal,
        })
      : await tsRequest<PaymentConfirmation>(
          `/payments/${target.id}/confirmation`,
          { signal },
        );

  const clientId =
    "payment" in record ? record.payment.clientId : record.balance.clientId;

  if (
    record.officialTaxInvoice !== false ||
    !record.notice ||
    (target.kind === "statement" &&
      (record.documentType !== "STATEMENT_OF_ACCOUNT" ||
        clientId !== target.id)) ||
    (target.kind === "confirmation" &&
      (record.documentType !== "PAYMENT_CONFIRMATION" ||
        !("payment" in record) ||
        record.payment.id !== target.id ||
        record.payment.status !== "VERIFIED"))
  ) {
    throw new Error(
      "This account document is unavailable. Refresh and try again.",
    );
  }

  const client = await tsRequest<Client>(`/clients/${clientId}`, { signal });

  if (
    client.id !== clientId ||
    ("payment" in record && client.batch.id !== record.payment.batchId)
  ) {
    throw new Error(
      "The document's member or batch changed. Refresh and try again.",
    );
  }

  return { client, record };
}
