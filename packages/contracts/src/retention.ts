import { z } from 'zod';

export const retentionScopes = ['APPLICANT', 'CUSTOMER', 'EMPLOYEE', 'PRIVATE_FILE'] as const;
export const retentionScopeSchema = z.enum(retentionScopes);
export type RetentionScope = z.infer<typeof retentionScopeSchema>;
export const retentionScopeLabels: Record<RetentionScope, string> = {
  APPLICANT: 'Finalized applications', CUSTOMER: 'Completed customer records',
  EMPLOYEE: 'Inactive employee accounts', PRIVATE_FILE: 'Private files',
};
export const retentionScopeDescriptions: Record<RetentionScope, string> = {
  APPLICANT: 'Erase finalized application details, linked audit details, notice evidence and attachments.',
  CUSTOMER: 'Remove customer identity, contact details, private files and linked personal text. Keep monetary amounts, schedules and event references.',
  EMPLOYEE: 'Remove inactive account identity, credentials, sessions and completed task details. Keep operational event references.',
  PRIVATE_FILE: 'Delete an unreferenced file or a file attached to finalized work, with its download links and filename metadata.',
};
export const retentionTargetSchema = z.object({ scope: retentionScopeSchema, subjectId: z.string().uuid() }).strict();
export const retentionQuerySchema = z.object({
  scope: retentionScopeSchema.default('APPLICANT'), page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(100).default(''),
}).strict();
export const retentionPolicySchema = z.object({
  scope: retentionScopeSchema, days: z.number().int().min(1).max(36500),
  basis: z.string().trim().min(10).max(2000),
  backupInstructions: z.string().trim().min(10).max(2000),
  externalCopyInstructions: z.string().trim().min(10).max(2000),
}).strict();
export const retentionPolicyApprovalSchema = z.object({ approvalReference: z.string().trim().min(5).max(1000) }).strict();
export const retentionRequestSchema = retentionTargetSchema.extend({
  previewHash: z.string().regex(/^[0-9a-f]{64}$/), reason: z.string().trim().min(5).max(1000),
}).strict();
export const retentionDecisionSchema = z.object({
  version: z.number().int().positive(), approved: z.boolean(), reason: z.string().trim().min(5).max(1000),
}).strict();
export const retentionExecuteSchema = z.object({ version: z.number().int().positive(), confirmation: z.string().uuid() }).strict();
export const retentionHoldSchema = retentionTargetSchema.extend({ reason: z.string().trim().min(5).max(1000) }).strict();
export const retentionReleaseSchema = z.object({ reason: z.string().trim().min(5).max(1000) }).strict();
export const retentionFollowupSchema = z.object({ version: z.number().int().positive(), reference: z.string().trim().min(5).max(1000) }).strict();
export type RetentionPolicy = {
  id: string; scope: RetentionScope; version: number; days: number; status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  basis: string; backupInstructions: string; externalCopyInstructions: string;
  approvalReference: string | null; approvedAt: string | null; approvedBy: { id: string; name: string } | null; createdAt: string;
};
export type RetentionPreview = {
  scope: RetentionScope; subjectId: string; label: string; anchorAt: string; eligibleAt: string | null;
  policy: RetentionPolicy | null; blockers: string[]; previewHash: string;
  impact: { files: number; privateBytes: number; records: number; operation: string; retained: string[] };
};
export type RetentionHold = {
  id: string; scope: RetentionScope; subjectId: string; reason: string; createdAt: string;
  createdBy: { id: string; name: string }; releasedAt: string | null; releaseReason: string | null;
};
export type RetentionRequest = {
  id: string; scope: RetentionScope; subjectId: string; policy: RetentionPolicy; reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FILES_PENDING' | 'COMPLETED'; version: number;
  createdAt: string; requestedBy: { id: string; name: string }; decidedBy: { id: string; name: string } | null;
  decisionReason: string | null; decidedAt: string | null; completedAt: string | null;
  followupBy: { id: string; name: string } | null; followupAt: string | null; followupReference: string | null;
  files: { id: string; status: 'PENDING' | 'RUNNING' | 'FAILED' | 'DELETED'; attempts: number; error: string | null }[];
};
