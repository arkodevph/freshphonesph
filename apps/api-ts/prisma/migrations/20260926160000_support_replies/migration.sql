CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_caseId_createdAt_id_idx" ON "SupportMessage"("caseId", "createdAt", "id");

ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "targetPath" VARCHAR(300);

CREATE TABLE "ReleaseUpdate" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "status" "ReleaseStatus" NOT NULL,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "collectionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReleaseUpdate_clientId_createdAt_id_idx" ON "ReleaseUpdate"("clientId", "createdAt", "id");

ALTER TABLE "ReleaseUpdate" ADD CONSTRAINT "ReleaseUpdate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReleaseUpdate" ADD CONSTRAINT "ReleaseUpdate_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
