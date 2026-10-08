import { z } from 'zod';

export const roles = [
  'OWNER',
  'COO',
  'GENERAL_MANAGER',
  'HR_PAYROLL',
  'FINANCE_OFFICER',
  'RECORDS',
  'ANALYTICS',
  'CS_HEAD',
  'CS_TEAM',
  'CORE_HANDLER',
  'CUSTOMER',
] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;
export const roleLabels: Record<Role, string> = {
  OWNER: 'Owner',
  COO: 'Chief operating officer',
  GENERAL_MANAGER: 'General manager',
  HR_PAYROLL: 'HR / Payroll',
  FINANCE_OFFICER: 'Finance officer',
  RECORDS: 'Records & monitoring',
  ANALYTICS: 'Analytics',
  CS_HEAD: 'Customer service head',
  CS_TEAM: 'Customer service',
  CORE_HANDLER: 'Handler',
  CUSTOMER: 'Customer',
};
export const permissions = [
  'BATCH_READ',
  'BATCH_MANAGE',
  'CLIENT_READ',
  'CLIENT_MANAGE',
  'AGENT_MANAGE',
  'ACCOUNT_MANAGE',
  'AUDIT_READ',
  'PAYMENT_READ',
  'PAYMENT_RECORD',
  'PAYMENT_VERIFY',
  'SUPPORT_MANAGE',
  'REPORT_VIEW',
  'TASK_ASSIGN',
  'KPI_REVIEW',
  'HR_CONFIDENTIAL',
  'DOCUMENT_READ',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_REVIEW',
  'REQUIREMENT_MANAGE',
  'TASK_READ',
  'TASK_SUBMIT',
  'SUPPORT_READ',
  'SUPPORT_CREATE',
  'RECRUITMENT_MANAGE',
  'NOTIFICATION_READ',
  'NOTIFICATION_MANAGE',
] as const;
export type Permission = (typeof permissions)[number];
const records: Permission[] = ['BATCH_READ', 'BATCH_MANAGE', 'CLIENT_READ', 'CLIENT_MANAGE', 'AGENT_MANAGE'];
const ownWork: Permission[] = ['TASK_READ', 'TASK_SUBMIT', 'NOTIFICATION_READ'];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  COO: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'TASK_ASSIGN', 'DOCUMENT_READ', 'DOCUMENT_REVIEW', 'REQUIREMENT_MANAGE', 'SUPPORT_READ', 'SUPPORT_CREATE', 'RECRUITMENT_MANAGE', 'NOTIFICATION_MANAGE', ...ownWork],
  GENERAL_MANAGER: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'TASK_ASSIGN', 'DOCUMENT_READ', ...ownWork],
  RECORDS: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_REVIEW', 'REQUIREMENT_MANAGE', ...ownWork],
  FINANCE_OFFICER: ['BATCH_READ', 'CLIENT_READ', 'PAYMENT_READ', 'PAYMENT_RECORD', 'PAYMENT_VERIFY', 'REPORT_VIEW', ...ownWork],
  HR_PAYROLL: ['REPORT_VIEW', 'TASK_ASSIGN', 'KPI_REVIEW', 'RECRUITMENT_MANAGE', ...ownWork],
  ANALYTICS: ['REPORT_VIEW', ...ownWork],
  CS_HEAD: ['REPORT_VIEW', 'SUPPORT_MANAGE', 'SUPPORT_READ', 'SUPPORT_CREATE', ...ownWork],
  CS_TEAM: ['SUPPORT_MANAGE', 'SUPPORT_READ', 'SUPPORT_CREATE', ...ownWork],
  CORE_HANDLER: ['BATCH_READ', 'CLIENT_READ', ...ownWork],
  CUSTOMER: ['PAYMENT_READ', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'SUPPORT_READ', 'SUPPORT_CREATE', 'NOTIFICATION_READ'],
};
export const confidentialHrRoles = ['COO', 'HR_PAYROLL'] as const;
export const eligibleForConfidentialHr = (role: Role) =>
  confidentialHrRoles.some((eligible) => eligible === role);
