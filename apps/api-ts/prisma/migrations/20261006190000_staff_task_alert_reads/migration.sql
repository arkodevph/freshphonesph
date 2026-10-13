CREATE TYPE "TaskAlertKind" AS ENUM ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE');
CREATE TABLE "TaskAlertRead" (
    "userId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "kind" "TaskAlertKind" NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAlertRead_pkey" PRIMARY KEY ("userId", "taskId", "kind")
);
CREATE INDEX "TaskAlertRead_taskId_idx" ON "TaskAlertRead"("taskId");
ALTER TABLE "TaskAlertRead" ADD CONSTRAINT "TaskAlertRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAlertRead" ADD CONSTRAINT "TaskAlertRead_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
