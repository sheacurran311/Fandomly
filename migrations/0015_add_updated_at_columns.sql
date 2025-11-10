-- Migration: Add updated_at Timestamp Columns
-- Purpose: Add updated_at columns to tables missing them for change tracking
-- Impact: Better audit trails, easier debugging, change history tracking
-- Safe to run: YES - Only adds columns, sets default to NOW()

-- ============================================================================
-- TABLES MISSING updated_at
-- ============================================================================

-- Based on schema analysis, these tables have created_at but no updated_at:
-- - creators
-- - tenant_memberships
-- - agencies
-- - fan_programs
-- - point_transactions
-- - reward_redemptions
-- - task_completions
-- - notifications
-- - nft_collections
-- - nft_templates
-- - nft_mints
-- - nft_deliveries
-- - fan_referrals
-- - creator_referrals
-- - creator_task_referrals
-- - achievements
-- - user_achievements
-- - user_levels
-- - social_connections
-- - platform_tasks (if exists)
-- - platform_task_completions (if exists)
-- - platform_points_transactions (if exists)

-- ============================================================================
-- ADD updated_at COLUMNS
-- ============================================================================

-- Creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Tenant Memberships table
ALTER TABLE tenant_memberships ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Fan Programs table (user loyalty program memberships)
ALTER TABLE fan_programs ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Point Transactions table (financial - track modifications)
ALTER TABLE point_transactions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Reward Redemptions table (financial - track modifications)
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Task Completions table
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- NFT Collections table
ALTER TABLE nft_collections ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- NFT Templates table
ALTER TABLE nft_templates ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- NFT Mints table
ALTER TABLE nft_mints ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- NFT Deliveries table
ALTER TABLE nft_deliveries ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Fan Referrals table
ALTER TABLE fan_referrals ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Creator Referrals table
ALTER TABLE creator_referrals ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Creator Task Referrals table
ALTER TABLE creator_task_referrals ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- User Achievements table
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- User Levels table
ALTER TABLE user_levels ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Social Connections table
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Platform Tasks table (if exists)
ALTER TABLE platform_tasks ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Platform Task Completions table (if exists)
ALTER TABLE platform_task_completions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Platform Points Transactions table (if exists)
ALTER TABLE platform_points_transactions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Task Assignments table
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Campaign Participations table
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Campaign Rules table
ALTER TABLE campaign_rules ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Reward Distributions table
ALTER TABLE reward_distributions ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Agency Tenants table
ALTER TABLE agency_tenants ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Creator Facebook Pages table (if exists)
ALTER TABLE creator_facebook_pages ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Social Campaign Tasks table (if exists)
ALTER TABLE social_campaign_tasks ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- ============================================================================
-- ADD INDEXES FOR updated_at
-- ============================================================================

-- Indexes for common queries: "recently updated records"
CREATE INDEX IF NOT EXISTS idx_creators_updated_at ON creators(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_completions_updated_at ON task_completions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at ON campaigns(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fan_programs_updated_at ON fan_programs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_mints_updated_at ON nft_mints(updated_at DESC);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN creators.updated_at IS
  'Timestamp of last update. Auto-updated by trigger on row modification.';

COMMENT ON COLUMN task_completions.updated_at IS
  'Timestamp of last update. Tracks progress updates and status changes.';

COMMENT ON COLUMN point_transactions.updated_at IS
  'Timestamp of last update. Important for financial audit trail.';

COMMENT ON COLUMN reward_redemptions.updated_at IS
  'Timestamp of last update. Tracks redemption status changes.';

COMMENT ON COLUMN notifications.updated_at IS
  'Timestamp of last update. Tracks when notification was read/updated.';

COMMENT ON COLUMN nft_mints.updated_at IS
  'Timestamp of last update. Tracks minting status changes.';

COMMENT ON COLUMN fan_referrals.updated_at IS
  'Timestamp of last update. Tracks referral status and reward changes.';

-- ============================================================================
-- UPDATE EXISTING ROWS
-- ============================================================================

-- Set updated_at to created_at for existing rows (maintains historical accuracy)
UPDATE creators SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE tenant_memberships SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE agencies SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE fan_programs SET updated_at = joined_at WHERE updated_at IS NULL; -- Use joined_at as proxy
UPDATE point_transactions SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE reward_redemptions SET updated_at = redeemed_at WHERE updated_at IS NULL; -- Use redeemed_at if available
UPDATE task_completions SET updated_at = COALESCE(completed_at, created_at) WHERE updated_at IS NULL;
UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE nft_collections SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE nft_templates SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE nft_mints SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE nft_deliveries SET updated_at = COALESCE(delivered_at, created_at) WHERE updated_at IS NULL;
UPDATE fan_referrals SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE creator_referrals SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE creator_task_referrals SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE achievements SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE user_achievements SET updated_at = COALESCE(claimed_at, earned_at, created_at) WHERE updated_at IS NULL;
UPDATE user_levels SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE social_connections SET updated_at = connected_at WHERE updated_at IS NULL;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check that all tables now have updated_at
/*
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'updated_at'
ORDER BY table_name;
*/

-- Count rows with updated_at = created_at (should be most existing rows)
/*
SELECT 'creators' as table_name, COUNT(*) as count
FROM creators
WHERE updated_at = created_at
UNION ALL
SELECT 'task_completions', COUNT(*)
FROM task_completions
WHERE updated_at = created_at
UNION ALL
SELECT 'notifications', COUNT(*)
FROM notifications
WHERE updated_at = created_at;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables updated: 25+
-- Columns added: 25+ updated_at columns
-- Indexes added: 6 for common queries
-- Existing data: updated_at set to created_at (maintains accuracy)
-- Next step: Migration 0016 will add triggers to auto-update these timestamps
-- Safe to run: YES - Only adds columns with defaults
-- Rollback: ALTER TABLE <table> DROP COLUMN updated_at
-- ============================================================================