export function effectivePermissions(user: { role: Role; hrConfidentialAccess?: boolean }): Permission[] {
  if (user.role === 'OWNER') return [...rolePermissions.OWNER];
  const result: Permission[] = rolePermissions[user.role].filter((permission) => permission !== 'KPI_REVIEW');
  if (eligibleForConfidentialHr(user.role) && user.hrConfidentialAccess === true)
    result.push('HR_CONFIDENTIAL', 'KPI_REVIEW');
  return result;
}
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128);
export const loginSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const accountSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    role: roleSchema,
    password: passwordSchema,
    clientId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if ((data.role === 'CUSTOMER') !== Boolean(data.clientId))
      ctx.addIssue({
        code: 'custom',
        path: ['clientId'],
        message: 'Customer accounts require a client; employees cannot link to one.',
      });
  });
export const accountUpdateSchema = z
  .object({
    active: z.boolean().optional(),
    role: roleSchema.optional(),
    hrConfidentialAccess: z.boolean().optional(),
    hrAccessReason: z.string().trim().min(3).max(1000).optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.active !== undefined || value.role !== undefined || value.hrConfidentialAccess !== undefined, {
    message: 'Choose an account detail to update.',
  })
  .superRefine((value, ctx) => {
    if (value.hrConfidentialAccess !== undefined && !value.hrAccessReason)
      ctx.addIssue({ code: 'custom', path: ['hrAccessReason'], message: 'Give a reason for the confidential HR access decision.' });
    if (value.hrAccessReason !== undefined && value.hrConfidentialAccess === undefined)
      ctx.addIssue({ code: 'custom', path: ['hrConfidentialAccess'], message: 'Choose the confidential HR access decision.' });
  });
export const batchStatuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export const cadenceSchema = z.enum(['WEEKLY', 'SEMIMONTHLY', 'MONTHLY']);
export type Cadence = z.infer<typeof cadenceSchema>;
export const moneySchema = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, 'Use a positive amount with at most two decimal places.')
  .refine((value) => Number(value) > 0, 'Amount must be positive.');
export const batchSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens.')
      .transform((v) => v.toUpperCase()),
    model: z.string().trim().min(2).max(100),
    status: z.enum(batchStatuses),
    startDate: z.string().date(),
    endDate: z.string().date(),
    contractPrice: moneySchema.optional(),
    installmentCount: z.number().int().min(1).max(600).optional(),
    cadence: cadenceSchema.optional(),
  })
  .strict()
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date.',
  })
  .superRefine((value, ctx) => {
    const terms = [value.contractPrice, value.installmentCount, value.cadence];
    if (terms.some((term) => term !== undefined) && terms.some((term) => term === undefined))
      ctx.addIssue({ code: 'custom', path: ['contractPrice'], message: 'Provide price, installment count and cadence together.' });
    if (value.contractPrice && value.installmentCount && Math.round(Number(value.contractPrice) * 100) < value.installmentCount)
      ctx.addIssue({ code: 'custom', path: ['installmentCount'], message: 'Each installment must be at least one centavo.' });
  });
export const batchUpdateSchema = z
  .object({ version: z.number().int().positive(), record: batchSchema })
  .strict();
export const clientStatuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
export const releaseStatuses = ['NOT_READY', 'PROCESSING', 'READY', 'RELEASED'] as const;
export const clientSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.union([z.string().email(), z.literal('')]).transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^$|^[+0-9 ()-]{7,25}$/, 'Enter a valid contact number.').default(''),
    joinedAt: z.string().date().optional(),
    unitModel: z.string().trim().max(100).optional(),
    batchId: z.string().uuid(),
    status: z.enum(clientStatuses),
    releaseStatus: z.enum(releaseStatuses),
  })
  .strict();
