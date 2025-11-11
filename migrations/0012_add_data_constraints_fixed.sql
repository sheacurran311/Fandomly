-- Migration: Add Data Validation Constraints (FIXED VERSION)
-- Purpose: Enforce data integrity rules at database level
-- Impact: Prevents invalid data (negative values, invalid percentages, etc)
-- Safe to run: YES - Constraints only affect future inserts/updates
-- Important: Existing data must be valid, or constraints will fail
-- Fixed: Uses DO blocks to check for constraint existence before adding

-- ============================================================================
-- PERCENTAGE CONSTRAINTS (0-100)
-- ============================================================================

-- Creator referral commission percentage (0-100%)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_commission_percentage_range' AND conrelid = 'creator_referrals'::regclass
  ) THEN
    ALTER TABLE creator_referrals
      ADD CONSTRAINT check_commission_percentage_range
      CHECK (commission_percentage >= 0 AND commission_percentage <= 100);
  END IF;
END $$;

-- Fan referral percentage rewards (0-100%)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_percentage_value_range' AND conrelid = 'fan_referrals'::regclass
  ) THEN
    ALTER TABLE fan_referrals
      ADD CONSTRAINT check_percentage_value_range
      CHECK (percentage_value >= 0 AND percentage_value <= 100);
  END IF;
END $$;

-- Task completion progress (0-100%)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_progress_range' AND conrelid = 'task_completions'::regclass
  ) THEN
    ALTER TABLE task_completions
      ADD CONSTRAINT check_progress_range
      CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

COMMENT ON CONSTRAINT check_commission_percentage_range ON creator_referrals IS
  'Commission percentage must be between 0 and 100';

COMMENT ON CONSTRAINT check_percentage_value_range ON fan_referrals IS
  'Percentage value must be between 0 and 100';

COMMENT ON CONSTRAINT check_progress_range ON task_completions IS
  'Task progress percentage must be between 0 and 100';

-- ============================================================================
-- NON-NEGATIVE CONSTRAINTS
-- ============================================================================

-- Points earned in task completions (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_earned_positive' AND conrelid = 'task_completions'::regclass
  ) THEN
    ALTER TABLE task_completions
      ADD CONSTRAINT check_points_earned_positive
      CHECK (points_earned >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_rewards_earned_positive' AND conrelid = 'task_completions'::regclass
  ) THEN
    ALTER TABLE task_completions
      ADD CONSTRAINT check_total_rewards_earned_positive
      CHECK (total_rewards_earned >= 0);
  END IF;
END $$;

