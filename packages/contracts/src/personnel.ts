import { z } from "zod";

// Executive, technical, legacy and customer roles use their existing account flows.
export const personnelRoles = [
  "BATCH_MANAGER",
  "HR_PAYROLL",
  "FINANCE_OFFICER",
  "RECORDS",
  "KPI_OFFICER",
  "OPERATIONS_COORDINATOR",
  "CSR",
  "PIONEER_AGENT",
  "AGENT",
  "BATCH_HANDLER",
] as const;

export const personnelStatuses = ["PENDING", "ENROLLED", "REJECTED"] as const;

export const personnelSubmissionSchema = z
  .object({
    submissionId: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => {
        return value.toLowerCase();
      }),
    role: z.enum(personnelRoles),
    supervisorId: z.string().uuid(),
    orientationCompletedAt: z.string().datetime({ offset: true }),
    trainingCompletedAt: z.string().datetime({ offset: true }),
    confirmedBy: z.string().trim().min(2).max(100),
    evidenceNote: z.string().trim().min(3).max(500),
  })
  .strict();

export const personnelListSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    q: z.string().trim().max(100).default(""),
    status: z.enum(personnelStatuses).optional(),
  })
  .strict();

export const personnelRejectionSchema = z
  .object({
    version: z.number().int().positive(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export type PersonnelSubmission = z.infer<typeof personnelSubmissionSchema>;

export type PersonnelListQuery = z.infer<typeof personnelListSchema>;

export type PersonnelStatus = (typeof personnelStatuses)[number];

export type PersonnelOnboarding = Omit<PersonnelSubmission, "submissionId"> & {
  id: string;
  status: PersonnelStatus;
  version: number;
  submittedBy: { id: string; name: string };
  supervisor: { id: string; name: string };
  decidedBy: { id: string; name: string } | null;
  account: { id: string; name: string; role: string; active: boolean } | null;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type PersonnelPage = {
  items: PersonnelOnboarding[];
  total: number;
  page: number;
  pageSize: number;
};

export type PersonnelOptions = {
  roles: (typeof personnelRoles)[number][];
  superiorRoles: Record<(typeof personnelRoles)[number], string[]>;
  supervisors: { id: string; name: string; role: string }[];
  profiles: { id: string; name: string; code: string }[];
};

export type PersonnelHistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  actor: { id: string; name: string };
  after: PersonnelOnboarding;
};