export const clientUpdateSchema = z
  .object({ version: z.number().int().positive(), record: clientSchema })
  .strict();
export const listQuerySchema = z.object({
  q: z.string().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.string().max(30).optional(),
  batchId: z.string().uuid().optional(),
  handlerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});
export const batchAssignmentSchema = z.object({
  version: z.number().int().positive(),
  handlerId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
}).strict();
export const agentSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens.').transform((v) => v.toUpperCase()),
  active: z.boolean(),
}).strict();
export const agentUpdateSchema = z.object({ version: z.number().int().positive(), record: agentSchema }).strict();
export const agentListQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict();
export type BatchAssignmentInput = z.infer<typeof batchAssignmentSchema>;
export type AgentInput = z.infer<typeof agentSchema>;
export interface Agent extends AgentInput { id: string; version: number; createdAt: string; updatedAt: string }
export interface AssignmentOptions {
  handlers: { id: string; name: string; active: boolean }[];
  agents: { id: string; name: string; active: boolean }[];
}
const recordFilterFields = {
  q: z.string().trim().max(100).default(''),
  model: z.string().trim().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
};
const orderedRecordDates = (value: { dateFrom?: string; dateTo?: string }) =>
  !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom;
const recordDateError = { path: ['dateTo'], message: 'End date must be on or after the start date.' };
export const batchListQuerySchema = listQuerySchema.omit({ batchId: true }).extend({
  ...recordFilterFields, status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
}).strict().refine(orderedRecordDates, recordDateError);
export const clientListQuerySchema = listQuerySchema.extend({
  ...recordFilterFields, id: z.string().uuid().optional(), status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
}).strict().refine(orderedRecordDates, recordDateError);
export const accountListQuerySchema = z.object({
  q: z.string().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  role: roleSchema.optional(),
});
export const paymentStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_CLARIFICATION'] as const;
export const receiptTypes = ['gcash', 'maya', 'bank', 'cash'] as const;
export const receiptTypeSchema = z.enum(receiptTypes);
export type ReceiptType = z.infer<typeof receiptTypeSchema>;
export const paymentStatusSchema = z.enum(paymentStatuses);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export const paymentSchema = z.object({
  clientId: z.string().uuid(),
  scheduleItemId: z.string().uuid().nullable().optional(),
  amount: moneySchema,
  paymentDate: z.string().date(),
  method: z.string().trim().min(2).max(40),
  referenceNumber: z.string().trim().max(120).nullable().optional(),
  receiptTime: z.string().trim().regex(/^(?:(?:[1-9]|1[0-2]):[0-5]\d\s+[AP]M|(?:[01]?\d|2[0-3]):[0-5]\d)$/i).nullable().optional(),
  receiptName: z.string().trim().max(120).nullable().optional(),
  receiptPhone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict();
export const paymentDecisionSchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_CLARIFICATION']),
  notes: z.string().trim().min(2).max(1000),
  version: z.number().int().positive(),
}).strict();
export const paymentCorrectionSchema = z.object({
  record: paymentSchema,
  version: z.number().int().positive(),
}).strict();
export const paymentAdjustmentSchema = z.object({
  correctedAmount: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, 'Use a non-negative amount with at most two decimal places.'),
  reason: z.string().trim().min(10).max(1000),
  expectedRevision: z.number().int().min(0).max(2147483646),
  paymentVersion: z.number().int().positive(),
  requestId: z.string().uuid(),
}).strict();
export type PaymentAdjustmentInput = z.infer<typeof paymentAdjustmentSchema>;
export interface PaymentAdjustment {
  id: string; sequence: number; amount: string; beforeAmount: string; afterAmount: string; createdAt: string;
  reason?: string; actor?: { id: string; name: string };
}
export const paymentListQuerySchema = listQuerySchema.extend({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const paymentDuplicateQuerySchema = z.object({
  method: z.string().trim().min(2).max(40),
  referenceNumber: z.string().trim().min(1).max(120),
  excludeId: z.string().uuid().optional(),
}).strict();
export const reportQuerySchema = z.object({
  q: z.string().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  batchId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const operationsReportQuerySchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const collectionReportQuerySchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  batchId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const reconciliationReportQuerySchema = collectionReportQuerySchema;
export const reconciliationFlags = ['DUPLICATE_REFERENCE', 'SCHEDULE_CLIENT_MISMATCH', 'BATCH_MEMBERSHIP_MISMATCH',
  'VERIFIED_WITHOUT_SCHEDULE', 'UNMATCHED_VERIFICATION_AUDIT', 'UNMATCHED_ADJUSTMENT_AUDIT'] as const;
export type ReconciliationFlag = typeof reconciliationFlags[number];
export interface ReconciliationMetrics {
  payments: number; verifiedPayments: number; pendingPayments: number; clarificationPayments: number; rejectedPayments: number;
  auditedVerifiedPayments: number; unmatchedVerifiedPayments: number; paymentsWithFlags: number;
  duplicateReferencePayments: number; scheduleMismatchPayments: number; batchMismatchPayments: number; verifiedWithoutSchedulePayments: number;
  recordedAmount: string; verifiedAmount: string; pendingAmount: string; clarificationAmount: string; rejectedAmount: string;
  auditedVerifiedAmount: string; unmatchedVerifiedAmount: string;
  originalVerifiedAmount?: string; adjustmentAmount?: string; adjustments?: number;
  adjustmentAuditGapPayments?: number; adjustmentAuditGapAmount?: string;
}
export interface ReconciliationGroup extends ReconciliationMetrics { batchId: string; batchCode: string; method: string }
export interface ReconciliationReport extends Page<ReconciliationGroup> { totals: ReconciliationMetrics }
export interface ReconciliationSnapshot {
  totals: ReconciliationMetrics; groups: ReconciliationGroup[];
  basis: 'current_payment_state'; paymentGrouping: 'recorded_payment_batch'; externalStatementMatched: false;
  filters: { batchId?: string; batchCode?: string };
}
export interface ReconciliationException {
  id: string; batchCode: string; currentBatchCode: string; paymentDate: string; method: string;
  amount: string; status: PaymentStatus; flags: ReconciliationFlag[];
}
export interface CollectionMetrics {
  clients: number;
  scheduledClients: number;
  clientsWithoutSchedule: number;
  agreedAmount: string;
  verifiedAmount: string;
  pendingAmount: string;
  remainingBalance: string;
  overpaidAmount: string;
  collectedInPeriod: string;
  verifiedPaymentsInPeriod: number;
  pendingInPeriod: string;
  pendingPaymentsInPeriod: number;
  adjustmentAmount?: string;
  adjustmentsInPeriod?: string;
}
export interface CollectionBatchRow extends CollectionMetrics { id: string; code: string; status: string }
export interface CollectionReport extends Page<CollectionBatchRow> { totals: CollectionMetrics }
export interface CollectionSnapshot {
  totals: CollectionMetrics;
  batches: CollectionBatchRow[];
  balanceBasis: 'current';
  paymentGrouping: 'current_client_batch';
  filters: { batchId?: string; batchCode?: string };
}
export const reportBatchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
export interface ReportBatchOption { id: string; code: string }
export interface PaymentReport {
  total: number;
  verifiedPayments: number;
  verifiedAmount: string;
  pendingVerification: number;
  pendingAmount: string;
  needsClarification: number;
  rejectedPayments: number;
  originalVerifiedAmount?: string;
  adjustmentAmount?: string;
}
export interface TaskReport {
  total: number;
  byStatus: Record<string, number>;
  submitted: number;
  late: number;
  reviewed: number;
  disclaimer: string;
}
export interface SupportReport {
  total: number;
  open: number;
  closed: number;
  categories: { category: string; total: number; closed: number; averageTurnaroundHours: number | null }[];
}
export type BatchInput = z.infer<typeof batchSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  clientId: string | null;
  hrConfidentialAccess?: boolean;
}
export interface Batch extends Omit<BatchInput, 'contractPrice' | 'installmentCount' | 'cadence'> {
  handlerId?: string | null;
  agentId?: string | null;
  handler?: { id: string; name: string; active: boolean; role: Role } | null;
  agent?: { id: string; name: string; active: boolean } | null;
  termsLocked?: boolean;
  contractPrice: string | null;
  installmentCount: number | null;
  cadence: Cadence | null;
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  _count: { clients: number };
}
export interface Client extends Omit<ClientInput, 'joinedAt'> {
  scheduleIssued?: boolean;
  joinedAt: string | null;
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  batch: Pick<Batch, 'id' | 'code' | 'model' | 'startDate' | 'endDate'>;
  account: { id: string } | null;
}
export interface ScheduleItem {
  id: string;
  sequenceNo: number;
  dueDate: string;
  expectedAmount: string;
  paidApplied?: string;
  status?: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UPCOMING';
}
export interface ClientSchedule {
  clientId: string;
  totalDue: string;
  items: ScheduleItem[];
}
export interface Payment extends Omit<PaymentInput, 'scheduleItemId' | 'referenceNumber' | 'receiptTime' | 'receiptName' | 'receiptPhone' | 'notes'> {
  id: string;
  batchId: string;
  scheduleItemId: string | null;
  referenceNumber: string | null;
  receiptTime: string | null;
  receiptName: string | null;
  receiptPhone: string | null;
  notes: string | null;
  verificationNotes: string | null;
  status: PaymentStatus;
  duplicateReference: boolean;
  version: number;
  recordedBy: { id: string; name: string };
  verifier: { id: string; name: string } | null;
  proofFile: { id: string } | null;
  client: { id: string; name: string; batch: { id: string; code: string } };
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  effectiveAmount?: string;
  adjustmentAmount?: string;
  adjustmentRevision?: number;
  adjustments?: PaymentAdjustment[];
}
export interface ClientBalance {
  clientId: string;
  totalDue: string;
  verifiedPaid: string;
  remainingBalance: string;
  overpaid: string;
  pendingAmount: string;
}
export interface ReceiptScan {
  template: ReceiptType;
  method: string;
  amount: string | null;
  referenceNumber: string | null;
  paymentDate: string | null;
  receiptTime: string | null;
  receiptName: string | null;
  receiptPhone: string | null;
  confidence: number;
  warnings: string[];
}
export interface PaymentDuplicateMatch {
  id: string;
  clientId: string;
  clientName: string;
  amount: string;
  paymentDate: string;
  method: string;
  referenceNumber: string;
  status: PaymentStatus;
}
export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  hrConfidentialAccess: boolean;
  clientId: string | null;
  version: number;
  createdAt: string;
}
export interface HrAccessDecision {
  id: string;
  granted: boolean;
  reason: string;
  actorName: string;
  createdAt: string;
}
export interface Audit {
  id: string;
  action: string;
  entity: string;
  recordId: string;
  createdAt: string;
  actor: { name: string };
}
export interface RecordHistoryEntry {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string };
  changes: { field: string; label: string; before: string | null; after: string | null }[];
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export const financeAlertQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  unreadOnly: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
}).strict();
export const financeAlertReadSchema = z.object({ version: z.number().int().positive() }).strict();
export interface FinanceAlert {
  id: string;
  version: number;
  title: string;
  message: string;
  targetPath: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceAlertPage extends Page<FinanceAlert> {
  pendingCount: number;
  unreadCount: number;
}
export const taskAlertKinds = ['TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE'] as const;
export type TaskAlertKind = (typeof taskAlertKinds)[number];
export const paymentResultKinds = ['PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PAYMENT_CLARIFICATION'] as const;
export type PaymentResultKind = (typeof paymentResultKinds)[number];
export const supportAlertKinds = ['SUPPORT_NEW_CASE', 'SUPPORT_ASSIGNED', 'SUPPORT_CUSTOMER_REPLY'] as const;
export type SupportAlertKind = typeof supportAlertKinds[number];
export const accountAlertKinds = ['ACCOUNT_CREATED', 'ACCOUNT_ROLE_CHANGED', 'ACCOUNT_ACTIVATED', 'ACCOUNT_DEACTIVATED'] as const;
export type AccountAlertKind = typeof accountAlertKinds[number];
export const staffAlertScopeSchema = z.enum(['all', 'tasks', 'finance', 'results', 'support', 'accounts']);
export type StaffAlertScope = z.infer<typeof staffAlertScopeSchema>;
export const staffAlertQuerySchema = financeAlertQuerySchema.extend({ scope: staffAlertScopeSchema.default('all') });
export const staffAlertReadSchema = z.discriminatedUnion('entity', [
  z.object({ entity: z.literal('payment'), version: z.number().int().positive() }).strict(),
  z.object({ entity: z.literal('task'), kind: z.enum(taskAlertKinds), deadline: z.string().datetime({ offset: true }) }).strict(),
  z.object({ entity: z.literal('payment-result') }).strict(),
  z.object({ entity: z.literal('support') }).strict(),
  z.object({ entity: z.literal('account') }).strict(),
]);
export type StaffAlertReadInput = z.infer<typeof staffAlertReadSchema>;
export const staffAlertReadAllSchema = z.object({ scope: staffAlertScopeSchema.default('all') }).strict();
type StaffAlertBase = { id: string; title: string; message: string; targetPath: string; readAt: string | null; occurredAt: string };
export type StaffAlert = StaffAlertBase & (
  { entity: 'payment'; kind: 'FINANCE_PENDING'; version: number } |
  { entity: 'task'; kind: TaskAlertKind; deadline: string } |
  { entity: 'payment-result'; kind: PaymentResultKind; paymentId: string; version: number } |
  { entity: 'support'; kind: SupportAlertKind; caseId: string; version: number } |
  { entity: 'account'; kind: AccountAlertKind; accountId: string; version: number }
);
export interface StaffAlertPage extends Page<StaffAlert> {
  activeCount: number;
  unreadCount: number;
  filteredCount: number;
  filteredUnreadCount: number;
  taskCount: number;
  financeCount: number;
  resultCount: number;
  supportCount: number;
  accountCount: number;
}
export interface PaymentResultDetail {
  id: string;
  paymentId: string;
  version: number;
  decision: Exclude<PaymentStatus, 'PENDING'>;
  amount: string;
  clientName: string;
  batchCode: string;
  notes: string;
  verifierName: string;
  occurredAt: string;
  currentStatus: PaymentStatus;
  currentVersion: number;
}
export const staffEmailKinds = [...taskAlertKinds, 'FINANCE_PENDING', ...paymentResultKinds, ...supportAlertKinds, ...accountAlertKinds] as const;
export type StaffEmailKind = typeof staffEmailKinds[number];
export const staffEmailStatuses = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'] as const;
export type StaffEmailStatus = typeof staffEmailStatuses[number];
const knownEmailPlaceholders = (value: string) => !/\{(?!title\}|message\}|url\})[^{}]*\}/.test(value);
export const staffEmailTemplateSchema = z.object({
  version: z.number().int().min(0), enabled: z.boolean(),
  subject: z.string().trim().min(1).max(180).refine((value) => !/[\r\n]/.test(value) && value.includes('{title}') && knownEmailPlaceholders(value), 'Use {title} and a single-line subject with supported placeholders.'),
  body: z.string().trim().min(20).max(2500).refine((value) => value.includes('{message}') && value.includes('{url}') && knownEmailPlaceholders(value), 'Include {message} and {url}; supported placeholders are {title}, {message} and {url}.'),
}).strict();
export const staffEmailTimingSchema = z.object({
  version: z.number().int().min(0), dueSoonHours: z.number().int().min(1).max(168), overdueHours: z.number().int().min(0).max(168),
}).strict();
export const staffEmailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(staffEmailStatuses).optional(), kind: z.enum(staffEmailKinds).optional(),
}).strict();
export const staffEmailRetrySchema = z.object({ version: z.number().int().positive() }).strict();
export interface StaffEmailTemplate { kind: StaffEmailKind; enabled: boolean; subject: string; body: string; version: number }
export interface StaffEmailSettings {
  dueSoonHours: number; overdueHours: number; timingVersion: number; templates: StaffEmailTemplate[];
  deliveryMode: 'local' | 'provider';
}
export interface StaffEmailDelivery {
  id: string; kind: StaffEmailKind; status: StaffEmailStatus; recipient: { name: string; email: string };
  attempts: number; totalAttempts: number; createdAt: string; nextAt: string; sentAt: string | null;
  error: string | null; version: number; canRetry: boolean;
}
export interface Overview {
  activeBatches: number | null;
  clients: number | null;
  readyForRelease: number | null;
  employees: number | null;
}
export interface ChangeEvent {
  entity: 'batch' | 'client' | 'account' | 'payment';
  recordId: string;
}

