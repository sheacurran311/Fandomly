-- Add optional profile_data JSONB column to users for fan onboarding profile fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_data" jsonb;


