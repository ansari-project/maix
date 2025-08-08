-- AlterEnum
-- Check if FEATURE value exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FEATURE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'HelpType')) THEN
        ALTER TYPE "HelpType" ADD VALUE 'FEATURE';
    END IF;
END$$;

-- AlterTable - Drop column only if it exists
ALTER TABLE "users" DROP COLUMN IF EXISTS "testField";

