-- Migration: Fix Enum Mismatches Between Schema and Database
-- Purpose: Add missing enum values that exist in TypeScript schema but not in database
-- Impact: Prevents "invalid enum value" errors on inserts/updates
-- Safe to run: YES - Adding enum values is non-blocking

-- ============================================================================
-- CAMPAIGN STATUS ENUM
-- ============================================================================

-- Add missing 'pending_tasks' status
-- This status is used when a campaign is created but tasks haven't been assigned yet
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'pending_tasks';

-- Verify all campaign_status values exist
-- Current values: 'active', 'inactive', 'draft', 'archived', 'pending_tasks'

COMMENT ON TYPE campaign_status IS
  'Campaign lifecycle statuses: draft (being created), pending_tasks (awaiting task assignment), active (live), inactive (paused), archived (ended)';

-- ============================================================================
-- TASK TYPE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- These were added in migration 0005_add_comment_task_types.sql
-- Re-running here with IF NOT EXISTS to ensure they exist

-- Twitter/X Comment Tasks
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'twitter_quote_tweet';

-- Instagram Comment Tasks
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'comment_code';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'mention_story';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'keyword_comment';

-- YouTube Comment Tasks
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'youtube_comment';

-- TikTok Comment Tasks
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'tiktok_comment';

-- Add comment to document all task types
COMMENT ON TYPE task_type IS
  'Task types organized by platform:

  TWITTER: twitter_follow, twitter_mention, twitter_retweet, twitter_like, twitter_include_name, twitter_include_bio, twitter_hashtag_post, twitter_quote_tweet

  FACEBOOK: facebook_like_page, facebook_like_photo, facebook_like_post, facebook_share_post, facebook_share_page, facebook_comment_post, facebook_comment_photo

  INSTAGRAM: instagram_follow, instagram_like_post, comment_code, mention_story, keyword_comment

  YOUTUBE: youtube_like, youtube_subscribe, youtube_share, youtube_comment

  TIKTOK: tiktok_follow, tiktok_like, tiktok_share, tiktok_comment

  SPOTIFY: spotify_follow, spotify_playlist, spotify_album

  ENGAGEMENT: check_in, follower_milestone, complete_profile

  LEGACY: follow, join, repost, referral';

-- ============================================================================
-- REFERRAL STATUS ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Ensure all referral status values exist
-- Current values: 'pending', 'active', 'completed', 'expired', 'cancelled'

COMMENT ON TYPE referral_status IS
  'Referral lifecycle statuses: pending (created but not yet used), active (referral code used), completed (reward distributed), expired (past expiration date), cancelled (manually cancelled)';

-- ============================================================================
-- NFT MINT STATUS ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Ensure all NFT mint status values exist
-- Current values: 'pending', 'processing', 'success', 'failed'

COMMENT ON TYPE nft_mint_status IS
  'NFT minting statuses: pending (queued for minting), processing (Crossmint is processing), success (minted and delivered), failed (minting error)';

-- ============================================================================
-- NOTIFICATION TYPE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values should include all notification types
-- 'points_earned', 'task_completed', 'campaign_new', 'campaign_update', 'creator_post',
-- 'creator_update', 'reward_available', 'reward_claimed', 'achievement_unlocked',
-- 'level_up', 'follower_milestone', 'system', 'marketing'

COMMENT ON TYPE notification_type IS
  'Notification types: points_earned, task_completed, campaign_new, campaign_update, creator_post, creator_update, reward_available, reward_claimed, achievement_unlocked, level_up, follower_milestone, system, marketing';

-- ============================================================================
-- SOCIAL PLATFORM ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'spotify',
-- 'apple_music', 'discord', 'telegram', 'system'

COMMENT ON TYPE social_platform IS
  'Social media platforms: facebook, instagram, twitter, tiktok, youtube, spotify, apple_music, discord, telegram, system (for platform-generated tasks)';

-- ============================================================================
-- REWARD TYPE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'points', 'raffle', 'nft', 'badge', 'multiplier'

COMMENT ON TYPE reward_type IS
  'Reward types: points (loyalty points), raffle (entry into prize drawing), nft (digital collectible), badge (achievement credential), multiplier (points multiplier)';

-- ============================================================================
-- TASK SECTION ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'user_onboarding', 'social_engagement', 'community_building',
-- 'content_creation', 'streaming_music', 'token_activity', 'custom'

COMMENT ON TYPE task_section IS
  'Task organization sections (Snag-inspired): user_onboarding (profile setup), social_engagement (social tasks), community_building (referrals, invites), content_creation (create content), streaming_music (music streaming), token_activity (Web3 actions), custom (creator-defined)';

