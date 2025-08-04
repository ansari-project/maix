-- AlterEnum
-- Add DRAFT value to Visibility enum
ALTER TYPE "Visibility" ADD VALUE 'DRAFT';

-- CreateEnum
CREATE TYPE "UnifiedRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- AlterTable
-- Add invitationId to organization_members
ALTER TABLE "organization_members" ADD COLUMN "invitationId" TEXT;

-- CreateTable
CREATE TABLE "product_members" (
    "id" TEXT NOT NULL,
    "role" "UnifiedRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitationId" TEXT,

    CONSTRAINT "product_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "role" "UnifiedRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitationId" TEXT,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_members_productId_userId_key" ON "product_members"("productId", "userId");
CREATE INDEX "product_members_userId_idx" ON "product_members"("userId");
CREATE INDEX "product_members_role_idx" ON "product_members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");
CREATE INDEX "project_members_role_idx" ON "project_members"("role");

-- CreateIndex
CREATE INDEX "organization_members_role_idx" ON "organization_members"("role");

-- AddForeignKey
ALTER TABLE "product_members" ADD CONSTRAINT "product_members_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_members" ADD CONSTRAINT "product_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data
-- 1. Migrate product owners to product_members
INSERT INTO "product_members" ("id", "productId", "userId", "role", "joinedAt")
SELECT gen_random_uuid(), "id", "ownerId", 'ADMIN'::"UnifiedRole", "createdAt"
FROM "products"
WHERE "ownerId" IS NOT NULL;

-- 2. Migrate project owners to project_members
INSERT INTO "project_members" ("id", "projectId", "userId", "role", "joinedAt")
SELECT gen_random_uuid(), "id", "ownerId", 'ADMIN'::"UnifiedRole", "createdAt"
FROM "projects"
WHERE "ownerId" IS NOT NULL;

-- 3. Grant organization members VIEWER access to all products in their organizations
INSERT INTO "product_members" ("id", "productId", "userId", "role", "joinedAt")
SELECT DISTINCT gen_random_uuid(), p."id", om."userId", 'VIEWER'::"UnifiedRole", CURRENT_TIMESTAMP
FROM "organization_members" om
JOIN "products" p ON p."organizationId" = om."organizationId"
WHERE NOT EXISTS (
    SELECT 1 FROM "product_members" pm 
    WHERE pm."productId" = p."id" AND pm."userId" = om."userId"
);

-- 4. Grant organization members VIEWER access to all projects in their organizations
INSERT INTO "project_members" ("id", "projectId", "userId", "role", "joinedAt")
SELECT DISTINCT gen_random_uuid(), pr."id", om."userId", 'VIEWER'::"UnifiedRole", CURRENT_TIMESTAMP
FROM "organization_members" om
JOIN "projects" pr ON pr."organizationId" = om."organizationId"
WHERE NOT EXISTS (
    SELECT 1 FROM "project_members" pm 
    WHERE pm."projectId" = pr."id" AND pm."userId" = om."userId"
);

-- Note: We're keeping the ownerId columns for now and will remove them in a future migration
-- after verifying the membership tables are working correctly