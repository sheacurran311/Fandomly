-- Migration: Add Kick and Patreon platforms with new task types
-- Part of Cross-Network Verification System Phase 1

-- Add new platforms to social_platform enum
DO $$ BEGIN
  ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'kick';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'patreon';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new task types to task_type enum

-- Kick task types
DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'kick_follow';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'kick_subscribe';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'kick_chat_code';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'kick_redeem_reward';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Patreon task types
DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'patreon_support';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'patreon_tier_check';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Twitch chat code task type
DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'twitch_chat_code';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Discord message code task type
DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'discord_message_code';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Group goal task types
DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'group_reactions';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'group_viewers';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add concurrent_viewers to group_goal_metric enum
DO $$ BEGIN
  ALTER TYPE group_goal_metric ADD VALUE IF NOT EXISTS 'concurrent_viewers';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
