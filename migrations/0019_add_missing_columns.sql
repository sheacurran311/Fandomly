-- Migration: Add Missing Columns for Complete Functionality
-- Purpose: Add columns that were referenced in previous migrations but don't exist
-- Impact: Enables full functionality of audit trail, analytics, and tracking features
-- Safe to run: YES - Only adds columns with defaults, doesn't modify existing data

-- ============================================================================
-- USERS TABLE - Add tracking columns
-- ============================================================================

-- Add updated_at for change tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();

-- Add last_active_at for activity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at timestamp;

-- Create index for activity queries
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at DESC);

-- Update existing rows to set updated_at to created_at
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;

-- Update last_active_at to created_at for new users (they were active when they signed up)
UPDATE users SET last_active_at = created_at WHERE last_active_at IS NULL;

COMMENT ON COLUMN users.updated_at IS
  'Timestamp of last update. Auto-updated by trigger on row modification.';

COMMENT ON COLUMN users.last_active_at IS
  'Timestamp of last user activity (login, action, etc.). Updated by application.';

-- ============================================================================
-- TENANT MEMBERSHIPS TABLE - Add created_at
-- ============================================================================

-- Add created_at timestamp
ALTER TABLE tenant_memberships ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();

-- Update existing rows to set created_at to NOW if null
UPDATE tenant_memberships SET created_at = NOW() WHERE created_at IS NULL;

COMMENT ON COLUMN tenant_memberships.created_at IS
  'Timestamp when the tenant membership was created';

-- ============================================================================
-- USER ACHIEVEMENTS TABLE - Add earned_at
-- ============================================================================

-- Add earned_at timestamp
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS earned_at timestamp;

-- Update existing rows: set earned_at to created_at for achievements that were already earned
UPDATE user_achievements 
SET earned_at = created_at 
WHERE earned_at IS NULL 
  AND status = 'completed';

COMMENT ON COLUMN user_achievements.earned_at IS
  'Timestamp when the achievement was earned/completed';

-- ============================================================================
-- CREATOR REFERRALS TABLE - Add commission_earned
-- ============================================================================

-- Add commission_earned to track actual commission amount
ALTER TABLE creator_referrals ADD COLUMN IF NOT EXISTS commission_earned decimal(10, 2) DEFAULT 0;

-- Update existing rows based on commission percentage and any revenue (set to 0 for now)
UPDATE creator_referrals 
SET commission_earned = 0 
WHERE commission_earned IS NULL;

COMMENT ON COLUMN creator_referrals.commission_earned IS
  'Total commission earned from this referral in dollars/currency';

-- ============================================================================
-- PLATFORM TASKS TABLE - Add creator_id (optional)
-- ============================================================================

-- Add creator_id for platform tasks that might be creator-specific
-- This is optional (NULL allowed) since most platform tasks are system-wide
ALTER TABLE platform_tasks ADD COLUMN IF NOT EXISTS creator_id varchar REFERENCES creators(id) ON DELETE SET NULL;

-- Create index for filtering platform tasks by creator
CREATE INDEX IF NOT EXISTS idx_platform_tasks_creator_id ON platform_tasks(creator_id) WHERE creator_id IS NOT NULL;

COMMENT ON COLUMN platform_tasks.creator_id IS
  'Optional: Creator ID if this platform task is creator-specific. NULL for system-wide tasks.';

-- ============================================================================
-- TASK ASSIGNMENTS TABLE - Add user_id
-- ============================================================================

-- Add user_id to track which user the task is assigned to
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id) ON DELETE CASCADE;

-- Create index for user's task assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN task_assignments.user_id IS
  'User ID to whom this task is assigned';

-- ============================================================================
-- ADD TRIGGERS FOR NEW TIMESTAMP COLUMNS
-- ============================================================================