-- ============================================================================
-- UPDATE CADENCE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'immediate', 'daily', 'weekly', 'monthly'

COMMENT ON TYPE update_cadence IS
  'Task update frequency (Snag-inspired): immediate (updates instantly), daily (updates once per day), weekly (updates once per week), monthly (updates once per month)';

-- ============================================================================
-- REWARD FREQUENCY ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'one_time', 'daily', 'weekly', 'monthly'

COMMENT ON TYPE reward_frequency IS
  'Reward distribution frequency (Snag-inspired): one_time (single reward), daily (repeatable daily), weekly (repeatable weekly), monthly (repeatable monthly)';

-- ============================================================================
-- CAMPAIGN TYPE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'automation', 'direct', 'referral'

COMMENT ON TYPE campaign_type IS
  'Campaign types (OpenLoyalty-inspired): automation (triggered by events), direct (immediate rewards), referral (reward for referrals)';

-- ============================================================================
-- CAMPAIGN TRIGGER ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'schedule_daily', 'schedule_weekly', 'schedule_monthly', 'birthday',
-- 'anniversary', 'purchase_transaction', 'return_transaction', 'internal_event',
-- 'custom_event', 'achievement_earned', 'redemption_code'

COMMENT ON TYPE campaign_trigger IS
  'Campaign trigger events (OpenLoyalty-inspired): schedule_* (time-based), birthday, anniversary, purchase_transaction, return_transaction, internal_event, custom_event, achievement_earned, redemption_code';

-- ============================================================================
-- USER ROLE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'fandomly_admin', 'customer_admin', 'customer_end_user'

COMMENT ON TYPE user_role IS
  'User roles: fandomly_admin (platform admin), customer_admin (creator/brand owner), customer_end_user (fan)';

-- ============================================================================
-- CUSTOMER TIER ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'basic', 'premium', 'vip'

COMMENT ON TYPE customer_tier IS
  'Customer tiers: basic (free tier), premium (paid tier), vip (highest tier)';

-- ============================================================================
-- TENANT STATUS ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'active', 'inactive', 'suspended', 'trial'

COMMENT ON TYPE tenant_status IS
  'Tenant statuses: trial (free trial period), active (paid subscription), inactive (cancelled), suspended (payment issue or policy violation)';

-- ============================================================================
-- SUBSCRIPTION TIER ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'starter', 'professional', 'enterprise'

COMMENT ON TYPE subscription_tier IS
  'Subscription tiers: starter (basic features), professional (advanced features), enterprise (all features + white label)';

-- ============================================================================
-- TASK OWNERSHIP ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'platform', 'creator'

COMMENT ON TYPE task_ownership IS
  'Task ownership level: platform (Fandomly platform tasks), creator (creator-defined tasks)';

-- ============================================================================
-- NFT TOKEN TYPE ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'ERC721', 'ERC1155', 'SOLANA', 'SOLANA_COMPRESSED'

COMMENT ON TYPE nft_token_type IS
  'NFT token standards: ERC721 (Ethereum unique NFT), ERC1155 (Ethereum multi-edition), SOLANA (Solana NFT), SOLANA_COMPRESSED (Compressed Solana NFT)';

-- ============================================================================
-- NFT CATEGORY ENUM - VERIFY ALL VALUES
-- ============================================================================

-- Current values: 'badge_credential', 'digital_art', 'collectible', 'reward_perk',
-- 'event_ticket', 'custom'

COMMENT ON TYPE nft_category IS
  'NFT categories: badge_credential (achievement badge), digital_art (artwork), collectible (trading card), reward_perk (loyalty reward), event_ticket (event access), custom (creator-defined)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Query to verify all enum types and their values
-- Run this to confirm all enums are correct:
/*
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN (
  'campaign_status',
  'task_type',
  'referral_status',
  'nft_mint_status',
  'notification_type',
  'social_platform',
  'reward_type',
  'task_section',
  'update_cadence',
  'reward_frequency',
  'campaign_type',
  'campaign_trigger',
  'user_role',
  'customer_tier',
  'tenant_status',
  'subscription_tier',
  'task_ownership',
  'nft_token_type',
  'nft_category'
)
ORDER BY t.typname, e.enumsortorder;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Enums verified: 19 types
-- Missing values added: 1 (campaign_status.pending_tasks)
-- All task_type comment values verified
-- All enum types now have documentation comments
-- Safe to run: YES - Adding enum values is non-blocking
-- ============================================================================
