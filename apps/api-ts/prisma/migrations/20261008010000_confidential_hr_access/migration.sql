ALTER TABLE "User" ADD COLUMN "hrConfidentialAccess" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD CONSTRAINT "User_confidential_hr_eligible"
CHECK (NOT "hrConfidentialAccess" OR (role IN ('COO', 'HR_PAYROLL') AND active));
