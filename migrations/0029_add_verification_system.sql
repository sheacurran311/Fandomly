-- ============================================================================
-- VERIFICATION SYSTEM MIGRATION
-- Adds tables and columns for code-based verification, group goals, and starter packs
-- ============================================================================

-- Create enums for verification system
DO $$ BEGIN
  CREATE TYPE verification_tier AS ENUM ('T1', 'T2', 'T3');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_method_type AS ENUM ('api', 'code_comment', 'code_repost', 'hashtag', 'starter_pack', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE code_type AS ENUM ('comment', 'repost', 'hashtag');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE group_goal_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE group_goal_metric AS ENUM ('followers', 'likes', 'views', 'comments', 'shares', 'reactions', 'subscribers');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VERIFICATION CODES TABLE
-- Stores unique codes for each fan per task
-- ============================================================================
CREATE TABLE IF NOT EXISTS "verification_codes" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(8) NOT NULL UNIQUE,
  "task_id" VARCHAR NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "fan_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenant_id" VARCHAR NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  
  "code_type" code_type NOT NULL,
  
  "is_used" BOOLEAN DEFAULT FALSE,
  "used_at" TIMESTAMP,
  "expires_at" TIMESTAMP,
  
  "verification_data" JSONB,
  
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS "verification_codes_code_idx" ON "verification_codes" ("code");
CREATE INDEX IF NOT EXISTS "verification_codes_task_id_idx" ON "verification_codes" ("task_id");
CREATE INDEX IF NOT EXISTS "verification_codes_fan_id_idx" ON "verification_codes" ("fan_id");
CREATE INDEX IF NOT EXISTS "verification_codes_tenant_id_idx" ON "verification_codes" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_codes_task_fan_idx" ON "verification_codes" ("task_id", "fan_id");

-- ============================================================================
-- GROUP GOALS TABLE
-- Community goals with collective rewards
-- ============================================================================
CREATE TABLE IF NOT EXISTS "group_goals" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" VARCHAR NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "tenant_id" VARCHAR NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "creator_id" VARCHAR NOT NULL REFERENCES "creators"("id") ON DELETE CASCADE,
  
  "platform" social_platform NOT NULL,
  "metric_type" group_goal_metric NOT NULL,
  "target_value" INTEGER NOT NULL,
  "current_value" INTEGER DEFAULT 0,
  
  "hashtag" VARCHAR(50),
  "content_id" VARCHAR,
  "content_url" TEXT,
  
  "points_per_participant" INTEGER NOT NULL DEFAULT 50,
  "bonus_points_on_completion" INTEGER DEFAULT 0,
  
  "status" group_goal_status DEFAULT 'active',
  "completed_at" TIMESTAMP,
  
  "last_checked_at" TIMESTAMP,
  "check_count" INTEGER DEFAULT 0,
  
  "start_time" TIMESTAMP,
  "end_time" TIMESTAMP,
  
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for group_goals
CREATE INDEX IF NOT EXISTS "group_goals_task_id_idx" ON "group_goals" ("task_id");
CREATE INDEX IF NOT EXISTS "group_goals_tenant_id_idx" ON "group_goals" ("tenant_id");
CREATE INDEX IF NOT EXISTS "group_goals_status_idx" ON "group_goals" ("status");
CREATE INDEX IF NOT EXISTS "group_goals_platform_idx" ON "group_goals" ("platform");

-- ============================================================================
-- GROUP GOAL PARTICIPANTS TABLE
-- Fans enrolled in group goals
-- ============================================================================
CREATE TABLE IF NOT EXISTS "group_goal_participants" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_goal_id" VARCHAR NOT NULL REFERENCES "group_goals"("id") ON DELETE CASCADE,
  "fan_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  
  "joined_at" TIMESTAMP DEFAULT NOW(),
  "rewarded_at" TIMESTAMP,
  "points_awarded" INTEGER,
  
  "contribution_data" JSONB,
  
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for group_goal_participants
CREATE INDEX IF NOT EXISTS "group_goal_participants_goal_id_idx" ON "group_goal_participants" ("group_goal_id");
CREATE INDEX IF NOT EXISTS "group_goal_participants_fan_id_idx" ON "group_goal_participants" ("fan_id");
CREATE UNIQUE INDEX IF NOT EXISTS "group_goal_participants_unique_idx" ON "group_goal_participants" ("group_goal_id", "fan_id");

-- ============================================================================
-- STARTER PACK COMPLETIONS TABLE
-- Enforces one-time starter pack completions per platform per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS "starter_pack_completions" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "fan_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenant_id" VARCHAR NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "platform" social_platform NOT NULL,
  
  "campaign_id" VARCHAR REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "task_completion_id" VARCHAR REFERENCES "task_completions"("id") ON DELETE SET NULL,
  "task_id" VARCHAR REFERENCES "tasks"("id") ON DELETE SET NULL,
  
  "points_awarded" INTEGER,
  
  "completed_at" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for starter_pack_completions
CREATE INDEX IF NOT EXISTS "starter_pack_completions_fan_id_idx" ON "starter_pack_completions" ("fan_id");
CREATE INDEX IF NOT EXISTS "starter_pack_completions_tenant_id_idx" ON "starter_pack_completions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "starter_pack_completions_platform_idx" ON "starter_pack_completions" ("platform");

-- Unique constraint: one completion per fan per platform per tenant per campaign
-- Using a partial unique index for NULL campaign_id (global completions)
CREATE UNIQUE INDEX IF NOT EXISTS "starter_pack_global_unique_idx" 
  ON "starter_pack_completions" ("fan_id", "tenant_id", "platform") 
  WHERE "campaign_id" IS NULL;

-- For campaign-specific completions
CREATE UNIQUE INDEX IF NOT EXISTS "starter_pack_campaign_unique_idx" 
  ON "starter_pack_completions" ("fan_id", "tenant_id", "platform", "campaign_id") 
  WHERE "campaign_id" IS NOT NULL;

-- ============================================================================
-- ALTER TASKS TABLE
-- Add verification system columns
-- ============================================================================
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verification_tier" TEXT DEFAULT 'T3';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verification_method" TEXT DEFAULT 'manual';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_starter_pack" BOOLEAN DEFAULT FALSE;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_group_goal" BOOLEAN DEFAULT FALSE;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "group_goal_config" JSONB;

-- ============================================================================
-- ALTER TASK_COMPLETIONS TABLE
-- Add verification tracking columns
-- ============================================================================
ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "verification_code_id" VARCHAR;
ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "verification_code_used" VARCHAR(8);
ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "verification_confidence" TEXT;
ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "verification_tier" TEXT;
ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "campaign_id" VARCHAR REFERENCES "campaigns"("id") ON DELETE SET NULL;

-- Index for campaign_id on task_completions
CREATE INDEX IF NOT EXISTS "task_completions_campaign_id_idx" ON "task_completions" ("campaign_id");
CREATE INDEX IF NOT EXISTS "task_completions_verification_tier_idx" ON "task_completions" ("verification_tier");

-- ============================================================================
-- COMMENT: Migration completed
-- ============================================================================
COMMENT ON TABLE "verification_codes" IS 'Stores unique verification codes for code-in-comment/repost task verification';
COMMENT ON TABLE "group_goals" IS 'Tracks community goals where all participants are rewarded when the goal is met';
COMMENT ON TABLE "group_goal_participants" IS 'Tracks which fans have enrolled in group goals';
COMMENT ON TABLE "starter_pack_completions" IS 'Enforces one-time starter pack task completions per platform per tenant';
