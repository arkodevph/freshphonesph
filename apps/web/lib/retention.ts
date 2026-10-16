import type {
  Page,
  RetentionHold,
  RetentionPolicy,
  RetentionPreview,
  RetentionRequest,
  RetentionScope,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

const post = <T>(path: string, body: unknown) => {
  return tsRequest<T>(`/retention${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const retentionPolicies = () => {
  return tsRequest<{ items: RetentionPolicy[] }>("/retention/policies");
};

export const createRetentionPolicy = (input: {
  scope: RetentionScope;
  days: number;
  basis: string;
  backupInstructions: string;
  externalCopyInstructions: string;
}) => {
  return post<RetentionPolicy>("/policies", input);
};

export const approveRetentionPolicy = (
  id: string,
  approvalReference: string,
) => {
  return post<RetentionPolicy>(`/policies/${id}/approve`, {
    approvalReference,
  });
};

export const retentionCandidates = (
  scope: RetentionScope,
  q = "",
  page = 1,
) => {
  return tsRequest<Page<RetentionPreview>>(
    `/retention/candidates?${new URLSearchParams({ scope, q, page: String(page) })}`,
  );
};

export const retentionPreview = (scope: RetentionScope, subjectId: string) => {
  return post<RetentionPreview>("/preview", { scope, subjectId });
};

export const retentionRequests = (page = 1) => {
  return tsRequest<Page<RetentionRequest>>(`/retention/requests?page=${page}`);
};

export const requestRetentionDeletion = (
  preview: RetentionPreview,
  reason: string,
) => {
  return post<RetentionRequest>("/requests", {
    scope: preview.scope,
    subjectId: preview.subjectId,
    previewHash: preview.previewHash,
    reason,
  });
};

export const decideRetentionDeletion = (
  request: RetentionRequest,
  approved: boolean,
  reason: string,
) => {
  return post<RetentionRequest>(`/requests/${request.id}/decision`, {
    version: request.version,
    approved,
    reason,
  });
};

export const executeRetentionDeletion = (
  request: RetentionRequest,
  confirmation: string,
) => {
  return post<RetentionRequest>(`/requests/${request.id}/execute`, {
    version: request.version,
    confirmation,
  });
};

export const retryRetentionFiles = (id: string) => {
  return post<RetentionRequest>(`/requests/${id}/retry-files`, {});
};

export const confirmRetentionFollowup = (
  request: RetentionRequest,
  reference: string,
) => {
  return post<RetentionRequest>(`/requests/${request.id}/followup`, {
    version: request.version,
    reference,
  });
};

export const retentionDeletionLedger = () => {
  return tsRequest<object>("/retention/deletion-ledger");
};

export const retentionHolds = (page = 1) => {
  return tsRequest<Page<RetentionHold>>(`/retention/holds?page=${page}`);
};

export const placeRetentionHold = (
  preview: RetentionPreview,
  reason: string,
) => {
  return post("/holds", {
    scope: preview.scope,
    subjectId: preview.subjectId,
    reason,
  });
};

export const releaseRetentionHold = (id: string, reason: string) => {
  return post(`/holds/${id}/release`, { reason });
};
