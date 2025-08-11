-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "public"."FollowableType" AS ENUM ('ORGANIZATION', 'PROJECT', 'PRODUCT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."following" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followableId" TEXT NOT NULL,
    "followableType" "public"."FollowableType" NOT NULL,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "following_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "following_followableId_followableType_idx" ON "public"."following"("followableId", "followableType");

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "following_userId_followableType_idx" ON "public"."following"("userId", "followableType");

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "following_followedAt_idx" ON "public"."following"("followedAt");

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "following_userId_followableId_followableType_key" ON "public"."following"("userId", "followableId", "followableType");

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "public"."following" ADD CONSTRAINT "following_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;