export const reportExportQuerySchema = z.object({
  kind: z.enum(['payments', 'tasks', 'support', 'collections', 'reconciliation']),
  format: z.enum(['csv', 'xlsx']),
  q: z.string().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  batchId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
}).refine((value) => value.kind === 'payments' || (value.q === undefined && !value.status && (['collections', 'reconciliation'].includes(value.kind) || !value.batchId)), {
  message: 'Batch filters apply to payment, collection and reconciliation reports; search and status apply only to payments.',
});
export const requirementTypeSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  allowedMimeTypes: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])).min(1).max(4),
  maxBytes: z.number().int().min(1024).max(10 * 1024 * 1024),
  customerCanUpload: z.boolean(),
  active: z.boolean(),
}).strict();
export const requirementTypeUpdateSchema = z.object({
  version: z.number().int().positive(),
  record: requirementTypeSchema,
}).strict();
export const requirementReviewSchema = z.object({
  status: z.enum(['APPROVED', 'NEEDS_CLARIFICATION']),
  customerNote: z.string().trim().min(2).max(1000),
  internalNote: z.string().trim().max(1000).default(''),
  version: z.number().int().positive(),
}).strict();
export const taskPriorities = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const taskStatuses = ['TODO', 'IN_PROGRESS', 'SUBMITTED', 'DONE'] as const;
export const taskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  instructions: z.string().trim().max(4000).default(''),
  assigneeId: z.string().uuid(),
  priority: z.enum(taskPriorities).default('MEDIUM'),
  deadline: z.string().datetime({ offset: true }),
}).strict();
export const taskProgressSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS']),
  version: z.number().int().positive(),
}).strict();
export const taskSubmissionSchema = z.object({ version: z.number().int().positive() }).strict();
export const kpiDecisions = ['PENDING', 'NOTED', 'ACTION_RECOMMENDED'] as const;
export const kpiReviewSchema = z.object({
  taskId: z.string().uuid(),
  evaluation: z.string().trim().max(4000).default(''),
  recommendation: z.string().trim().max(200).default(''),
  decision: z.enum(kpiDecisions).default('NOTED'),
}).strict();
export const supportStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'] as const;
export const supportCreateSchema = z.object({
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(4000),
  clientId: z.string().uuid().optional(),
}).strict();
export const supportUpdateSchema = z.object({
  status: z.enum(supportStatuses).optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
  resolution: z.string().trim().max(4000).optional(),
  version: z.number().int().positive(),
}).strict().refine((value) => value.status !== undefined || value.assignedStaffId !== undefined || value.resolution !== undefined, {
  message: 'Choose a support case detail to update.',
});
export const jobOpeningSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).default(''),
  location: z.string().trim().max(120).default(''),
  employmentType: z.string().trim().max(60).default(''),
  isOpen: z.boolean().default(true),
}).strict();
export const jobOpeningUpdateSchema = z.object({
  version: z.number().int().positive(),
  record: jobOpeningSchema,
}).strict();
export const applicantStatuses = ['RECEIVED', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'] as const;
const recruitmentPageFields = {
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
};
export const jobOpeningListQuerySchema = z.object({ ...recruitmentPageFields, status: z.enum(['OPEN', 'CLOSED']).optional() }).strict();
export const applicantListQuerySchema = z.object({ ...recruitmentPageFields, status: z.enum(applicantStatuses).optional(), jobId: z.string().uuid().optional() }).strict();
export interface RecruitmentSummary { jobs: number; openJobs: number; applicants: number; awaitingReview: number }
export const applicantSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(200),
  email: z.string().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).default(''),
  message: z.string().trim().max(4000).default(''),
}).strict();
export const applicantUpdateSchema = z.object({
  status: z.enum(applicantStatuses).optional(),
  reviewerNotes: z.string().trim().max(4000).optional(),
  version: z.number().int().positive(),
}).strict().refine((value) => value.status !== undefined || value.reviewerNotes !== undefined, {
  message: 'Choose an applicant detail to update.',
});
export const recruitmentAgentSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  agentCode: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(40).default(''),
  active: z.boolean().default(true),
}).strict();
export const recruitmentAgentUpdateSchema = z.object({
  version: z.number().int().positive(),
  record: recruitmentAgentSchema,
}).strict();
export const notificationTemplateSchema = z.object({
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9._-]+$/),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(4000),
  emailEnabled: z.boolean(),
  active: z.boolean(),
}).strict();
export const notificationTemplateUpdateSchema = z.object({
  version: z.number().int().positive(),
  record: notificationTemplateSchema,
}).strict();
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  unreadOnly: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
}).strict();
export const reportSnapshotSchema = z.object({
  kind: z.enum(['PAYMENTS', 'TASKS', 'SUPPORT', 'COLLECTIONS', 'RECONCILIATION']),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  batchId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
}).strict().refine((value) => value.periodEnd >= value.periodStart, {
  path: ['periodEnd'], message: 'End date must be on or after the start date.',
}).refine((value) => value.kind === 'PAYMENTS' || (!value.status && (['COLLECTIONS', 'RECONCILIATION'].includes(value.kind) || !value.batchId)), {
  message: 'Batch filters apply to payment, collection and reconciliation reports; status applies only to payments.',
});
export type ReportSnapshotInput = z.infer<typeof reportSnapshotSchema>;
export type ReportKind = 'payments' | 'tasks' | 'support' | 'collections' | 'reconciliation';
export type ReportPaymentFilters = { batchId?: string; batchCode?: string; status?: PaymentStatus };
type ReportSnapshotBase = {
  id: string; periodStart: string; periodEnd: string; createdAt: string;
  createdBy: { id: string; name: string };
};
export type ReportSnapshot = ReportSnapshotBase & (
  | { kind: 'PAYMENTS'; payload: PaymentReport & { filters?: ReportPaymentFilters } }
  | { kind: 'TASKS'; payload: TaskReport }
  | { kind: 'SUPPORT'; payload: SupportReport }
  | { kind: 'COLLECTIONS'; payload: CollectionSnapshot }
  | { kind: 'RECONCILIATION'; payload: ReconciliationSnapshot }
);
export const reportHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  kind: z.enum(['PAYMENTS', 'TASKS', 'SUPPORT', 'COLLECTIONS', 'RECONCILIATION']).optional(),
}).strict();
