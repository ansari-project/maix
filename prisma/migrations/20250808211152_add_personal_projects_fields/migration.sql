-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TodoStatus" ADD VALUE 'NOT_STARTED';
ALTER TYPE "public"."TodoStatus" ADD VALUE 'WAITING_FOR';
ALTER TYPE "public"."TodoStatus" ADD VALUE 'DONE';

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personalCategory" TEXT,
ALTER COLUMN "goal" DROP NOT NULL,
ALTER COLUMN "contactEmail" DROP NOT NULL,
ALTER COLUMN "helpType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."todos" ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "projects_isPersonal_ownerId_idx" ON "public"."projects"("isPersonal", "ownerId");

