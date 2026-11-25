import { z } from "zod";

const paging = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().trim().max(100).default(""),
};

export const networkAgentsQuery = z
  .object({
    ...paging,
    sort: z
      .enum(["name_asc", "name_desc", "code_asc", "code_desc"])
      .default("name_asc"),
  })
  .strict();

export const networkBatchesQuery = z
  .object({
    ...paging,
    sort: z
      .enum(["code_asc", "code_desc", "model_asc", "model_desc"])
      .default("code_asc"),
  })
  .strict();

export const networkRequestsQuery = z
  .object({
    ...paging,
    sort: z.enum(["newest", "oldest"]).default("newest"),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    agentId: z.string().uuid().optional(),
    requestId: z.string().uuid().optional(),
  })
  .strict();

export type NetworkAgentsQuery = z.infer<typeof networkAgentsQuery>;

export type NetworkBatchesQuery = z.infer<typeof networkBatchesQuery>;

export type NetworkRequestsQuery = z.infer<typeof networkRequestsQuery>;

export type NetworkRequestCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

export type NetworkAgent = {
  id: string;
  name: string;
  supervisor: { name: string } | null;
  agentProfile: { code: string; active: boolean } | null;
  requests: NetworkRequestCounts;
};

export type NetworkBatch = {
  id: string;
  code: string;
  model: string;
  status: string;
  memberCount: number;
};

export type NetworkSummary = {
  agents: number;
  batches: number;
  requests: NetworkRequestCounts;
};

export type NetworkPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  summary: NetworkSummary;
};

export type NetworkEnrollment = {
  id: string;
  kind: "REPLACEMENT" | "NEW_MEMBER";
  name: string;
  batchCode: string;
  status: string;
  reason: string;
  version: number;
  submittedBy: string;
  submittedById: string;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type NetworkEnrollmentPage = {
  items: NetworkEnrollment[];
  total: number;
  page: number;
  pageSize: number;
  agent: NetworkAgent | null;
  scopeCounts: NetworkRequestCounts;
};
