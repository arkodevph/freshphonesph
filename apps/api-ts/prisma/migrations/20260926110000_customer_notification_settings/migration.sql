CREATE TABLE "CustomerEmailTemplate" (
    "kind" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerEmailTemplate_pkey" PRIMARY KEY ("kind")
);
CREATE TABLE "CustomerNotificationConfig" (
    "key" VARCHAR(40) NOT NULL,
    "reminderDays" VARCHAR(100) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerNotificationConfig_pkey" PRIMARY KEY ("key")
);