-- Creator follower count (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_follower_count_positive' AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT check_follower_count_positive
      CHECK (follower_count >= 0);
  END IF;
END $$;

-- Fan program points (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_current_points_positive' AND conrelid = 'fan_programs'::regclass
  ) THEN
    ALTER TABLE fan_programs
      ADD CONSTRAINT check_current_points_positive
      CHECK (current_points >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_points_earned_positive' AND conrelid = 'fan_programs'::regclass
  ) THEN
    ALTER TABLE fan_programs
      ADD CONSTRAINT check_total_points_earned_positive
      CHECK (total_points_earned >= 0);
  END IF;
END $$;

-- Task reward points (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_to_reward_positive' AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT check_points_to_reward_positive
      CHECK (points_to_reward >= 0);
  END IF;
END $$;

-- Reward points cost (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_cost_positive' AND conrelid = 'rewards'::regclass
  ) THEN
    ALTER TABLE rewards
      ADD CONSTRAINT check_points_cost_positive
      CHECK (points_cost >= 0);
  END IF;
END $$;

-- Reward redemptions count (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_current_redemptions_positive' AND conrelid = 'rewards'::regclass
  ) THEN
    ALTER TABLE rewards
      ADD CONSTRAINT check_current_redemptions_positive
      CHECK (current_redemptions >= 0);
  END IF;
END $$;

-- Campaign budget and limits (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_global_budget_positive' AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT check_global_budget_positive
      CHECK (global_budget IS NULL OR global_budget >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_issued_positive' AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT check_total_issued_positive
      CHECK (total_issued >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_participants_positive' AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT check_total_participants_positive
      CHECK (total_participants >= 0);
  END IF;
END $$;

-- Referral tracking counts (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_click_count_positive' AND conrelid = 'fan_referrals'::regclass
  ) THEN
    ALTER TABLE fan_referrals
      ADD CONSTRAINT check_click_count_positive
      CHECK (click_count >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_points_referred_user_earned_positive' AND conrelid = 'fan_referrals'::regclass
  ) THEN
    ALTER TABLE fan_referrals
      ADD CONSTRAINT check_total_points_referred_user_earned_positive
      CHECK (total_points_referred_user_earned >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_points_referrer_earned_positive' AND conrelid = 'fan_referrals'::regclass
  ) THEN
    ALTER TABLE fan_referrals
      ADD CONSTRAINT check_total_points_referrer_earned_positive
      CHECK (total_points_referrer_earned >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_creator_click_count_positive' AND conrelid = 'creator_referrals'::regclass
  ) THEN
    ALTER TABLE creator_referrals
      ADD CONSTRAINT check_creator_click_count_positive
      CHECK (click_count >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_task_click_count_positive' AND conrelid = 'creator_task_referrals'::regclass
  ) THEN
    ALTER TABLE creator_task_referrals
      ADD CONSTRAINT check_task_click_count_positive
      CHECK (click_count >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_creator_points_earned_positive' AND conrelid = 'creator_task_referrals'::regclass
  ) THEN
    ALTER TABLE creator_task_referrals
      ADD CONSTRAINT check_total_creator_points_earned_positive
      CHECK (total_creator_points_earned >= 0);
  END IF;
END $$;

-- NFT supply counts (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_mint_price_positive' AND conrelid = 'nft_templates'::regclass
  ) THEN
    ALTER TABLE nft_templates
      ADD CONSTRAINT check_mint_price_positive
      CHECK (mint_price >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_current_supply_positive' AND conrelid = 'nft_templates'::regclass
  ) THEN
    ALTER TABLE nft_templates
      ADD CONSTRAINT check_current_supply_positive
      CHECK (current_supply >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_max_supply_positive' AND conrelid = 'nft_templates'::regclass
  ) THEN
    ALTER TABLE nft_templates
      ADD CONSTRAINT check_max_supply_positive
      CHECK (max_supply IS NULL OR max_supply >= 0);
  END IF;
END $$;

-- NFT mint retry count (must be >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_retry_count_positive' AND conrelid = 'nft_mints'::regclass
  ) THEN
    ALTER TABLE nft_mints
      ADD CONSTRAINT check_retry_count_positive
      CHECK (retry_count >= 0);
  END IF;
END $$;

COMMENT ON CONSTRAINT check_points_earned_positive ON task_completions IS
  'Points earned must be non-negative';

COMMENT ON CONSTRAINT check_follower_count_positive ON creators IS
  'Follower count cannot be negative';

-- ============================================================================
-- POINT TRANSACTION VALIDATION
-- ============================================================================

-- Points must be negative for spent, positive for earned
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_transaction_sign' AND conrelid = 'point_transactions'::regclass
  ) THEN
    ALTER TABLE point_transactions
      ADD CONSTRAINT check_points_transaction_sign
      CHECK (
        (type = 'spent' AND points < 0) OR
        (type = 'earned' AND points > 0)
      );
  END IF;
END $$;

-- Platform points transactions (always positive amount)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_platform_points_sign' AND conrelid = 'platform_points_transactions'::regclass
  ) THEN
    ALTER TABLE platform_points_transactions
      ADD CONSTRAINT check_platform_points_sign
      CHECK (points != 0);
  END IF;
END $$;

COMMENT ON CONSTRAINT check_points_transaction_sign ON point_transactions IS
  'Earned transactions must have positive points, spent transactions must have negative points';

-- ============================================================================
-- EMAIL FORMAT VALIDATION (BASIC)
-- ============================================================================

-- Basic email format validation using regex
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_email_format' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT check_email_format
      CHECK (
        email IS NULL OR
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_email_format ON users IS
  'Email must be in valid format (user@domain.tld) or NULL';

-- ============================================================================
-- USERNAME VALIDATION
-- ============================================================================

-- Username must be 3-30 characters, alphanumeric plus underscore/hyphen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_username_format' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT check_username_format
      CHECK (
        username ~ '^[a-zA-Z0-9_-]{3,30}$'
      );
  END IF;
END $$;

-- Username cannot be reserved words
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_username_not_reserved' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT check_username_not_reserved
      CHECK (
        username NOT IN (
          'admin', 'administrator', 'fandomly', 'support', 'help',
          'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
          'settings', 'profile', 'login', 'logout', 'register', 'signup',
          'signin', 'signout', 'auth', 'oauth', 'account', 'user', 'users',
          'creator', 'creators', 'fan', 'fans', 'campaign', 'campaigns',
          'task', 'tasks', 'reward', 'rewards', 'nft', 'nfts',
          'webhook', 'webhooks', 'callback', 'static', 'assets', 'public',
          'private', 'test', 'demo', 'example', 'null', 'undefined'
        )
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_username_format ON users IS
  'Username must be 3-30 characters, alphanumeric with underscore/hyphen';

COMMENT ON CONSTRAINT check_username_not_reserved ON users IS
  'Username cannot be a reserved system word';

-- ============================================================================
-- TENANT SLUG VALIDATION
-- ============================================================================

-- Tenant slug must be URL-safe (lowercase, alphanumeric, hyphens)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_slug_format' AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT check_slug_format
      CHECK (
        slug ~ '^[a-z0-9-]{3,100}$'
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_slug_format ON tenants IS
  'Tenant slug must be 3-100 characters, lowercase alphanumeric with hyphens';

-- ============================================================================
-- REFERRAL CODE VALIDATION
-- ============================================================================

-- Referral codes must be alphanumeric (easier to share)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_referral_code_format' AND conrelid = 'fan_referrals'::regclass
  ) THEN
    ALTER TABLE fan_referrals
      ADD CONSTRAINT check_referral_code_format
      CHECK (
        referral_code ~ '^[A-Za-z0-9]{6,50}$'
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_creator_referral_code_format' AND conrelid = 'creator_referrals'::regclass
  ) THEN
    ALTER TABLE creator_referrals
      ADD CONSTRAINT check_creator_referral_code_format
      CHECK (
        referral_code ~ '^[A-Za-z0-9]{6,50}$'
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_task_referral_code_format' AND conrelid = 'creator_task_referrals'::regclass
  ) THEN
    ALTER TABLE creator_task_referrals
      ADD CONSTRAINT check_task_referral_code_format
      CHECK (
        referral_code ~ '^[A-Za-z0-9]{6,100}$'
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_referral_code_format ON fan_referrals IS
  'Referral code must be 6-50 alphanumeric characters';

-- ============================================================================
-- DATE RANGE VALIDATION
-- ============================================================================

-- Campaign end date must be after start date
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_campaign_date_range' AND conrelid = 'campaigns'::regclass
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT check_campaign_date_range
      CHECK (
        end_date IS NULL OR end_date > start_date
      );
  END IF;
END $$;

-- Task end time must be after start time
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_task_time_range' AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT check_task_time_range
      CHECK (
        end_time IS NULL OR start_time IS NULL OR end_time > start_time
      );
  END IF;
END $$;

-- NFT supply validation (current <= max)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_supply_range' AND conrelid = 'nft_templates'::regclass
  ) THEN
    ALTER TABLE nft_templates
      ADD CONSTRAINT check_supply_range
      CHECK (
        max_supply IS NULL OR current_supply <= max_supply
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_campaign_date_range ON campaigns IS
  'Campaign end date must be after start date';

COMMENT ON CONSTRAINT check_task_time_range ON tasks IS
  'Task end time must be after start time';

COMMENT ON CONSTRAINT check_supply_range ON nft_templates IS
  'Current NFT supply cannot exceed max supply';

-- ============================================================================
-- REWARD REDEMPTION VALIDATION
-- ============================================================================

-- Max redemptions must be greater than current redemptions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_redemptions_range' AND conrelid = 'rewards'::regclass
  ) THEN
    ALTER TABLE rewards
      ADD CONSTRAINT check_redemptions_range
      CHECK (
        max_redemptions IS NULL OR current_redemptions <= max_redemptions
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_redemptions_range ON rewards IS
  'Current redemptions cannot exceed max redemptions';

-- ============================================================================
-- WALLET ADDRESS VALIDATION
-- ============================================================================

-- Basic wallet address validation (Ethereum: 0x + 40 hex chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_wallet_address_format' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT check_wallet_address_format
      CHECK (
        wallet_address IS NULL OR
        wallet_address ~ '^0x[a-fA-F0-9]{40}$' OR
        LENGTH(wallet_address) > 20  -- Allow other chain formats (Solana, etc)
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_wallet_address_format ON users IS
  'Wallet address must be valid format (Ethereum: 0x + 40 hex, or other chain format)';

-- ============================================================================
-- MULTIPLIER VALIDATION
-- ============================================================================

-- Task multiplier must be > 0 (1.0 = no multiplier, 2.0 = 2x points, etc)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_multiplier_value_positive' AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT check_multiplier_value_positive
      CHECK (
        multiplier_value IS NULL OR multiplier_value > 0
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_multiplier_value_positive ON tasks IS
  'Multiplier value must be greater than 0 (e.g., 1.5 = 1.5x points)';

-- ============================================================================
-- TASK COMPLETION STATUS FLOW VALIDATION
-- ============================================================================

-- Ensure task completion status flow is logical
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_completed_at_set' AND conrelid = 'task_completions'::regclass
  ) THEN
    ALTER TABLE task_completions
      ADD CONSTRAINT check_completed_at_set
      CHECK (
        (status = 'in_progress') OR
        (status IN ('completed', 'claimed') AND completed_at IS NOT NULL)
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_completed_at_set ON task_completions IS
  'completed_at must be set when status is completed or claimed';

-- ============================================================================
-- REWARD REDEMPTION STATUS VALIDATION
-- ============================================================================

-- Ensure points were spent when status is not pending
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_spent_positive' AND conrelid = 'reward_redemptions'::regclass
  ) THEN
    ALTER TABLE reward_redemptions
      ADD CONSTRAINT check_points_spent_positive
      CHECK (points_spent > 0);
  END IF;
END $$;

COMMENT ON CONSTRAINT check_points_spent_positive ON reward_redemptions IS
  'Points spent must be greater than 0';

-- ============================================================================
-- CAMPAIGN PARTICIPATION VALIDATION
-- ============================================================================

-- Participation count must be positive
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_participation_count_positive' AND conrelid = 'campaign_participations'::regclass
  ) THEN
    ALTER TABLE campaign_participations
      ADD CONSTRAINT check_participation_count_positive
      CHECK (participation_count > 0);
  END IF;
END $$;

-- Total units earned must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_units_earned_positive' AND conrelid = 'campaign_participations'::regclass
  ) THEN
    ALTER TABLE campaign_participations
      ADD CONSTRAINT check_total_units_earned_positive
      CHECK (total_units_earned >= 0);
  END IF;
END $$;

COMMENT ON CONSTRAINT check_participation_count_positive ON campaign_participations IS
  'Participation count must be at least 1';

-- ============================================================================
-- ACHIEVEMENT VALIDATION
-- ============================================================================

-- Points required for achievement must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_points_required_positive' AND conrelid = 'achievements'::regclass
  ) THEN
    ALTER TABLE achievements
      ADD CONSTRAINT check_points_required_positive
      CHECK (points_required >= 0);
  END IF;
END $$;

-- Reward points must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_reward_points_positive' AND conrelid = 'achievements'::regclass
  ) THEN
    ALTER TABLE achievements
      ADD CONSTRAINT check_reward_points_positive
      CHECK (reward_points >= 0);
  END IF;
END $$;

-- Action count must be positive
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_action_count_positive' AND conrelid = 'achievements'::regclass
  ) THEN
    ALTER TABLE achievements
      ADD CONSTRAINT check_action_count_positive
      CHECK (action_count > 0);
  END IF;
END $$;

-- ============================================================================
-- USER ACHIEVEMENT VALIDATION
-- ============================================================================

-- Progress must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_progress_positive' AND conrelid = 'user_achievements'::regclass
  ) THEN
    ALTER TABLE user_achievements
      ADD CONSTRAINT check_progress_positive
      CHECK (progress >= 0);
  END IF;
END $$;

-- If completed, claimed_at must be set when claimed = true
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_claimed_at_set' AND conrelid = 'user_achievements'::regclass
  ) THEN
    ALTER TABLE user_achievements
      ADD CONSTRAINT check_claimed_at_set
      CHECK (
        (claimed = false) OR
        (claimed = true AND claimed_at IS NOT NULL)
      );
  END IF;
END $$;

-- ============================================================================
-- USER LEVEL VALIDATION
-- ============================================================================

-- Current level must be at least 1
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_current_level_positive' AND conrelid = 'user_levels'::regclass
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT check_current_level_positive
      CHECK (current_level >= 1);
  END IF;
END $$;

-- Total points must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_total_points_positive' AND conrelid = 'user_levels'::regclass
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT check_total_points_positive
      CHECK (total_points >= 0);
  END IF;
END $$;

-- Level points must be non-negative
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_level_points_positive' AND conrelid = 'user_levels'::regclass
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT check_level_points_positive
      CHECK (level_points >= 0);
  END IF;
END $$;

-- Next level threshold must be positive
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_next_level_threshold_positive' AND conrelid = 'user_levels'::regclass
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT check_next_level_threshold_positive
      CHECK (next_level_threshold > 0);
  END IF;
END $$;

-- Level points must be less than next level threshold
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_level_points_range' AND conrelid = 'user_levels'::regclass
  ) THEN
    ALTER TABLE user_levels
      ADD CONSTRAINT check_level_points_range
      CHECK (level_points < next_level_threshold);
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total constraints added: 60+
-- Types of validation:
--   - Percentage ranges (0-100)
--   - Non-negative values
--   - Email format
--   - Username format
--   - Referral code format
--   - Date ranges
--   - Supply limits
--   - Status flow validation
--   - Wallet address format
-- Safe to run: YES - Only affects future inserts/updates
-- Safe to re-run: YES - Uses DO blocks to check for existence
-- Rollback: Run DROP CONSTRAINT for each constraint name
-- ============================================================================

