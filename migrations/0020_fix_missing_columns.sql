-- Migration: Fix Issues from 0019
-- Purpose: Fix the remaining issues with materialized views and updates
-- Safe to run: YES

-- ============================================================================
-- FIX USER ACHIEVEMENTS earned_at UPDATE
-- ============================================================================

-- Update existing rows: set earned_at to completed_at for achievements that were completed
UPDATE user_achievements 
SET earned_at = completed_at 
WHERE earned_at IS NULL 
  AND completed = true
  AND completed_at IS NOT NULL;

-- ============================================================================
-- FIX PLATFORM METRICS DAILY MATERIALIZED VIEW
-- ============================================================================

-- Drop and recreate with corrected query
DROP MATERIALIZED VIEW IF EXISTS platform_metrics_daily CASCADE;

CREATE MATERIALIZED VIEW platform_metrics_daily AS
WITH daily_stats AS (
  SELECT
    DATE(created_at) as metric_date,
    COUNT(*) FILTER (WHERE user_type = 'fan') as new_fans,
    COUNT(*) FILTER (WHERE user_type = 'creator') as new_creators,
    COUNT(*) as total_signups,
    COUNT(*) FILTER (WHERE DATE(last_active_at) = DATE(created_at)) as active_on_signup_day
  FROM users
  WHERE deleted_at IS NULL
  GROUP BY DATE(created_at)
),
cumulative AS (
  SELECT 
    DATE(created_at) as metric_date,
    COUNT(*) as cumulative_users
  FROM users
  WHERE deleted_at IS NULL
  GROUP BY DATE(created_at)
)
SELECT 
  ds.metric_date,
  ds.new_fans,
  ds.new_creators,
  ds.total_signups,
  COALESCE((
    SELECT SUM(c2.cumulative_users)
    FROM cumulative c2
    WHERE c2.metric_date <= ds.metric_date
  ), 0) as cumulative_users,
  ds.active_on_signup_day
FROM daily_stats ds
ORDER BY ds.metric_date DESC;

CREATE UNIQUE INDEX idx_platform_metrics_date ON platform_metrics_daily(metric_date DESC);

COMMENT ON MATERIALIZED VIEW platform_metrics_daily IS
  'Daily platform metrics: signups, active users. Refresh daily.';

-- ============================================================================
-- REFRESH ALL MATERIALIZED VIEWS
-- ============================================================================

-- Refresh the views we just created
REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY platform_metrics_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY task_performance_analytics;
REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_analytics;
REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY loyalty_program_health;
REFRESH MATERIALIZED VIEW CONCURRENTLY referral_analytics;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Fixed: user_achievements.earned_at update logic
-- Fixed: platform_metrics_daily materialized view query
-- Refreshed: All 7 materialized views
-- Safe to run: YES
-- ============================================================================

