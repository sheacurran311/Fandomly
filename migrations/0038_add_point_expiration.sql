-- Migration: Add point expiration support
-- Sprint 5: Point expiration and tier auto-progression

-- Add expires_at column to point_transactions for creator points
ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add expires_at column to platform_points_transactions for platform points
ALTER TABLE platform_points_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add is_expired flag to track void/expired transactions
ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

ALTER TABLE platform_points_transactions 
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Add expired_at timestamp to track when points were expired
ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

ALTER TABLE platform_points_transactions 
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_point_transactions_expires_at 
ON point_transactions (expires_at) 
WHERE expires_at IS NOT NULL AND is_expired = FALSE;

CREATE INDEX IF NOT EXISTS idx_platform_points_expires_at 
ON platform_points_transactions (expires_at) 
WHERE expires_at IS NOT NULL AND is_expired = FALSE;

-- Create table to track point expiration notifications sent
CREATE TABLE IF NOT EXISTS point_expiration_notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id VARCHAR(36) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('creator', 'platform')),
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('7_day_warning', '1_day_warning', 'expired')),
  points_amount INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transaction_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_expiration_notifications_user 
ON point_expiration_notifications (user_id, notification_type);

-- Create table for tier configuration on loyalty programs
CREATE TABLE IF NOT EXISTS loyalty_program_tiers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  program_id VARCHAR(36) NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  tier_order INTEGER NOT NULL,
  benefits JSONB DEFAULT '[]',
  badge_image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, tier_order)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_program 
ON loyalty_program_tiers (program_id, tier_order);

-- Add current_tier_id to fan_programs for tracking user tier
ALTER TABLE fan_programs 
ADD COLUMN IF NOT EXISTS current_tier_id VARCHAR(36) REFERENCES loyalty_program_tiers(id);

-- Add lifetime_points to fan_programs for tier calculation (separate from balance)
ALTER TABLE fan_programs 
ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0;

-- Create tier history table for tracking tier changes
CREATE TABLE IF NOT EXISTS tier_progression_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fan_program_id VARCHAR(36) NOT NULL REFERENCES fan_programs(id) ON DELETE CASCADE,
  from_tier_id VARCHAR(36) REFERENCES loyalty_program_tiers(id),
  to_tier_id VARCHAR(36) REFERENCES loyalty_program_tiers(id),
  progression_type VARCHAR(20) NOT NULL CHECK (progression_type IN ('upgrade', 'downgrade', 'initial')),
  trigger_reason VARCHAR(100) NOT NULL,
  points_at_change INTEGER NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_fan_program 
ON tier_progression_history (fan_program_id, changed_at DESC);

-- Add comment explaining the expiration system
COMMENT ON COLUMN point_transactions.expires_at IS 'Optional expiration date for points. NULL means no expiration.';
COMMENT ON COLUMN point_transactions.is_expired IS 'True if these points have been expired/voided.';
COMMENT ON COLUMN platform_points_transactions.expires_at IS 'Optional expiration date for platform points. NULL means no expiration.';
