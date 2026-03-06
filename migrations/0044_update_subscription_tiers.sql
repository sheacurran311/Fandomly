-- Migration: Update subscription_tier enum values
-- Old: starter, professional, enterprise
-- New: free, beginner, rising, allstar, enterprise

-- Step 1: Add new enum values
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'free';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'beginner';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'rising';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'allstar';

-- Step 2: Migrate existing data to new values
-- Note: PostgreSQL doesn't support removing enum values directly.
-- We rename old values by updating the column data.
UPDATE tenants SET subscription_tier = 'free' WHERE subscription_tier = 'starter';
UPDATE tenants SET subscription_tier = 'rising' WHERE subscription_tier = 'professional';

-- Step 3: Update default
ALTER TABLE tenants ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Step 4: Add new limit fields to existing JSONB (backfill with free-tier defaults)
UPDATE tenants
SET limits = limits || '{"maxTasks": 5, "maxSocialConnections": 3, "maxPrograms": 1}'::jsonb
WHERE limits IS NOT NULL
  AND NOT (limits ? 'maxTasks');

-- Step 5: Add new usage fields to existing JSONB
UPDATE tenants
SET usage = usage || '{"currentTasks": 0, "currentSocialConnections": 0, "currentPrograms": 0}'::jsonb
WHERE usage IS NOT NULL
  AND NOT (usage ? 'currentTasks');
