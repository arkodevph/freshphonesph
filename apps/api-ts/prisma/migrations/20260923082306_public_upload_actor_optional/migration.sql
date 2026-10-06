-- DropForeignKey
ALTER TABLE "StoredFile" DROP CONSTRAINT "StoredFile_uploadedById_fkey";

-- AlterTable
ALTER TABLE "StoredFile" ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
