CREATE TYPE "CatalogAvailability" AS ENUM ('CONTACT_US', 'AVAILABLE', 'LIMITED', 'SOLD_OUT', 'COMING_SOON');
CREATE TYPE "CatalogCondition" AS ENUM ('PRE_OWNED', 'BRAND_NEW');
CREATE TABLE "CatalogItem" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "condition" "CatalogCondition" NOT NULL,
  "dailyAmount" DECIMAL(12,2),
  "availability" "CatalogAvailability" NOT NULL DEFAULT 'CONTACT_US',
  "description" VARCHAR(240) NOT NULL DEFAULT '',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "imageAsset" VARCHAR(40),
  "imageFileId" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogItem_price_positive" CHECK ("dailyAmount" IS NULL OR "dailyAmount" > 0),
  CONSTRAINT "CatalogItem_order_bounds" CHECK ("sortOrder" BETWEEN 0 AND 9999),
  CONSTRAINT "CatalogItem_version_positive" CHECK ("version" > 0),
  CONSTRAINT "CatalogItem_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CatalogItem_code_key" ON "CatalogItem"("code");
CREATE UNIQUE INDEX "CatalogItem_imageFileId_key" ON "CatalogItem"("imageFileId");
CREATE INDEX "CatalogItem_published_sortOrder_id_idx" ON "CatalogItem"("published", "sortOrder", "id");

-- Preserve existing public content without inventing stock availability.
INSERT INTO "CatalogItem" ("id", "code", "name", "condition", "dailyAmount", "published", "sortOrder", "imageAsset", "updatedAt") VALUES
('ca7a1000-0000-4000-8000-000000000001', 'IPHONE-11-PRE', 'iPhone 11', 'PRE_OWNED', 59, true, 10, 'iphone-11', CURRENT_TIMESTAMP),
('ca7a1000-0000-4000-8000-000000000002', 'IPHONE-12-PRE', 'iPhone 12', 'PRE_OWNED', 69, true, 20, 'iphone-12', CURRENT_TIMESTAMP),
('ca7a1000-0000-4000-8000-000000000003', 'IPHONE-13-PRE', 'iPhone 13', 'PRE_OWNED', 89, true, 30, 'iphone-13', CURRENT_TIMESTAMP),
('ca7a1000-0000-4000-8000-000000000004', 'IPAD-10-PRE', 'iPad 10th Gen', 'PRE_OWNED', 89, true, 40, 'ipad-10th-gen', CURRENT_TIMESTAMP),
('ca7a1000-0000-4000-8000-000000000005', 'IPAD-A16-NEW', 'iPad A16', 'BRAND_NEW', 95, true, 50, 'ipad-a16', CURRENT_TIMESTAMP),
('ca7a1000-0000-4000-8000-000000000006', 'IPHONE-13-PRO-PRE', 'iPhone 13 Pro', 'PRE_OWNED', 105, true, 60, 'iphone-13-pro', CURRENT_TIMESTAMP);
