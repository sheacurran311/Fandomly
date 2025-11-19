-- Migration: Add Sprint 8 Leaderboards
-- Purpose: Create leaderboard views and rank tracking for campaigns, programs, and platform-wide rankings
-- CRITICAL: All data is real-time calculated - NO mock/hardcoded data

-- ============================================
-- SECTION 1: CAMPAIGN LEADERBOARDS
-- ============================================

-- Campaign Leaderboard Materialized View (per campaign rankings)
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_leaderboard AS
SELECT
  cp.campaign_id,
  cp.member_id AS user_id,
  u.username,
  u.avatar,
  cp.total_units_earned AS points,
  cp.participation_count,
  cp.last_participation,
  ROW_NUMBER() OVER (
    PARTITION BY cp.campaign_id
    ORDER BY cp.total_units_earned DESC, cp.last_participation ASC
  ) AS rank,
  COALESCE(
    LAG(ROW_NUMBER() OVER (
      PARTITION BY cp.campaign_id
      ORDER BY cp.total_units_earned DESC, cp.last_participation ASC
    )) OVER (
      PARTITION BY cp.campaign_id, cp.member_id
      ORDER BY cp.last_participation DESC
    ),
    0
  ) AS previous_rank,
  cp.created_at AS joined_at
FROM campaign_participations cp
INNER JOIN users u ON cp.member_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY cp.campaign_id, rank;

-- Create indexes for campaign leaderboard
CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_campaign
ON campaign_leaderboard(campaign_id, rank);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_user
ON campaign_leaderboard(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_points
ON campaign_leaderboard(campaign_id, points DESC);

COMMENT ON MATERIALIZED VIEW campaign_leaderboard IS 'Sprint 8: Real-time campaign leaderboard rankings with rank calculation';

-- ============================================
-- SECTION 2: PROGRAM LEADERBOARDS
-- ============================================

-- Program Leaderboard Materialized View (per program rankings)
CREATE MATERIALIZED VIEW IF NOT EXISTS program_leaderboard AS
SELECT
  fp.program_id,
  fp.fan_id AS user_id,
  u.username,
  u.avatar,
  fp.current_points,
  fp.total_points_earned,
  fp.current_tier,
  fp.joined_at,
  ROW_NUMBER() OVER (
    PARTITION BY fp.program_id
    ORDER BY fp.total_points_earned DESC, fp.joined_at ASC
  ) AS rank,
  ROW_NUMBER() OVER (
    PARTITION BY fp.program_id
    ORDER BY fp.current_points DESC, fp.joined_at ASC
  ) AS current_rank
FROM fan_programs fp
INNER JOIN users u ON fp.fan_id = u.id
WHERE fp.deleted_at IS NULL
  AND u.deleted_at IS NULL
ORDER BY fp.program_id, rank;

-- Create indexes for program leaderboard
CREATE INDEX IF NOT EXISTS idx_program_leaderboard_program
ON program_leaderboard(program_id, rank);

CREATE INDEX IF NOT EXISTS idx_program_leaderboard_user
ON program_leaderboard(user_id);

CREATE INDEX IF NOT EXISTS idx_program_leaderboard_points
ON program_leaderboard(program_id, total_points_earned DESC);

COMMENT ON MATERIALIZED VIEW program_leaderboard IS 'Sprint 8: Real-time program leaderboard rankings with current and total points';

-- ============================================
-- SECTION 3: PLATFORM LEADERBOARD
-- ============================================

-- Platform Leaderboard Materialized View (global platform points)
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_leaderboard AS
SELECT
  u.id AS user_id,
  u.username,
  u.avatar,
  COALESCE(SUM(ppt.points), 0) AS total_points,
  COUNT(ppt.id) AS transaction_count,
  MAX(ppt.created_at) AS last_activity,
  MIN(ppt.created_at) AS first_activity,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(ppt.points), 0) DESC, MAX(ppt.created_at) ASC
  ) AS rank
FROM users u
LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.avatar
ORDER BY rank;

-- Create indexes for platform leaderboard
CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_rank
ON platform_leaderboard(rank);

CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_user
ON platform_leaderboard(user_id);

CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_points
ON platform_leaderboard(total_points DESC);

COMMENT ON MATERIALIZED VIEW platform_leaderboard IS 'Sprint 8: Real-time platform-wide leaderboard based on Fandomly Points';

-- ============================================
-- SECTION 4: TIME-PERIOD FILTERED VIEWS
-- ============================================

-- Campaign Leaderboard - This Week
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_leaderboard_week AS
SELECT
  cp.campaign_id,
  cp.member_id AS user_id,
  u.username,
  u.avatar,
  cp.total_units_earned AS points,
  cp.participation_count,
  cp.last_participation,
  ROW_NUMBER() OVER (
    PARTITION BY cp.campaign_id
    ORDER BY cp.total_units_earned DESC, cp.last_participation ASC
  ) AS rank
FROM campaign_participations cp
INNER JOIN users u ON cp.member_id = u.id
WHERE u.deleted_at IS NULL
  AND cp.last_participation >= NOW() - INTERVAL '7 days'
