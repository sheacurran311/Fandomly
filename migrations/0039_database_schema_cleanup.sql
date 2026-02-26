-- Migration: Database schema cleanup
-- Sprint 9: Standardize ID types, timestamps, and add missing constraints

-- ============================================
-- STANDARDIZE ID TYPES TO UUID (VARCHAR)
-- ============================================

-- Note: manual_review_queue and verification_attempts use INTEGER SERIAL
-- This migration converts them to VARCHAR UUID to match other tables

-- Create new columns with UUID type
ALTER TABLE manual_review_queue 
ADD COLUMN IF NOT EXISTS uuid_id VARCHAR(36);

ALTER TABLE verification_attempts 
ADD COLUMN IF NOT EXISTS uuid_id VARCHAR(36);

-- Populate UUIDs for existing records
UPDATE manual_review_queue 
SET uuid_id = gen_random_uuid()::text 
WHERE uuid_id IS NULL;

UPDATE verification_attempts 
SET uuid_id = gen_random_uuid()::text 
WHERE uuid_id IS NULL;

-- Note: Full migration to use UUID as primary key would require:
-- 1. Updating all foreign key references
-- 2. Dropping old PK and adding new one
-- 3. This is left as a future migration to avoid breaking changes

-- ============================================
-- STANDARDIZE TIMESTAMPS TO TIMESTAMPTZ
-- ============================================

-- Convert TIMESTAMP columns to TIMESTAMPTZ for proper timezone handling
-- This ensures all timestamps are stored in UTC

ALTER TABLE users 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE users 
ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE creators 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE creators 
ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE campaigns 
ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date AT TIME ZONE 'UTC';

ALTER TABLE campaigns 
ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date AT TIME ZONE 'UTC';

ALTER TABLE campaigns 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ============================================
-- ADD MISSING UNIQUE CONSTRAINTS
-- ============================================

-- Prevent duplicate platform handles per user
-- First, clean up any existing duplicates (keep the most recent)
DELETE FROM fan_platform_handles a
USING fan_platform_handles b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.platform = b.platform;

-- Now add the unique constraint
ALTER TABLE fan_platform_handles 
DROP CONSTRAINT IF EXISTS fan_platform_handles_user_platform_unique;

ALTER TABLE fan_platform_handles 
ADD CONSTRAINT fan_platform_handles_user_platform_unique 
UNIQUE (user_id, platform);

-- ============================================
-- ADD SOFT DELETE COLUMNS WHERE MISSING
-- ============================================

-- Standardize soft delete pattern across tables
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================
-- CREATE PARTIAL INDEXES FOR SOFT DELETE
-- ============================================

-- Optimize queries that filter by deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_campaigns_active 
ON campaigns (created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_active 
ON tasks (created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rewards_active 
ON rewards (created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Core user table for all platform users (fans and creators)';
COMMENT ON TABLE creators IS 'Creator profiles with business information and public page settings';
COMMENT ON TABLE fan_programs IS 'Fan enrollment in loyalty programs with point balances';
COMMENT ON TABLE point_transactions IS 'Ledger of all point transactions for creator programs';
COMMENT ON TABLE platform_points_transactions IS 'Ledger of all Fandomly platform point transactions';
COMMENT ON TABLE task_completions IS 'Task completion records for creator tasks';
COMMENT ON TABLE reward_redemptions IS 'Reward redemption records with fulfillment status';

-- ============================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================

-- Active users view (users with recent activity)
CREATE OR REPLACE VIEW active_users AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.user_type,
  u.created_at,
  MAX(COALESCE(ppt.created_at, pt.created_at, tc.completed_at)) as last_activity
FROM users u
LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
LEFT JOIN fan_programs fp ON u.id = fp.fan_id
LEFT JOIN point_transactions pt ON fp.id = pt.fan_program_id
LEFT JOIN task_completions tc ON u.id = tc.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.user_type, u.created_at;

COMMENT ON VIEW active_users IS 'Users with their last activity timestamp';
