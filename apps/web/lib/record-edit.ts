import type { Batch, BatchInput, Client, ClientInput } from "@freshphones/contracts";

export type RecordDraft = {
  code: string; model: string; status: string; contractPrice: string; installmentCount: string;
  cadence: string; startDate: string; endDate: string; name: string; email: string; phone: string;
  batchId: string; unitModel: string; joinedAt: string; releaseStatus: string;
};
export function recordChanged(previous: Batch | Client, latest: Batch | Client) {
  if (previous.version !== latest.version) return true;
  if ("code" in previous && "code" in latest) return Boolean(previous.termsLocked) !== Boolean(latest.termsLocked);
  if ("name" in previous && "name" in latest) return Boolean(previous.scheduleIssued) !== Boolean(latest.scheduleIssued);
  return true;
}
export function recordDraft(record: Batch | Client): RecordDraft {
  const empty: RecordDraft = { code: "", model: "", status: record.status, contractPrice: "", installmentCount: "",
    cadence: "", startDate: "", endDate: "", name: "", email: "", phone: "", batchId: "",
    unitModel: "", joinedAt: "", releaseStatus: "" };
  if ("code" in record) return { ...empty, code: record.code, model: record.model,
    contractPrice: record.contractPrice ?? "", installmentCount: record.installmentCount?.toString() ?? "",
    cadence: record.cadence ?? "", startDate: record.startDate, endDate: record.endDate };
  return { ...empty, name: record.name, email: record.email, phone: record.phone,
    batchId: record.batchId, unitModel: record.unitModel ?? "", joinedAt: record.joinedAt ?? "", releaseStatus: record.releaseStatus };
}
export function batchEditInput(draft: RecordDraft): BatchInput {
  return { code: draft.code, model: draft.model, status: draft.status as BatchInput["status"],
    startDate: draft.startDate, endDate: draft.endDate,
    ...(draft.contractPrice || draft.installmentCount || draft.cadence ? {
      contractPrice: draft.contractPrice, installmentCount: Number(draft.installmentCount), cadence: draft.cadence as BatchInput["cadence"],
    } : {}) };
}
export function clientEditInput(draft: RecordDraft): ClientInput {
  return { name: draft.name, email: draft.email, phone: draft.phone, batchId: draft.batchId,
    unitModel: draft.unitModel, status: draft.status as ClientInput["status"],
    releaseStatus: draft.releaseStatus as ClientInput["releaseStatus"], ...(draft.joinedAt ? { joinedAt: draft.joinedAt } : {}) };
}