ORDER BY cp.campaign_id, rank;

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_week_campaign
ON campaign_leaderboard_week(campaign_id, rank);

-- Campaign Leaderboard - This Month
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_leaderboard_month AS
SELECT
  cp.campaign_id,
  cp.member_id AS user_id,
  u.username,
  u.avatar,
  cp.total_units_earned AS points,
  cp.participation_count,
  cp.last_participation,
  ROW_NUMBER() OVER (
    PARTITION BY cp.campaign_id
    ORDER BY cp.total_units_earned DESC, cp.last_participation ASC
  ) AS rank
FROM campaign_participations cp
INNER JOIN users u ON cp.member_id = u.id
WHERE u.deleted_at IS NULL
  AND cp.last_participation >= NOW() - INTERVAL '30 days'
ORDER BY cp.campaign_id, rank;

CREATE INDEX IF NOT EXISTS idx_campaign_leaderboard_month_campaign
ON campaign_leaderboard_month(campaign_id, rank);

-- Platform Leaderboard - This Week
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_leaderboard_week AS
SELECT
  u.id AS user_id,
  u.username,
  u.avatar,
  COALESCE(SUM(ppt.points), 0) AS total_points,
  COUNT(ppt.id) AS transaction_count,
  MAX(ppt.created_at) AS last_activity,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(ppt.points), 0) DESC, MAX(ppt.created_at) ASC
  ) AS rank
FROM users u
LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
WHERE u.deleted_at IS NULL
  AND (ppt.created_at IS NULL OR ppt.created_at >= NOW() - INTERVAL '7 days')
GROUP BY u.id, u.username, u.avatar
HAVING COALESCE(SUM(ppt.points), 0) > 0
ORDER BY rank;

CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_week_rank
ON platform_leaderboard_week(rank);

-- Platform Leaderboard - This Month
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_leaderboard_month AS
SELECT
  u.id AS user_id,
  u.username,
  u.avatar,
  COALESCE(SUM(ppt.points), 0) AS total_points,
  COUNT(ppt.id) AS transaction_count,
  MAX(ppt.created_at) AS last_activity,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(ppt.points), 0) DESC, MAX(ppt.created_at) ASC
  ) AS rank
FROM users u
LEFT JOIN platform_points_transactions ppt ON u.id = ppt.user_id
WHERE u.deleted_at IS NULL
  AND (ppt.created_at IS NULL OR ppt.created_at >= NOW() - INTERVAL '30 days')
GROUP BY u.id, u.username, u.avatar
HAVING COALESCE(SUM(ppt.points), 0) > 0
ORDER BY rank;

CREATE INDEX IF NOT EXISTS idx_platform_leaderboard_month_rank
ON platform_leaderboard_month(rank);

-- ============================================
-- SECTION 5: RANK CHANGE TRACKING
-- ============================================

