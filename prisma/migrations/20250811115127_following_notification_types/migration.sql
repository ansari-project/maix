-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'ORGANIZATION_UPDATE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PROJECT_UPDATE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PRODUCT_UPDATE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORGANIZATION_NEW_MEMBER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PROJECT_NEW_MEMBER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PRODUCT_NEW_MEMBER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORGANIZATION_NEW_PROJECT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORGANIZATION_NEW_PRODUCT';