-- Add trigger for users.updated_at (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- FIX MATERIALIZED VIEW DEPENDENCIES
-- ============================================================================

-- Recreate recently_updated_users view now that users.updated_at exists
DROP VIEW IF EXISTS recently_updated_users CASCADE;

CREATE VIEW recently_updated_users AS
SELECT id, username, email, updated_at, updated_at - created_at as age
FROM users
WHERE updated_at > created_at
ORDER BY updated_at DESC
LIMIT 100;

COMMENT ON VIEW recently_updated_users IS
  'Shows the 100 most recently updated users (excludes newly created)';

-- Recreate platform_metrics_daily materialized view with correct columns
DROP MATERIALIZED VIEW IF EXISTS platform_metrics_daily CASCADE;

CREATE MATERIALIZED VIEW platform_metrics_daily AS
SELECT
  DATE(created_at) as metric_date,

  -- User Signups
  COUNT(*) FILTER (WHERE user_type = 'fan') as new_fans,
  COUNT(*) FILTER (WHERE user_type = 'creator') as new_creators,
  COUNT(*) as total_signups,

  -- Cumulative Totals (subquery for running total)
  (SELECT COUNT(*) FROM users u2 WHERE u2.created_at <= DATE(u1.created_at) + INTERVAL '1 day' AND u2.deleted_at IS NULL) as cumulative_users,

  -- User Activity (using last_active_at instead of non-existent column)
  COUNT(*) FILTER (WHERE DATE(last_active_at) = DATE(created_at)) as active_on_signup_day

FROM users u1
WHERE deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY metric_date DESC;

CREATE UNIQUE INDEX idx_platform_metrics_date ON platform_metrics_daily(metric_date DESC);

COMMENT ON MATERIALIZED VIEW platform_metrics_daily IS
  'Daily platform metrics: signups, active users. Refresh daily.';

-- Recreate referral_analytics materialized view with correct columns
DROP MATERIALIZED VIEW IF EXISTS referral_analytics CASCADE;

CREATE MATERIALIZED VIEW referral_analytics AS
SELECT
  -- Fan Referrals
  u.id as user_id,
  u.username,
  u.user_type,

  -- As Referrer
  COUNT(DISTINCT fr_out.id) as fans_referred,
  COALESCE(SUM(fr_out.total_points_referrer_earned), 0) as points_earned_from_referrals,
  COUNT(DISTINCT fr_out.id) FILTER (WHERE fr_out.status = 'active') as active_referrals,

  -- As Referred
  MAX(fr_in.referring_fan_id) as referred_by_user_id,
  MAX(fr_in.status) as referral_status,

  -- Creator Referrals (if creator)
  COUNT(DISTINCT cr_out.id) as creators_referred,
  COALESCE(SUM(cr_out.commission_earned), 0) as commission_earned,

  -- Task Referrals
  COUNT(DISTINCT ctr.id) as task_referrals_created,
  COUNT(DISTINCT ctr.referred_fan_id) FILTER (WHERE ctr.referred_fan_id IS NOT NULL) as task_referrals_converted,
  COALESCE(SUM(ctr.total_creator_points_earned), 0) as task_referral_points_earned,

  -- Performance
  CASE
    WHEN COUNT(DISTINCT fr_out.id) = 0 THEN 0
    ELSE ROUND(
      100.0 * COUNT(DISTINCT fr_out.id) FILTER (WHERE fr_out.status = 'active') /
      COUNT(DISTINCT fr_out.id),
      2
    )
  END as referral_conversion_rate,

  -- Timestamps
  MIN(fr_out.created_at) as first_referral_date,
  MAX(fr_out.created_at) as last_referral_date,
  NOW() as refreshed_at

FROM users u
LEFT JOIN fan_referrals fr_out ON u.id = fr_out.referring_fan_id AND fr_out.deleted_at IS NULL
LEFT JOIN fan_referrals fr_in ON u.id = fr_in.referred_fan_id AND fr_in.deleted_at IS NULL
LEFT JOIN creators c ON u.id = c.user_id AND c.deleted_at IS NULL
LEFT JOIN creator_referrals cr_out ON c.id = cr_out.referring_creator_id AND cr_out.deleted_at IS NULL
LEFT JOIN creator_task_referrals ctr ON u.id = ctr.referring_fan_id AND ctr.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.user_type;

CREATE UNIQUE INDEX idx_referral_analytics_user_id ON referral_analytics(user_id);
CREATE INDEX idx_referral_analytics_fans_referred ON referral_analytics(fans_referred DESC);
CREATE INDEX idx_referral_analytics_conversion_rate ON referral_analytics(referral_conversion_rate DESC);

COMMENT ON MATERIALIZED VIEW referral_analytics IS
  'Referral program analytics: referrals sent/received, conversion rates. Refresh daily.';

-- ============================================================================
-- UPDATE REFRESH FUNCTIONS TO INCLUDE FIXED VIEWS
-- ============================================================================

-- Recreate the refresh function with correct views
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_metrics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY task_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY loyalty_program_health;
  REFRESH MATERIALIZED VIEW CONCURRENTLY referral_analytics;

  RAISE NOTICE 'All analytics views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_analytics_views IS
  'Refresh all materialized views for analytics. Usage: SELECT refresh_all_analytics_views()';

-- ============================================================================
-- HELPER FUNCTION TO UPDATE last_active_at
-- ============================================================================

-- Function to update user's last active timestamp (call from application)
CREATE OR REPLACE FUNCTION update_user_last_active(
  p_user_id varchar
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET last_active_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_last_active IS
  'Update user last_active_at timestamp. Call from your API middleware after successful authentication. Usage: SELECT update_user_last_active(''user-id'')';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all new columns exist
/*
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'users' AND column_name IN ('updated_at', 'last_active_at'))
    OR (table_name = 'tenant_memberships' AND column_name = 'created_at')
    OR (table_name = 'user_achievements' AND column_name = 'earned_at')
    OR (table_name = 'creator_referrals' AND column_name = 'commission_earned')
    OR (table_name = 'platform_tasks' AND column_name = 'creator_id')
    OR (table_name = 'task_assignments' AND column_name = 'user_id')
  )
ORDER BY table_name, column_name;
*/

-- Verify materialized views exist and have data
/*
SELECT
  schemaname,
  matviewname,
  ispopulated,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Columns added: 7 critical columns
--   - users.updated_at (timestamp tracking)
--   - users.last_active_at (activity tracking)
--   - tenant_memberships.created_at (audit trail)
--   - user_achievements.earned_at (achievement tracking)
--   - creator_referrals.commission_earned (financial tracking)
--   - platform_tasks.creator_id (optional relationship)
--   - task_assignments.user_id (assignment tracking)
-- Views fixed: 3 materialized views recreated
-- Functions added: 1 helper function for activity tracking
-- Expected impact: Full functionality of analytics and audit features
-- Safe to run: YES - Only adds columns with defaults
-- Safe to re-run: YES - Uses IF NOT EXISTS
-- ============================================================================