-- Rank History Table - Tracks daily rank snapshots for movement indicators
CREATE TABLE IF NOT EXISTS leaderboard_rank_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,

  -- Scope
  leaderboard_type VARCHAR(50) NOT NULL, -- 'campaign' | 'program' | 'platform'
  scope_id VARCHAR, -- campaign_id, program_id, or NULL for platform

  -- User & Rank
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,

  -- Change Tracking
  rank_change INTEGER DEFAULT 0, -- Positive = moved up, Negative = moved down
  points_change INTEGER DEFAULT 0,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: one snapshot per user per scope per day
  UNIQUE(leaderboard_type, scope_id, user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_rank_history_user
ON leaderboard_rank_history(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_rank_history_scope
ON leaderboard_rank_history(leaderboard_type, scope_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_rank_history_date
ON leaderboard_rank_history(snapshot_date DESC);

COMMENT ON TABLE leaderboard_rank_history IS 'Sprint 8: Daily rank snapshots for tracking leaderboard movement over time';

-- ============================================
-- SECTION 6: REFRESH FUNCTIONS
-- ============================================

-- Function to refresh all leaderboard views
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS VOID AS $$
BEGIN
  -- Refresh all leaderboard materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY program_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_leaderboard_week;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_leaderboard_month;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_leaderboard_week;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_leaderboard_month;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_leaderboards IS 'Sprint 8: Refreshes all leaderboard materialized views for up-to-date rankings';

-- Function to capture daily rank snapshots
CREATE OR REPLACE FUNCTION capture_rank_snapshot()
RETURNS VOID AS $$
BEGIN
  -- Capture campaign leaderboard snapshots
  INSERT INTO leaderboard_rank_history (
    leaderboard_type, scope_id, user_id, rank, points, rank_change, points_change, snapshot_date
  )
  SELECT
    'campaign',
    cl.campaign_id,
    cl.user_id,
    cl.rank,
    cl.points,
    COALESCE(cl.rank - prev.rank, 0) AS rank_change,
    COALESCE(cl.points - prev.points, cl.points) AS points_change,
    CURRENT_DATE
  FROM campaign_leaderboard cl
  LEFT JOIN leaderboard_rank_history prev
    ON prev.leaderboard_type = 'campaign'
    AND prev.scope_id = cl.campaign_id
    AND prev.user_id = cl.user_id
    AND prev.snapshot_date = CURRENT_DATE - INTERVAL '1 day'
  ON CONFLICT (leaderboard_type, scope_id, user_id, snapshot_date)
  DO UPDATE SET
    rank = EXCLUDED.rank,
    points = EXCLUDED.points,
    rank_change = EXCLUDED.rank_change,
    points_change = EXCLUDED.points_change;

  -- Capture program leaderboard snapshots
  INSERT INTO leaderboard_rank_history (
    leaderboard_type, scope_id, user_id, rank, points, rank_change, points_change, snapshot_date
  )
  SELECT
    'program',
    pl.program_id,
    pl.user_id,
    pl.rank,
    pl.total_points_earned,
    COALESCE(pl.rank - prev.rank, 0) AS rank_change,
    COALESCE(pl.total_points_earned - prev.points, pl.total_points_earned) AS points_change,
    CURRENT_DATE
  FROM program_leaderboard pl
  LEFT JOIN leaderboard_rank_history prev
    ON prev.leaderboard_type = 'program'
    AND prev.scope_id = pl.program_id
    AND prev.user_id = pl.user_id
    AND prev.snapshot_date = CURRENT_DATE - INTERVAL '1 day'
  ON CONFLICT (leaderboard_type, scope_id, user_id, snapshot_date)
  DO UPDATE SET
    rank = EXCLUDED.rank,
    points = EXCLUDED.points,
    rank_change = EXCLUDED.rank_change,
    points_change = EXCLUDED.points_change;

  -- Capture platform leaderboard snapshots
  INSERT INTO leaderboard_rank_history (
    leaderboard_type, scope_id, user_id, rank, points, rank_change, points_change, snapshot_date
  )
  SELECT
    'platform',
    NULL,
    platf.user_id,
    platf.rank,
    platf.total_points,
    COALESCE(platf.rank - prev.rank, 0) AS rank_change,
    COALESCE(platf.total_points - prev.points, platf.total_points) AS points_change,
    CURRENT_DATE
  FROM platform_leaderboard platf
  LEFT JOIN leaderboard_rank_history prev
    ON prev.leaderboard_type = 'platform'
    AND prev.scope_id IS NULL
    AND prev.user_id = platf.user_id
    AND prev.snapshot_date = CURRENT_DATE - INTERVAL '1 day'
  ON CONFLICT (leaderboard_type, scope_id, user_id, snapshot_date)
  DO UPDATE SET
    rank = EXCLUDED.rank,
    points = EXCLUDED.points,
    rank_change = EXCLUDED.rank_change,
    points_change = EXCLUDED.points_change;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION capture_rank_snapshot IS 'Sprint 8: Captures daily rank snapshots for all leaderboards to track movement';

-- ============================================
-- SECTION 7: AUTO-REFRESH TRIGGERS
-- ============================================

-- Create trigger function to refresh leaderboards on point changes
CREATE OR REPLACE FUNCTION trigger_refresh_leaderboards()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh leaderboards asynchronously in production
  -- For now, we'll keep it simple and refresh on-demand via API
  -- Production: Use pg_cron or background job scheduler
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: In production, use pg_cron for scheduled refreshes:
-- SELECT cron.schedule('refresh-leaderboards', '*/5 * * * *', 'SELECT refresh_leaderboards()');
-- SELECT cron.schedule('capture-rank-snapshot', '0 0 * * *', 'SELECT capture_rank_snapshot()');

-- ============================================
-- SECTION 8: HELPER VIEWS FOR TOP PERFORMERS
-- ============================================

-- View: Top 10 Platform Leaders (for badges/rewards)
CREATE OR REPLACE VIEW top_platform_leaders AS
SELECT
  user_id,
  username,
  avatar,
  total_points,
  rank
FROM platform_leaderboard
WHERE rank <= 10
ORDER BY rank;

COMMENT ON VIEW top_platform_leaders IS 'Sprint 8: Top 10 platform-wide leaders for badge rewards';

-- View: Top 3 Per Campaign (for podium display)
CREATE OR REPLACE VIEW top_campaign_leaders AS
SELECT
  campaign_id,
  user_id,
  username,
  avatar,
  points,
  rank
FROM campaign_leaderboard
WHERE rank <= 3
ORDER BY campaign_id, rank;

COMMENT ON VIEW top_campaign_leaders IS 'Sprint 8: Top 3 leaders per campaign for podium display';

-- View: Top 10 Per Program
CREATE OR REPLACE VIEW top_program_leaders AS
SELECT
  program_id,
  user_id,
  username,
  avatar,
  total_points_earned,
  current_points,
  rank
FROM program_leaderboard
WHERE rank <= 10
ORDER BY program_id, rank;

COMMENT ON VIEW top_program_leaders IS 'Sprint 8: Top 10 leaders per program for rewards';

-- ============================================
-- SECTION 9: INITIAL REFRESH
-- ============================================

-- Perform initial refresh of all views
SELECT refresh_leaderboards();
