-- Sprint 8: Leaderboard System with Real-Time Calculations
-- Migration: 0027_add_sprint8_leaderboard_views.sql
-- Description: Creates materialized views for campaign, platform, and program leaderboards
-- CRITICAL: All data is calculated in real-time - no mock/hardcoded values

-- ============================================================================
-- 1. PLATFORM LEADERBOARD VIEW
-- Aggregates platform points across all users from platformPointsTransactions
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_leaderboard AS
SELECT
  u.id AS user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  COALESCE(SUM(ppt.points), 0)::INTEGER AS total_points,
  COUNT(DISTINCT ppt.id)::INTEGER AS transaction_count,
  MAX(ppt.created_at) AS last_activity,
  -- Calculate rank using dense_rank for ties
  DENSE_RANK() OVER (ORDER BY COALESCE(SUM(ppt.points), 0) DESC) AS rank
FROM users u
LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
WHERE u.role = 'fan' AND u.deleted_at IS NULL
GROUP BY u.id, u.username, u.full_name, u.avatar_url
ORDER BY total_points DESC;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_leaderboard_user_id ON platform_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_rank ON platform_leaderboard(rank);

-- ============================================================================
-- 2. PROGRAM LEADERBOARD VIEW
-- Aggregates points per program from fanPrograms table
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS program_leaderboard AS
SELECT
  fp.program_id,
  fp.fan_id AS user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  lp.name AS program_name,
  fp.tenant_id,
  COALESCE(fp.current_points, 0)::INTEGER AS current_points,
  COALESCE(fp.total_points_earned, 0)::INTEGER AS total_points,
  fp.current_tier,
  fp.joined_at,
  fp.updated_at AS last_activity,
  -- Rank within each program
  DENSE_RANK() OVER (PARTITION BY fp.program_id ORDER BY COALESCE(fp.total_points_earned, 0) DESC) AS rank
FROM fan_programs fp
JOIN users u ON fp.fan_id = u.id
JOIN loyalty_programs lp ON fp.program_id = lp.id
WHERE fp.deleted_at IS NULL AND u.deleted_at IS NULL
ORDER BY fp.program_id, total_points DESC;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_program_leaderboard_program_id ON program_leaderboard(program_id);
CREATE INDEX IF NOT EXISTS idx_program_leaderboard_user_id ON program_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_program_leaderboard_rank ON program_leaderboard(program_id, rank);

-- ============================================================================
-- 3. CAMPAIGN LEADERBOARD VIEW
-- Aggregates points per campaign from campaignParticipations table
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_leaderboard AS
SELECT
  cp.campaign_id,
  cp.member_id AS user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  c.name AS campaign_name,
  cp.tenant_id,
  COALESCE(cp.total_units_earned, 0)::INTEGER AS total_points,
  COALESCE(cp.participation_count, 0)::INTEGER AS participation_count,
  cp.last_participation AS last_activity,
  cp.created_at AS joined_at,
  -- Rank within each campaign
  DENSE_RANK() OVER (PARTITION BY cp.campaign_id ORDER BY COALESCE(cp.total_units_earned, 0) DESC) AS rank
