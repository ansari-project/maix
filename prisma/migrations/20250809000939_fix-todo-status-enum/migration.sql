-- Fix TodoStatus enum to match schema
BEGIN;

-- First, update any remaining old status values
UPDATE "public"."todos" SET "status" = 'COMPLETED' WHERE "status" = 'OPEN';

-- Create the correct enum type
CREATE TYPE "public"."TodoStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR', 'COMPLETED');

-- Update the column to use the new enum
ALTER TABLE "public"."todos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."todos" ALTER COLUMN "status" TYPE "public"."TodoStatus_new" USING (
  CASE 
    WHEN "status"::text = 'OPEN' THEN 'NOT_STARTED'::TodoStatus_new
    WHEN "status"::text = 'IN_PROGRESS' THEN 'IN_PROGRESS'::TodoStatus_new
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::TodoStatus_new
    ELSE 'NOT_STARTED'::TodoStatus_new
  END
);

-- Replace the old enum
ALTER TYPE "public"."TodoStatus" RENAME TO "TodoStatus_old";
ALTER TYPE "public"."TodoStatus_new" RENAME TO "TodoStatus";
DROP TYPE "public"."TodoStatus_old";

-- Set the default
ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

COMMIT;