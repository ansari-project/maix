-- AlterEnum
BEGIN;

-- First, update any existing todos with OPEN status to NOT_STARTED, and DONE to COMPLETED
UPDATE "public"."todos" SET "status" = 'NOT_STARTED' WHERE "status" = 'OPEN';
UPDATE "public"."todos" SET "status" = 'COMPLETED' WHERE "status" = 'DONE';

CREATE TYPE "public"."TodoStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR', 'COMPLETED');
ALTER TABLE "public"."todos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."todos" ALTER COLUMN "status" TYPE "public"."TodoStatus_new" USING ("status"::text::"public"."TodoStatus_new");
ALTER TYPE "public"."TodoStatus" RENAME TO "TodoStatus_old";
ALTER TYPE "public"."TodoStatus_new" RENAME TO "TodoStatus";
DROP TYPE "public"."TodoStatus_old";
ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterTable
ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

