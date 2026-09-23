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
] as const;
export type Permission = (typeof permissions)[number];
const records: Permission[] = ['BATCH_READ', 'BATCH_MANAGE', 'CLIENT_READ', 'CLIENT_MANAGE'];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  COO: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW'],
  GENERAL_MANAGER: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW'],
  RECORDS: [...records, 'PAYMENT_READ', 'PAYMENT_RECORD', 'REPORT_VIEW'],
  FINANCE_OFFICER: ['BATCH_READ', 'CLIENT_READ', 'PAYMENT_READ', 'PAYMENT_RECORD', 'PAYMENT_VERIFY', 'REPORT_VIEW'],
  HR_PAYROLL: ['REPORT_VIEW'],
  ANALYTICS: ['REPORT_VIEW'],
  CS_HEAD: ['REPORT_VIEW'],
  CS_TEAM: [],
  CORE_HANDLER: [],
  CUSTOMER: ['PAYMENT_READ'],
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
