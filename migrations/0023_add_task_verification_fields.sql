-- Migration: Add task completion verification fields
-- Purpose: Support proof submission, manual review, and verification metadata

-- Add proof data fields to task_completions
ALTER TABLE task_completions
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS proof_notes TEXT,
ADD COLUMN IF NOT EXISTS verification_metadata JSONB,
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_completions_requires_review
ON task_completions(requires_manual_review)
WHERE requires_manual_review = TRUE;

CREATE INDEX IF NOT EXISTS idx_task_completions_reviewed_at
ON task_completions(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_task_completions_status_created
ON task_completions(status, created_at);

-- Create manual review queue table
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id SERIAL PRIMARY KEY,
  task_completion_id INTEGER NOT NULL REFERENCES task_completions(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  fan_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Platform and task info
  platform VARCHAR(50) NOT NULL,
  task_type VARCHAR(100) NOT NULL,
  task_name VARCHAR(255) NOT NULL,

  -- Proof data
  screenshot_url TEXT,
  proof_url TEXT,
  proof_notes TEXT,

  -- Review status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Review details
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  review_notes TEXT,

  -- Metadata
  auto_check_result JSONB, -- Results from smart detection
  verification_attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  CONSTRAINT unique_task_completion_review UNIQUE (task_completion_id)
);

-- Indexes for manual review queue
CREATE INDEX idx_review_queue_status ON manual_review_queue(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_queue_creator ON manual_review_queue(creator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_queue_submitted ON manual_review_queue(submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_queue_priority ON manual_review_queue(priority, submitted_at) WHERE status = 'pending' AND deleted_at IS NULL;

-- Add OAuth token fields to users table for social verification
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_oauth_token TEXT,
ADD COLUMN IF NOT EXISTS twitter_oauth_secret TEXT,
ADD COLUMN IF NOT EXISTS twitter_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS twitter_token_expires_at TIMESTAMP,

ADD COLUMN IF NOT EXISTS youtube_access_token TEXT,
ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS youtube_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS youtube_channel_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS youtube_email VARCHAR(255),

ADD COLUMN IF NOT EXISTS facebook_access_token TEXT,
ADD COLUMN IF NOT EXISTS facebook_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS facebook_token_expires_at TIMESTAMP,

ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMP;

-- Create verification attempts tracking table
CREATE TABLE IF NOT EXISTS verification_attempts (
  id SERIAL PRIMARY KEY,
  task_completion_id INTEGER NOT NULL REFERENCES task_completions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  platform VARCHAR(50) NOT NULL,
  verification_method VARCHAR(50) NOT NULL, -- 'api', 'smart_detection', 'manual'

  -- Attempt details
  success BOOLEAN NOT NULL,
  error_message TEXT,
  verification_data JSONB,

  -- Timestamps
  attempted_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_attempts_completion ON verification_attempts(task_completion_id);
CREATE INDEX idx_verification_attempts_user ON verification_attempts(user_id);
CREATE INDEX idx_verification_attempts_platform ON verification_attempts(platform);
CREATE INDEX idx_verification_attempts_attempted ON verification_attempts(attempted_at DESC);

-- Trigger to update updated_at on manual_review_queue
CREATE OR REPLACE FUNCTION update_manual_review_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manual_review_queue_updated_at
  BEFORE UPDATE ON manual_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_review_queue_updated_at();

-- Add comments for documentation
COMMENT ON TABLE manual_review_queue IS 'Queue for tasks that require manual creator review (Instagram, Facebook, etc.)';
COMMENT ON COLUMN manual_review_queue.auto_check_result IS 'Stores results from smart detection attempts (e.g., TikTok URL validation)';
COMMENT ON COLUMN manual_review_queue.priority IS 'Review priority based on task value, user tier, or time sensitivity';
COMMENT ON TABLE verification_attempts IS 'Audit log of all verification attempts for debugging and analytics';
