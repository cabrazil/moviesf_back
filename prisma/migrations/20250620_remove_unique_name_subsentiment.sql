-- Migration: Remove unique constraint from SubSentiment.name
-- This allows the same subsentiment name to be used for different main sentiments

-- Remove the unique constraint from the name column
ALTER TABLE "SubSentiment" DROP CONSTRAINT IF EXISTS "SubSentiment_name_key";

-- Add a comment explaining the change
COMMENT ON COLUMN "SubSentiment"."name" IS 'Subsentiment name - no longer unique to allow same name for different main sentiments'; 