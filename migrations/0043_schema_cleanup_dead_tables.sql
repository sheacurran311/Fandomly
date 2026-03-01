-- Migration 0043: Schema cleanup — drop dead tables and fix FK integrity
-- Based on database audit report in docs/DATABASE_SCHEMA_AUDIT.md
--
-- Tables dropped:
--   user_levels: zero references in server or client code (never implemented)
--   social_campaign_tasks: superseded by the tasks table with campaignId FK;
--     only storage.ts CRUD methods reference it, no routes use it
--
-- FK fixes:
--   manual_review_queue: change integer task_completion_id to varchar to match
--     task_completions.id (which uses nanoid varchar PKs, not serial integers)
--
-- NOTE: NFT tables (nft_collections, nft_templates, nft_mints, nft_deliveries,
-- fandomly_badge_templates) are intentionally kept — they will be repurposed
-- for the Fandomly L1 blockchain integration.

-- Drop dead tables
DROP TABLE IF EXISTS user_levels CASCADE;
DROP TABLE IF EXISTS social_campaign_tasks CASCADE;

-- Fix manual_review_queue FK type mismatch
-- The task_completions table uses varchar IDs (nanoid), but manual_review_queue
-- defined task_completion_id as integer. Fix by altering the column type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_review_queue'
    AND column_name = 'task_completion_id'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE manual_review_queue
      ALTER COLUMN task_completion_id TYPE varchar USING task_completion_id::varchar;
  END IF;
END $$;

-- Add missing indexes identified in the audit
-- Each index is wrapped in a DO block to skip gracefully if the table/column
-- doesn't exist yet (e.g., on a fresh database before drizzle-kit push).
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_verification_attempts_task_id ON verification_attempts (task_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_verification_attempts_user_id ON verification_attempts (user_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_verification_attempts_created_at ON verification_attempts (created_at);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_task_completions_tenant_id ON task_completions (tenant_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions (status);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_manual_review_queue_status ON manual_review_queue (status);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_manual_review_queue_creator_id ON manual_review_queue (creator_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_platform_content_metrics_content_id ON platform_content_metrics (content_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_platform_content_metrics_captured_at ON platform_content_metrics (captured_at);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_starter_pack_completions_user_tenant ON starter_pack_completions (user_id, tenant_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_verification_codes_task_user ON verification_codes (task_id, user_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_group_goal_participants_goal_id ON group_goal_participants (goal_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
