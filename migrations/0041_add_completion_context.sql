-- Migration: Add completion_context column to task_completions
-- Purpose: Enable campaign-aware deduplication - allows the same task to be
-- completed both standalone and within campaigns separately.
-- 
-- This supports the use case where a creator publishes a "Follow me on X" task
-- as a standalone task, but also includes it in a campaign where the user must
-- be verified as STILL following at campaign completion time.

-- Add the completion_context column
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS completion_context TEXT DEFAULT 'standalone';

-- Backfill existing rows based on whether campaign_id is set
-- If campaign_id is set, mark as 'campaign'; otherwise 'standalone'
UPDATE task_completions
  SET completion_context = CASE
    WHEN campaign_id IS NOT NULL THEN 'campaign'
    ELSE 'standalone'
  END
  WHERE completion_context IS NULL OR completion_context = '';

-- Add a comment for documentation
COMMENT ON COLUMN task_completions.completion_context IS 
  'Context in which task was completed: standalone (default) or campaign. Enables separate completions for campaign re-verification.';
