-- Migration: Add platform_points_transactions table
-- This table tracks platform-wide points earned by users separate from creator-specific points

CREATE TABLE IF NOT EXISTS platform_points_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source VARCHAR NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_points_user ON platform_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_points_created ON platform_points_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_points_source ON platform_points_transactions(source);

-- Comments
COMMENT ON TABLE platform_points_transactions IS 'Platform-wide points transactions separate from creator loyalty programs';
COMMENT ON COLUMN platform_points_transactions.source IS 'Source of points: task_completion, daily_bonus, referral, admin_grant, etc.';

