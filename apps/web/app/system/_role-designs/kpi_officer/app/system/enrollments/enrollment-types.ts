export type Enrollment = {
  id: string;
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
