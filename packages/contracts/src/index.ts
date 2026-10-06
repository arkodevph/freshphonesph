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
  'ACCOUNT_MANAGE',
  'AUDIT_READ',
  'PAYMENT_READ',
  'PAYMENT_RECORD',
  'PAYMENT_VERIFY',
  'REPORT_VIEW',
  'DOCUMENT_READ',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_REVIEW',
  'REQUIREMENT_MANAGE',
  'TASK_READ',
  'TASK_ASSIGN',
  'TASK_SUBMIT',
  'KPI_REVIEW',
  'SUPPORT_READ',
  'SUPPORT_CREATE',
  'SUPPORT_MANAGE',
  'RECRUITMENT_MANAGE',
  'AGENT_MANAGE',
  'NOTIFICATION_READ',
  'NOTIFICATION_MANAGE',
] as const;
export type Permission = (typeof permissions)[number];
const records: Permission[] = ['BATCH_READ', 'BATCH_MANAGE', 'CLIENT_READ', 'CLIENT_MANAGE'];
const ownWork: Permission[] = ['TASK_READ', 'TASK_SUBMIT', 'NOTIFICATION_READ'];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  COO: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'DOCUMENT_READ', 'DOCUMENT_REVIEW', 'REQUIREMENT_MANAGE', 'TASK_READ', 'TASK_ASSIGN', 'TASK_SUBMIT', 'SUPPORT_READ', 'SUPPORT_CREATE', 'SUPPORT_MANAGE', 'RECRUITMENT_MANAGE', 'AGENT_MANAGE', 'NOTIFICATION_READ', 'NOTIFICATION_MANAGE'],
  GENERAL_MANAGER: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'DOCUMENT_READ', 'TASK_READ', 'TASK_ASSIGN', 'TASK_SUBMIT', 'NOTIFICATION_READ'],
  RECORDS: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_REVIEW', 'REQUIREMENT_MANAGE', 'AGENT_MANAGE', ...ownWork],
  FINANCE_OFFICER: ['BATCH_READ', 'CLIENT_READ', 'PAYMENT_READ', 'PAYMENT_RECORD', 'PAYMENT_VERIFY', 'REPORT_VIEW', ...ownWork],
  HR_PAYROLL: ['REPORT_VIEW', 'TASK_READ', 'TASK_ASSIGN', 'TASK_SUBMIT', 'KPI_REVIEW', 'RECRUITMENT_MANAGE', 'NOTIFICATION_READ'],
  ANALYTICS: ['REPORT_VIEW', ...ownWork],
  CS_HEAD: ['REPORT_VIEW', 'SUPPORT_READ', 'SUPPORT_CREATE', 'SUPPORT_MANAGE', ...ownWork],
  CS_TEAM: ['SUPPORT_READ', 'SUPPORT_CREATE', 'SUPPORT_MANAGE', ...ownWork],
  CORE_HANDLER: ownWork,
  CUSTOMER: ['PAYMENT_READ', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'SUPPORT_READ', 'SUPPORT_CREATE', 'NOTIFICATION_READ'],
};
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
    version: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.active !== undefined || value.role !== undefined, {
    message: 'Choose an account detail to update.',
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
});
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
export const paymentListQuerySchema = listQuerySchema.extend({
  clientId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const reportQuerySchema = z.object({
  q: z.string().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  batchId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const reportExportQuerySchema = z.object({
  kind: z.enum(['payments', 'tasks', 'support']),
  format: z.enum(['csv', 'xlsx']),
  q: z.string().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  batchId: z.string().uuid().optional(),
  status: paymentStatusSchema.optional(),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  path: ['dateTo'], message: 'End date must be on or after the start date.',
});
export const requirementStatuses = ['MISSING', 'SUBMITTED', 'APPROVED', 'NEEDS_CLARIFICATION'] as const;
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
export const agentSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  agentCode: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(40).default(''),
  active: z.boolean().default(true),
}).strict();
export const agentUpdateSchema = z.object({
  version: z.number().int().positive(),
  record: agentSchema,
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
  kind: z.enum(['PAYMENTS', 'TASKS', 'SUPPORT']),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
}).strict().refine((value) => value.periodEnd >= value.periodStart, {
  path: ['periodEnd'], message: 'End date must be on or after the start date.',
});
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
}
export interface Batch extends Omit<BatchInput, 'contractPrice' | 'installmentCount' | 'cadence'> {
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
}
export interface ClientSchedule {
  clientId: string;
  totalDue: string;
  items: ScheduleItem[];
}
export interface Payment extends Omit<PaymentInput, 'scheduleItemId' | 'referenceNumber' | 'notes'> {
  id: string;
  batchId: string;
  scheduleItemId: string | null;
  referenceNumber: string | null;
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
  confidence: number;
  warnings: string[];
}
export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  clientId: string | null;
  version: number;
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
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
