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
] as const;
export type Permission = (typeof permissions)[number];
const records: Permission[] = ['BATCH_READ', 'BATCH_MANAGE', 'CLIENT_READ', 'CLIENT_MANAGE'];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  COO: records,
  GENERAL_MANAGER: records,
  RECORDS: records,
  FINANCE_OFFICER: ['BATCH_READ', 'CLIENT_READ'],
  HR_PAYROLL: [],
  ANALYTICS: [],
  CS_HEAD: [],
  CS_TEAM: [],
  CORE_HANDLER: [],
  CUSTOMER: [],
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
  .object({ active: z.boolean(), version: z.number().int().positive() })
  .strict();
export const batchStatuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
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
  })
  .strict()
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date.',
  });
export const batchUpdateSchema = z
  .object({ version: z.number().int().positive(), record: batchSchema })
  .strict();
export const clientStatuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
export const releaseStatuses = ['NOT_READY', 'PROCESSING', 'READY', 'RELEASED'] as const;
export const clientSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{7,25}$/, 'Enter a valid contact number.'),
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
});
export type BatchInput = z.infer<typeof batchSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  clientId: string | null;
}
export interface Batch extends BatchInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  _count: { clients: number };
}
export interface Client extends ClientInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  batch: Pick<Batch, 'id' | 'code' | 'model' | 'startDate' | 'endDate'>;
  account: { id: string } | null;
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
  entity: 'batch' | 'client' | 'account';
  recordId: string;
}
