-- CreateEnum
CREATE TYPE "public"."FollowableType" AS ENUM ('ORGANIZATION', 'PROJECT', 'PRODUCT');

-- AlterTable
ALTER TABLE "public"."organization_members" ADD COLUMN     "unifiedRole" "public"."UnifiedRole";

-- CreateTable
CREATE TABLE "public"."following" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followableId" TEXT NOT NULL,
    "followableType" "public"."FollowableType" NOT NULL,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "following_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "following_followableId_followableType_idx" ON "public"."following"("followableId", "followableType");

-- CreateIndex
CREATE INDEX "following_userId_followableType_idx" ON "public"."following"("userId", "followableType");

-- CreateIndex
CREATE INDEX "following_followedAt_idx" ON "public"."following"("followedAt");

-- CreateIndex
CREATE UNIQUE INDEX "following_userId_followableId_followableType_key" ON "public"."following"("userId", "followableId", "followableType");

-- AddForeignKey
ALTER TABLE "public"."following" ADD CONSTRAINT "following_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

