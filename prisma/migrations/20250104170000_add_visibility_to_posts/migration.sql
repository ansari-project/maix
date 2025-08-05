-- Add visibility column to posts table
-- Safe migration: Adds column with default value, no data loss
ALTER TABLE "posts" ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- Create index for visibility queries
CREATE INDEX "posts_visibility_idx" ON "posts"("visibility");