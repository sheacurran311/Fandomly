-- Migration: Add Sprint 1 Multipliers and Frequency System
-- Purpose: Support point multipliers and reward frequency limits

-- 1. Add multiplier fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS base_multiplier DECIMAL(10, 2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS multiplier_config JSONB;

COMMENT ON COLUMN tasks.base_multiplier IS 'Task-specific base multiplier for points (e.g., 1.5x for premium tasks)';
COMMENT ON COLUMN tasks.multiplier_config IS 'Multiplier configuration: stackingType, maxMultiplier, allowEventMultipliers';

-- 2. Create multiplier_type enum
DO $$ BEGIN
  CREATE TYPE multiplier_type AS ENUM ('time_based', 'streak_based', 'tier_based', 'event', 'task_specific');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create active_multipliers table
CREATE TABLE IF NOT EXISTS active_multipliers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,

  -- Multiplier details
  name TEXT NOT NULL,
  description TEXT,
  type multiplier_type NOT NULL,
  multiplier DECIMAL(10, 2) NOT NULL CHECK (multiplier >= 1.0),

  -- Conditions (JSONB for flexibility)
  conditions JSONB,

  -- Stacking rules
  stacking_type TEXT DEFAULT 'multiplicative' CHECK (stacking_type IN ('additive', 'multiplicative')),
  priority INTEGER DEFAULT 0,
  can_stack_with_others BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR REFERENCES users(id)
);

-- Indexes for active_multipliers
CREATE INDEX IF NOT EXISTS idx_active_multipliers_tenant
ON active_multipliers(tenant_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_multipliers_type
ON active_multipliers(type) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_multipliers_priority
ON active_multipliers(priority DESC) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_multipliers_platform_wide
ON active_multipliers(id) WHERE tenant_id IS NULL AND is_active = TRUE;

COMMENT ON TABLE active_multipliers IS 'Defines active point multipliers (time-based, streak-based, tier-based, events)';
COMMENT ON COLUMN active_multipliers.conditions IS 'Flexible conditions: startDate, endDate, daysOfWeek, timeRanges, requiredStreak, requiredTier, etc.';
COMMENT ON COLUMN active_multipliers.stacking_type IS 'How to combine with other multipliers: additive (sum) or multiplicative (product)';
COMMENT ON COLUMN active_multipliers.priority IS 'Higher priority multipliers are applied first';

-- 4. Create check_in_streaks table
CREATE TABLE IF NOT EXISTS check_in_streaks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),

  -- Streak tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,

  -- Timestamps
  last_check_in TIMESTAMP,
  last_streak_reset TIMESTAMP,

  -- Metadata (JSONB for flexibility)
  metadata JSONB,

  -- Standard timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_task_check_in UNIQUE (user_id, task_id)
);

-- Indexes for check_in_streaks
CREATE INDEX IF NOT EXISTS idx_check_in_streaks_user
ON check_in_streaks(user_id);

CREATE INDEX IF NOT EXISTS idx_check_in_streaks_task
ON check_in_streaks(task_id);

CREATE INDEX IF NOT EXISTS idx_check_in_streaks_current_streak
ON check_in_streaks(current_streak DESC);

CREATE INDEX IF NOT EXISTS idx_check_in_streaks_last_check_in
ON check_in_streaks(last_check_in DESC);

COMMENT ON TABLE check_in_streaks IS 'Tracks daily check-in streaks for users';
COMMENT ON COLUMN check_in_streaks.metadata IS 'Stores streakMilestones, missedDays, longestStreakAchievedAt';
COMMENT ON COLUMN check_in_streaks.current_streak IS 'Consecutive days of check-ins (resets if day missed)';
COMMENT ON COLUMN check_in_streaks.longest_streak IS 'Personal best streak for this user/task combo';

-- 5. Add trigger to update updated_at on active_multipliers
CREATE OR REPLACE FUNCTION update_active_multipliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_active_multipliers_updated_at
  BEFORE UPDATE ON active_multipliers
  FOR EACH ROW
  EXECUTE FUNCTION update_active_multipliers_updated_at();

-- 6. Add trigger to update updated_at on check_in_streaks
CREATE OR REPLACE FUNCTION update_check_in_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_check_in_streaks_updated_at
  BEFORE UPDATE ON check_in_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_check_in_streaks_updated_at();