FROM campaign_participations cp
JOIN users u ON cp.member_id = u.id
JOIN campaigns c ON cp.campaign_id = c.id
WHERE u.deleted_at IS NULL
ORDER BY cp.campaign_id, total_points DESC;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_campaign_id ON campaign_leaderboard(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_user_id ON campaign_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_rank ON campaign_leaderboard(campaign_id, rank);

-- ============================================================================
-- 4. TIME-BASED LEADERBOARD FUNCTIONS
-- For filtering leaderboards by time period (this_week, this_month, all_time)
-- ============================================================================

-- Platform leaderboard with time filtering
CREATE OR REPLACE FUNCTION get_platform_leaderboard(
  p_time_period TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id VARCHAR,
  username VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  total_points INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    COALESCE(SUM(ppt.points), 0)::INTEGER,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(ppt.points), 0) DESC)
  FROM users u
  LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
    AND (
      CASE p_time_period
        WHEN 'this_week' THEN ppt.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
        WHEN 'this_month' THEN ppt.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        ELSE TRUE
      END
    )
  WHERE u.role = 'fan' AND u.deleted_at IS NULL
  GROUP BY u.id, u.username, u.full_name, u.avatar_url
  ORDER BY COALESCE(SUM(ppt.points), 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Campaign leaderboard with time filtering
CREATE OR REPLACE FUNCTION get_campaign_leaderboard(
  p_campaign_id VARCHAR,
  p_time_period TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id VARCHAR,
  username VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  total_points INTEGER,
  participation_count INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    COALESCE(cp.total_units_earned, 0)::INTEGER,
    COALESCE(cp.participation_count, 0)::INTEGER,
    DENSE_RANK() OVER (ORDER BY COALESCE(cp.total_units_earned, 0) DESC)
  FROM campaign_participations cp
  JOIN users u ON cp.member_id = u.id
  WHERE cp.campaign_id = p_campaign_id
    AND u.deleted_at IS NULL
    AND (
      CASE p_time_period
        WHEN 'this_week' THEN cp.last_participation >= date_trunc('week', CURRENT_TIMESTAMP)
        WHEN 'this_month' THEN cp.last_participation >= date_trunc('month', CURRENT_TIMESTAMP)
        ELSE TRUE
      END
    )
  ORDER BY COALESCE(cp.total_units_earned, 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Program leaderboard with time filtering
CREATE OR REPLACE FUNCTION get_program_leaderboard(
  p_program_id VARCHAR,
  p_time_period TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id VARCHAR,
  username VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  total_points INTEGER,
  current_tier TEXT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    COALESCE(fp.total_points_earned, 0)::INTEGER,
    fp.current_tier,
    DENSE_RANK() OVER (ORDER BY COALESCE(fp.total_points_earned, 0) DESC)
  FROM fan_programs fp
  JOIN users u ON fp.fan_id = u.id
  WHERE fp.program_id = p_program_id
    AND fp.deleted_at IS NULL
    AND u.deleted_at IS NULL
    AND (
      CASE p_time_period
        WHEN 'this_week' THEN fp.updated_at >= date_trunc('week', CURRENT_TIMESTAMP)
        WHEN 'this_month' THEN fp.updated_at >= date_trunc('month', CURRENT_TIMESTAMP)
        ELSE TRUE
      END
    )
  ORDER BY COALESCE(fp.total_points_earned, 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. MATERIALIZED VIEW REFRESH FUNCTION
-- Call this periodically or after point transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY program_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. AUTOMATIC BADGE REWARDS TABLE
-- Track which badges are awarded for leaderboard positions
-- ============================================================================

CREATE TABLE IF NOT EXISTS leaderboard_badge_rewards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,

  -- Leaderboard type and target
  leaderboard_type VARCHAR NOT NULL CHECK (leaderboard_type IN ('platform', 'program', 'campaign')),
  target_id VARCHAR, -- program_id or campaign_id (null for platform)

  -- Badge reward configuration
  badge_id VARCHAR NOT NULL,
  min_rank INTEGER NOT NULL DEFAULT 1,
  max_rank INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_rank_range CHECK (min_rank <= max_rank AND min_rank >= 1)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_badge_rewards_type ON leaderboard_badge_rewards(leaderboard_type, target_id);

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW platform_leaderboard IS
'Platform-wide leaderboard aggregating all platform point transactions. Real-time calculations - will show zeros in dev mode.';

COMMENT ON MATERIALIZED VIEW program_leaderboard IS
'Per-program leaderboards based on fan_programs points. Real-time calculations - will show zeros in dev mode.';

COMMENT ON MATERIALIZED VIEW campaign_leaderboard IS
'Per-campaign leaderboards based on campaign_participations. Real-time calculations - will show zeros in dev mode.';

COMMENT ON FUNCTION get_platform_leaderboard IS
'Get platform leaderboard with optional time filtering (this_week, this_month, all_time)';

COMMENT ON FUNCTION get_campaign_leaderboard IS
'Get campaign leaderboard with optional time filtering (this_week, this_month, all_time)';

COMMENT ON FUNCTION get_program_leaderboard IS
'Get program leaderboard with optional time filtering (this_week, this_month, all_time)';

COMMENT ON FUNCTION refresh_leaderboard_views IS
'Refresh all leaderboard materialized views concurrently';

COMMENT ON TABLE leaderboard_badge_rewards IS
'Configuration for automatic badge rewards based on leaderboard positions.
NOTE: Auto badge rewards as NFTs are for PLATFORM CAMPAIGNS ONLY (admin-created).
Creators have tools to implement their own NFT badges for campaign leaders, but winners are only for time-based campaigns (not ongoing programs).';
