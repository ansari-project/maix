-- AlterEnum
BEGIN;

-- Only update if there are existing todos (handles fresh databases)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."todos" LIMIT 1) THEN
    UPDATE "public"."todos" SET "status" = 'NOT_STARTED' WHERE "status" = 'OPEN';
    UPDATE "public"."todos" SET "status" = 'COMPLETED' WHERE "status" = 'DONE';
  END IF;
END $$;

CREATE TYPE "public"."TodoStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR', 'COMPLETED');
ALTER TABLE "public"."todos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."todos" ALTER COLUMN "status" TYPE "public"."TodoStatus_new" USING (
  CASE 
    WHEN "status"::text = 'OPEN' THEN 'NOT_STARTED'::"public"."TodoStatus_new"
    WHEN "status"::text = 'DONE' THEN 'COMPLETED'::"public"."TodoStatus_new"
    WHEN "status"::text = 'IN_PROGRESS' THEN 'IN_PROGRESS'::"public"."TodoStatus_new"
    WHEN "status"::text = 'WAITING_FOR' THEN 'WAITING_FOR'::"public"."TodoStatus_new"
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"public"."TodoStatus_new"
    WHEN "status"::text = 'NOT_STARTED' THEN 'NOT_STARTED'::"public"."TodoStatus_new"
    ELSE 'NOT_STARTED'::"public"."TodoStatus_new"
  END
);
ALTER TYPE "public"."TodoStatus" RENAME TO "TodoStatus_old";
ALTER TYPE "public"."TodoStatus_new" RENAME TO "TodoStatus";
DROP TYPE "public"."TodoStatus_old";
ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterTable
ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

