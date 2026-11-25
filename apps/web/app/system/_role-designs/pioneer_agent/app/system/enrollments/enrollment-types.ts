export type Enrollment = {
  id: string;
  kind?: "REPLACEMENT" | "NEW_MEMBER";
  createdAt?: string;
  reviewedAt?: string | null;
  name: string;
  batchCode: string;
  status: string;
  reason: string;
  version: number;
  submittedBy: string;
  reviewedBy: string | null;
  withdrawalId?: string | null;
  replacementMode?: "CONTINUE_UNPAID" | "RESTART" | null;
  publicApplicationId?: string | null;
};

export type EnrollmentPage = {
  items: Enrollment[];
  total: number;
  page: number;
  pageSize: number;
};
