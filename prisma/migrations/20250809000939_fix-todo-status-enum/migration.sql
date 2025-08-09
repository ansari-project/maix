-- Fix TodoStatus enum to match schema
BEGIN;

-- Check if TodoStatus_new already exists (from previous migration)
-- If it does, this migration has already been applied
DO $$ 
BEGIN
  -- Check if the enum already has the correct values
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'TodoStatus' 
    AND e.enumlabel IN ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR', 'COMPLETED')
  ) THEN
    -- Only apply if needed
    -- Update any remaining old status values
    IF EXISTS (SELECT 1 FROM "public"."todos" WHERE "status"::text = 'OPEN') THEN
      UPDATE "public"."todos" SET "status" = 'COMPLETED' WHERE "status" = 'OPEN';
    END IF;

    -- Create the correct enum type
    CREATE TYPE "public"."TodoStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR', 'COMPLETED');

    -- Update the column to use the new enum
    ALTER TABLE "public"."todos" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "public"."todos" ALTER COLUMN "status" TYPE "public"."TodoStatus_new" USING (
      CASE 
        WHEN "status"::text = 'OPEN' THEN 'NOT_STARTED'::"public"."TodoStatus_new"
        WHEN "status"::text = 'IN_PROGRESS' THEN 'IN_PROGRESS'::"public"."TodoStatus_new"
        WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"public"."TodoStatus_new"
        WHEN "status"::text = 'NOT_STARTED' THEN 'NOT_STARTED'::"public"."TodoStatus_new"
        WHEN "status"::text = 'WAITING_FOR' THEN 'WAITING_FOR'::"public"."TodoStatus_new"
        ELSE 'NOT_STARTED'::"public"."TodoStatus_new"
      END
    );

    -- Replace the old enum
    ALTER TYPE "public"."TodoStatus" RENAME TO "TodoStatus_old";
    ALTER TYPE "public"."TodoStatus_new" RENAME TO "TodoStatus";
    DROP TYPE "public"."TodoStatus_old";

    -- Set the default
    ALTER TABLE "public"."todos" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
  END IF;
END $$;

COMMIT;