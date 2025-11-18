-- Migration: Add Sprint 2 Interactive Task Support
-- Purpose: Support website visits, polls, and quizzes

-- 1. Update task_type enum to include new interactive task types
-- Note: PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction easily
-- We'll use a safer approach: add them if they don't exist

DO $$ BEGIN
  -- Add tiktok_post
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tiktok_post' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'tiktok_post';
  END IF;

  -- Add website_visit
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'website_visit' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'website_visit';
  END IF;

  -- Add poll
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'poll' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'poll';
  END IF;

  -- Add quiz
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quiz' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'quiz';
  END IF;

  -- Add check_in
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'check_in' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'check_in';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- If task_type enum doesn't exist, create it with all values
    -- This is for new installations
    CREATE TYPE task_type AS ENUM (
      'twitter_follow', 'twitter_retweet', 'twitter_like', 'twitter_reply',
      'youtube_subscribe', 'youtube_watch', 'youtube_like', 'youtube_comment',
      'tiktok_follow', 'tiktok_like', 'tiktok_share', 'tiktok_comment', 'tiktok_post',
      'instagram_follow', 'instagram_like', 'instagram_comment', 'instagram_share',
      'facebook_like', 'facebook_share', 'facebook_comment',
      'website_visit', 'poll', 'quiz', 'check_in',
      'custom'
    );
END $$;

-- 2. Create website_visit_tracking table
CREATE TABLE IF NOT EXISTS website_visit_tracking (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_completion_id VARCHAR REFERENCES task_completions(id),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),

  -- Tracking details
  unique_token VARCHAR(100) NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,

  -- Visit tracking
  clicked_at TIMESTAMP,
  time_on_site INTEGER, -- seconds
  action_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,

  -- Metadata (JSONB for flexibility)
  metadata JSONB,

  -- Standard timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for website_visit_tracking
CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_token
ON website_visit_tracking(unique_token);

CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_user
ON website_visit_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_task
ON website_visit_tracking(task_id);

CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_completion
ON website_visit_tracking(task_completion_id);

CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_clicked
ON website_visit_tracking(clicked_at DESC);

COMMENT ON TABLE website_visit_tracking IS 'Tracks website visit clicks, time on site, and action completion';
COMMENT ON COLUMN website_visit_tracking.unique_token IS 'UUID token embedded in tracking URL for verification';
COMMENT ON COLUMN website_visit_tracking.time_on_site IS 'Time spent on destination site in seconds';
COMMENT ON COLUMN website_visit_tracking.action_completed IS 'Whether required action was completed (form submit, video watch, etc.)';
COMMENT ON COLUMN website_visit_tracking.metadata IS 'Stores referrer, userAgent, ipAddress, actionType';

-- 3. Create poll_quiz_responses table
CREATE TABLE IF NOT EXISTS poll_quiz_responses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_completion_id VARCHAR NOT NULL REFERENCES task_completions(id),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),

  -- Response data
  responses JSONB NOT NULL,

  -- Quiz scoring (NULL for polls)
  score DECIMAL(5, 2), -- percentage 0-100
  total_questions INTEGER,
  correct_answers INTEGER,
  is_perfect_score BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for poll_quiz_responses
CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_user
ON poll_quiz_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_task
ON poll_quiz_responses(task_id);

CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_completion
ON poll_quiz_responses(task_completion_id);

CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_perfect_score
ON poll_quiz_responses(is_perfect_score) WHERE is_perfect_score = TRUE;

CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_submitted
ON poll_quiz_responses(submitted_at DESC);

COMMENT ON TABLE poll_quiz_responses IS 'Stores user responses to poll and quiz tasks';
COMMENT ON COLUMN poll_quiz_responses.responses IS 'Array of {questionId, questionText, selectedOptions, isCorrect}';
COMMENT ON COLUMN poll_quiz_responses.score IS 'Quiz score as percentage (0-100). NULL for polls.';
COMMENT ON COLUMN poll_quiz_responses.is_perfect_score IS 'True if quiz scored 100% (used for bonus multipliers)';

-- 4. Add GIN index on JSONB columns for faster queries
CREATE INDEX IF NOT EXISTS idx_poll_quiz_responses_responses_gin
ON poll_quiz_responses USING GIN (responses);

CREATE INDEX IF NOT EXISTS idx_website_visit_tracking_metadata_gin
ON website_visit_tracking USING GIN (metadata);
