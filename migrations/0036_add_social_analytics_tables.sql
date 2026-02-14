-- Migration: Add Social Analytics Tables
-- Purpose: Foundation for cross-network analytics, sync infrastructure, and content metrics
-- Impact: Enables periodic syncing of social platform data, per-network and aggregated analytics
-- Safe to run: YES - Only creates new tables and indexes

-- ============================================================================
-- SYNC PREFERENCES - Creator-controlled sync toggles per platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  sync_enabled boolean DEFAULT true,
  sync_frequency_minutes integer DEFAULT 60,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  sync_status text DEFAULT 'idle', -- idle, syncing, error
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_sync_preferences_user_id ON sync_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_preferences_next_sync ON sync_preferences(next_sync_at) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_preferences_status ON sync_preferences(sync_status);

COMMENT ON TABLE sync_preferences IS
  'Per-user, per-platform sync preferences. Creators can enable/disable data syncing for each connected platform.';

-- ============================================================================
-- PLATFORM ACCOUNT METRICS DAILY - Daily snapshots of account-level metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_account_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  date date NOT NULL,
  followers integer,
  following integer,
  total_posts integer,
  total_views bigint,
  total_likes bigint,
  total_comments bigint,
  engagement_rate numeric(5,2),
  subscribers integer,
  platform_specific jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, date)
);

CREATE INDEX IF NOT EXISTS idx_account_metrics_user_platform ON platform_account_metrics_daily(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_account_metrics_date ON platform_account_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_account_metrics_user_platform_date ON platform_account_metrics_daily(user_id, platform, date DESC);

COMMENT ON TABLE platform_account_metrics_daily IS
  'Daily snapshots of account-level metrics per platform. One row per user per platform per day.';

-- ============================================================================
-- PLATFORM CONTENT - Individual content items (posts, videos, streams, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_content_id text NOT NULL,
  content_type text NOT NULL, -- post, video, reel, story, stream, track, short
  title text,
  description text,
  url text,
  thumbnail_url text,
  published_at timestamptz,
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(platform, platform_content_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_user ON platform_content(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_content_published ON platform_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_content_type ON platform_content(content_type);

COMMENT ON TABLE platform_content IS
  'Individual content items synced from social platforms. Each row is a single post, video, stream, etc.';

-- ============================================================================
-- PLATFORM CONTENT METRICS - Time-series metrics per content item
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES platform_content(id) ON DELETE CASCADE,
  date date NOT NULL,
  views bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  saves bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  engagement_rate numeric(5,2),
  watch_time_minutes numeric,
  platform_specific jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, date)
);

CREATE INDEX IF NOT EXISTS idx_content_metrics_content_date ON platform_content_metrics(content_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_content_metrics_date ON platform_content_metrics(date DESC);

COMMENT ON TABLE platform_content_metrics IS
  'Daily metrics snapshots for individual content items. Enables time-series charts per post/video.';

-- ============================================================================
-- SYNC LOG - Audit trail for all sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  sync_type text NOT NULL, -- account_metrics, content_list, content_metrics, full
  status text NOT NULL, -- started, completed, failed
  items_synced integer DEFAULT 0,
  error_details text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);

COMMENT ON TABLE sync_log IS
  'Audit log of all sync operations. Tracks success/failure, duration, and items synced.';

-- ============================================================================
-- AUTO-CREATE UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sync_preferences_updated_at ON sync_preferences;
CREATE TRIGGER update_sync_preferences_updated_at
    BEFORE UPDATE ON sync_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_content_updated_at ON platform_content;
CREATE TRIGGER update_platform_content_updated_at
    BEFORE UPDATE ON platform_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
