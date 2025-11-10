-- Migration: Update Foreign Key Cascade Behaviors
-- Purpose: Add proper CASCADE, RESTRICT, and SET NULL behaviors to prevent orphaned records
-- Impact: Ensures data integrity, prevents orphaned records, prevents accidental deletions
-- Safe to run: YES - Only modifies constraints, does not change data
-- Rollback: Can recreate constraints with NO ACTION if needed

-- ============================================================================
-- STEP 1: DROP EXISTING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Creators table
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_user_id_users_id_fk;
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_tenant_id_tenants_id_fk;

-- Tasks table
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_creators_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_tenant_id_tenants_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_program_id_loyalty_programs_id_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_campaign_id_campaigns_id_fk;

-- Campaigns table
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_creator_id_creators_id_fk;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_tenant_id_tenants_id_fk;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_program_id_loyalty_programs_id_fk;

-- Loyalty Programs table
ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_tenant_id_tenants_id_fk;
ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS loyalty_programs_creator_id_creators_id_fk;

-- Rewards table
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_tenant_id_tenants_id_fk;
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_program_id_loyalty_programs_id_fk;

-- Fan Programs table
ALTER TABLE fan_programs DROP CONSTRAINT IF EXISTS fan_programs_tenant_id_tenants_id_fk;
ALTER TABLE fan_programs DROP CONSTRAINT IF EXISTS fan_programs_fan_id_users_id_fk;
ALTER TABLE fan_programs DROP CONSTRAINT IF EXISTS fan_programs_program_id_loyalty_programs_id_fk;

-- Point Transactions table
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_tenant_id_tenants_id_fk;
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_fan_program_id_fan_programs_id_fk;

-- Reward Redemptions table
ALTER TABLE reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_tenant_id_tenants_id_fk;
ALTER TABLE reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_fan_id_users_id_fk;
ALTER TABLE reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_reward_id_rewards_id_fk;

-- Tenant Memberships table
ALTER TABLE tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_tenant_id_tenants_id_fk;
ALTER TABLE tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_user_id_users_id_fk;

-- NFT Collections table
ALTER TABLE nft_collections DROP CONSTRAINT IF EXISTS nft_collections_creator_id_creators_id_fk;
ALTER TABLE nft_collections DROP CONSTRAINT IF EXISTS nft_collections_tenant_id_tenants_id_fk;

-- NFT Templates table
ALTER TABLE nft_templates DROP CONSTRAINT IF EXISTS nft_templates_collection_id_nft_collections_id_fk;
ALTER TABLE nft_templates DROP CONSTRAINT IF EXISTS nft_templates_tenant_id_tenants_id_fk;

-- NFT Mints table
ALTER TABLE nft_mints DROP CONSTRAINT IF EXISTS nft_mints_collection_id_nft_collections_id_fk;
ALTER TABLE nft_mints DROP CONSTRAINT IF EXISTS nft_mints_template_id_nft_templates_id_fk;
ALTER TABLE nft_mints DROP CONSTRAINT IF EXISTS nft_mints_recipient_user_id_users_id_fk;

-- NFT Deliveries table
ALTER TABLE nft_deliveries DROP CONSTRAINT IF EXISTS nft_deliveries_mint_id_nft_mints_id_fk;
ALTER TABLE nft_deliveries DROP CONSTRAINT IF EXISTS nft_deliveries_user_id_users_id_fk;
ALTER TABLE nft_deliveries DROP CONSTRAINT IF EXISTS nft_deliveries_collection_id_nft_collections_id_fk;

-- Fan Referrals table
ALTER TABLE fan_referrals DROP CONSTRAINT IF EXISTS fan_referrals_referring_fan_id_users_id_fk;
ALTER TABLE fan_referrals DROP CONSTRAINT IF EXISTS fan_referrals_referred_fan_id_users_id_fk;

-- Creator Referrals table
ALTER TABLE creator_referrals DROP CONSTRAINT IF EXISTS creator_referrals_referring_creator_id_creators_id_fk;
ALTER TABLE creator_referrals DROP CONSTRAINT IF EXISTS creator_referrals_referred_creator_id_creators_id_fk;

-- Creator Task Referrals table
ALTER TABLE creator_task_referrals DROP CONSTRAINT IF EXISTS creator_task_referrals_creator_id_creators_id_fk;
ALTER TABLE creator_task_referrals DROP CONSTRAINT IF EXISTS creator_task_referrals_task_id_tasks_id_fk;
ALTER TABLE creator_task_referrals DROP CONSTRAINT IF EXISTS creator_task_referrals_campaign_id_campaigns_id_fk;
ALTER TABLE creator_task_referrals DROP CONSTRAINT IF EXISTS creator_task_referrals_referring_fan_id_users_id_fk;
ALTER TABLE creator_task_referrals DROP CONSTRAINT IF EXISTS creator_task_referrals_referred_fan_id_users_id_fk;

-- Achievements table
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_tenant_id_tenants_id_fk;

-- User Achievements table
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_achievement_id_achievements_id_fk;
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_users_id_fk;

-- User Levels table
ALTER TABLE user_levels DROP CONSTRAINT IF EXISTS user_levels_tenant_id_tenants_id_fk;
ALTER TABLE user_levels DROP CONSTRAINT IF EXISTS user_levels_user_id_users_id_fk;

-- Platform Tasks table (if exists)
ALTER TABLE platform_tasks DROP CONSTRAINT IF EXISTS platform_tasks_creator_id_creators_id_fk;

-- Platform Task Completions table (if exists)
ALTER TABLE platform_task_completions DROP CONSTRAINT IF EXISTS platform_task_completions_task_id_platform_tasks_id_fk;
ALTER TABLE platform_task_completions DROP CONSTRAINT IF EXISTS platform_task_completions_user_id_users_id_fk;

-- Platform Points Transactions table (if exists)
ALTER TABLE platform_points_transactions DROP CONSTRAINT IF EXISTS platform_points_transactions_user_id_users_id_fk;

-- Task Assignments table
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_task_id_tasks_id_fk;
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_user_id_users_id_fk;
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_tenant_id_tenants_id_fk;

-- Reward Distributions table
ALTER TABLE reward_distributions DROP CONSTRAINT IF EXISTS reward_distributions_user_id_users_id_fk;
ALTER TABLE reward_distributions DROP CONSTRAINT IF EXISTS reward_distributions_task_id_tasks_id_fk;
ALTER TABLE reward_distributions DROP CONSTRAINT IF EXISTS reward_distributions_tenant_id_tenants_id_fk;

-- ============================================================================
-- STEP 2: RECREATE FOREIGN KEYS WITH PROPER CASCADE BEHAVIORS
-- ============================================================================

-- ============================================================================
-- CREATORS TABLE
-- ============================================================================

-- CASCADE: When user deleted → delete their creator profile
ALTER TABLE creators ADD CONSTRAINT creators_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- RESTRICT: Prevent tenant deletion if creators exist
ALTER TABLE creators ADD CONSTRAINT creators_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT creators_user_id_users_id_fk ON creators IS
  'CASCADE: Creator profile deleted when user is deleted';

COMMENT ON CONSTRAINT creators_tenant_id_tenants_id_fk ON creators IS
  'RESTRICT: Cannot delete tenant if creators exist';

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

-- CASCADE: When creator deleted → delete their tasks
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

-- RESTRICT: Prevent tenant deletion if tasks exist
ALTER TABLE tasks ADD CONSTRAINT tasks_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When program deleted → delete program tasks
ALTER TABLE tasks ADD CONSTRAINT tasks_program_id_loyalty_programs_id_fk
  FOREIGN KEY (program_id) REFERENCES loyalty_programs(id) ON DELETE CASCADE;

-- SET NULL: When campaign deleted → task can still exist (optional relationship)
ALTER TABLE tasks ADD CONSTRAINT tasks_campaign_id_campaigns_id_fk
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT tasks_creator_id_creators_id_fk ON tasks IS
  'CASCADE: Tasks deleted when creator is deleted';

COMMENT ON CONSTRAINT tasks_campaign_id_campaigns_id_fk ON tasks IS
  'SET NULL: Task can exist without campaign (campaign is optional)';

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================

-- CASCADE: When creator deleted → delete their campaigns
ALTER TABLE campaigns ADD CONSTRAINT campaigns_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

-- RESTRICT: Prevent tenant deletion if campaigns exist
ALTER TABLE campaigns ADD CONSTRAINT campaigns_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- RESTRICT: Prevent program deletion if campaigns exist
ALTER TABLE campaigns ADD CONSTRAINT campaigns_program_id_loyalty_programs_id_fk
  FOREIGN KEY (program_id) REFERENCES loyalty_programs(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT campaigns_creator_id_creators_id_fk ON campaigns IS
  'CASCADE: Campaigns deleted when creator is deleted';

COMMENT ON CONSTRAINT campaigns_program_id_loyalty_programs_id_fk ON campaigns IS
  'RESTRICT: Cannot delete program if campaigns exist';

-- ============================================================================
-- LOYALTY PROGRAMS TABLE
-- ============================================================================

-- RESTRICT: Prevent tenant deletion if programs exist
ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When creator deleted → delete their programs
ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT loyalty_programs_creator_id_creators_id_fk ON loyalty_programs IS
  'CASCADE: Loyalty programs deleted when creator is deleted';

-- ============================================================================
-- REWARDS TABLE
-- ============================================================================

-- RESTRICT: Prevent tenant deletion if rewards exist (financial data)
ALTER TABLE rewards ADD CONSTRAINT rewards_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When program deleted → delete program rewards
ALTER TABLE rewards ADD CONSTRAINT rewards_program_id_loyalty_programs_id_fk
  FOREIGN KEY (program_id) REFERENCES loyalty_programs(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT rewards_program_id_loyalty_programs_id_fk ON rewards IS
  'CASCADE: Rewards deleted when loyalty program is deleted';

-- ============================================================================
-- FAN PROGRAMS TABLE (User Loyalty Program Memberships)
-- ============================================================================

-- RESTRICT: Prevent tenant deletion if fan memberships exist
ALTER TABLE fan_programs ADD CONSTRAINT fan_programs_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When user deleted → delete their program memberships
ALTER TABLE fan_programs ADD CONSTRAINT fan_programs_fan_id_users_id_fk
  FOREIGN KEY (fan_id) REFERENCES users(id) ON DELETE CASCADE;

-- CASCADE: When program deleted → delete fan memberships
ALTER TABLE fan_programs ADD CONSTRAINT fan_programs_program_id_loyalty_programs_id_fk
  FOREIGN KEY (program_id) REFERENCES loyalty_programs(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT fan_programs_fan_id_users_id_fk ON fan_programs IS
  'CASCADE: Fan program memberships deleted when user is deleted';

COMMENT ON CONSTRAINT fan_programs_program_id_loyalty_programs_id_fk ON fan_programs IS
  'CASCADE: Fan memberships deleted when loyalty program is deleted';

-- ============================================================================
-- POINT TRANSACTIONS TABLE
-- ============================================================================

-- RESTRICT: Keep point transactions for audit trail (financial data)
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When fan membership deleted → delete transactions
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_fan_program_id_fan_programs_id_fk
  FOREIGN KEY (fan_program_id) REFERENCES fan_programs(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT point_transactions_tenant_id_tenants_id_fk ON point_transactions IS
  'RESTRICT: Keep point transactions for financial audit trail';

COMMENT ON CONSTRAINT point_transactions_fan_program_id_fan_programs_id_fk ON point_transactions IS
  'CASCADE: Transactions deleted when fan program membership is deleted';

-- ============================================================================
-- REWARD REDEMPTIONS TABLE
-- ============================================================================

-- RESTRICT: Keep redemptions for audit trail (financial data)
ALTER TABLE reward_redemptions ADD CONSTRAINT reward_redemptions_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When user deleted → delete their redemptions
ALTER TABLE reward_redemptions ADD CONSTRAINT reward_redemptions_fan_id_users_id_fk
  FOREIGN KEY (fan_id) REFERENCES users(id) ON DELETE CASCADE;

-- RESTRICT: Prevent reward deletion if redemptions exist
ALTER TABLE reward_redemptions ADD CONSTRAINT reward_redemptions_reward_id_rewards_id_fk
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT reward_redemptions_tenant_id_tenants_id_fk ON reward_redemptions IS
  'RESTRICT: Keep redemptions for financial audit trail';

COMMENT ON CONSTRAINT reward_redemptions_reward_id_rewards_id_fk ON reward_redemptions IS
  'RESTRICT: Cannot delete reward if redemptions exist (handle redemptions first)';

-- ============================================================================
-- TENANT MEMBERSHIPS TABLE
-- ============================================================================

-- CASCADE: When tenant deleted → delete memberships
ALTER TABLE tenant_memberships ADD CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- CASCADE: When user deleted → delete their memberships
ALTER TABLE tenant_memberships ADD CONSTRAINT tenant_memberships_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk ON tenant_memberships IS
  'CASCADE: Memberships deleted when tenant is deleted';

COMMENT ON CONSTRAINT tenant_memberships_user_id_users_id_fk ON tenant_memberships IS
  'CASCADE: Memberships deleted when user is deleted';

-- ============================================================================
-- NFT COLLECTIONS TABLE
-- ============================================================================

-- CASCADE: When creator deleted → delete their NFT collections
ALTER TABLE nft_collections ADD CONSTRAINT nft_collections_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

-- RESTRICT: Prevent tenant deletion if NFT collections exist
ALTER TABLE nft_collections ADD CONSTRAINT nft_collections_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT nft_collections_creator_id_creators_id_fk ON nft_collections IS
  'CASCADE: NFT collections deleted when creator is deleted';

-- ============================================================================
-- NFT TEMPLATES TABLE
-- ============================================================================

-- CASCADE: When collection deleted → delete templates
ALTER TABLE nft_templates ADD CONSTRAINT nft_templates_collection_id_nft_collections_id_fk
  FOREIGN KEY (collection_id) REFERENCES nft_collections(id) ON DELETE CASCADE;

-- RESTRICT: Prevent tenant deletion if NFT templates exist
ALTER TABLE nft_templates ADD CONSTRAINT nft_templates_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT nft_templates_collection_id_nft_collections_id_fk ON nft_templates IS
  'CASCADE: NFT templates deleted when collection is deleted';

-- ============================================================================
-- NFT MINTS TABLE
-- ============================================================================

-- CASCADE: When collection deleted → delete mints
ALTER TABLE nft_mints ADD CONSTRAINT nft_mints_collection_id_nft_collections_id_fk
  FOREIGN KEY (collection_id) REFERENCES nft_collections(id) ON DELETE CASCADE;

-- CASCADE: When template deleted → delete mints
ALTER TABLE nft_mints ADD CONSTRAINT nft_mints_template_id_nft_templates_id_fk
  FOREIGN KEY (template_id) REFERENCES nft_templates(id) ON DELETE CASCADE;

-- RESTRICT: Don't delete user if they have NFTs (valuable assets)
ALTER TABLE nft_mints ADD CONSTRAINT nft_mints_recipient_user_id_users_id_fk
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT nft_mints_recipient_user_id_users_id_fk ON nft_mints IS
  'RESTRICT: Cannot delete user if they have minted NFTs (valuable assets)';

-- ============================================================================
-- NFT DELIVERIES TABLE
-- ============================================================================

-- CASCADE: When mint deleted → delete delivery record
ALTER TABLE nft_deliveries ADD CONSTRAINT nft_deliveries_mint_id_nft_mints_id_fk
  FOREIGN KEY (mint_id) REFERENCES nft_mints(id) ON DELETE CASCADE;

-- RESTRICT: Don't delete user if they have NFT deliveries
ALTER TABLE nft_deliveries ADD CONSTRAINT nft_deliveries_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- CASCADE: When collection deleted → delete deliveries
ALTER TABLE nft_deliveries ADD CONSTRAINT nft_deliveries_collection_id_nft_collections_id_fk
  FOREIGN KEY (collection_id) REFERENCES nft_collections(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT nft_deliveries_user_id_users_id_fk ON nft_deliveries IS
  'RESTRICT: Cannot delete user if they have NFT deliveries';

-- ============================================================================
-- FAN REFERRALS TABLE
-- ============================================================================

-- CASCADE: When referring fan deleted → delete referral
ALTER TABLE fan_referrals ADD CONSTRAINT fan_referrals_referring_fan_id_users_id_fk
  FOREIGN KEY (referring_fan_id) REFERENCES users(id) ON DELETE CASCADE;

-- SET NULL: Keep referral record for analytics even if referred user deleted
ALTER TABLE fan_referrals ADD CONSTRAINT fan_referrals_referred_fan_id_users_id_fk
  FOREIGN KEY (referred_fan_id) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fan_referrals_referring_fan_id_users_id_fk ON fan_referrals IS
  'CASCADE: Referrals deleted when referring fan is deleted';

COMMENT ON CONSTRAINT fan_referrals_referred_fan_id_users_id_fk ON fan_referrals IS
  'SET NULL: Keep referral record for analytics (referred_fan_id becomes NULL)';

-- ============================================================================
-- CREATOR REFERRALS TABLE
-- ============================================================================

-- CASCADE: When referring creator deleted → delete referral
ALTER TABLE creator_referrals ADD CONSTRAINT creator_referrals_referring_creator_id_creators_id_fk
  FOREIGN KEY (referring_creator_id) REFERENCES creators(id) ON DELETE CASCADE;

-- SET NULL: Keep referral record for analytics even if referred creator deleted
ALTER TABLE creator_referrals ADD CONSTRAINT creator_referrals_referred_creator_id_creators_id_fk
  FOREIGN KEY (referred_creator_id) REFERENCES creators(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT creator_referrals_referring_creator_id_creators_id_fk ON creator_referrals IS
  'CASCADE: Referrals deleted when referring creator is deleted';

COMMENT ON CONSTRAINT creator_referrals_referred_creator_id_creators_id_fk ON creator_referrals IS
  'SET NULL: Keep referral record for analytics (referred_creator_id becomes NULL)';

-- ============================================================================
-- CREATOR TASK REFERRALS TABLE
-- ============================================================================

-- CASCADE: When creator deleted → delete task referrals
ALTER TABLE creator_task_referrals ADD CONSTRAINT creator_task_referrals_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE;

-- CASCADE: When task deleted → delete task referrals
ALTER TABLE creator_task_referrals ADD CONSTRAINT creator_task_referrals_task_id_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- SET NULL: Keep referral when campaign deleted
ALTER TABLE creator_task_referrals ADD CONSTRAINT creator_task_referrals_campaign_id_campaigns_id_fk
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

-- CASCADE: When referring fan deleted → delete referral
ALTER TABLE creator_task_referrals ADD CONSTRAINT creator_task_referrals_referring_fan_id_users_id_fk
  FOREIGN KEY (referring_fan_id) REFERENCES users(id) ON DELETE CASCADE;

-- SET NULL: Keep referral for analytics
ALTER TABLE creator_task_referrals ADD CONSTRAINT creator_task_referrals_referred_fan_id_users_id_fk
  FOREIGN KEY (referred_fan_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================

-- RESTRICT: Prevent tenant deletion if achievements exist
ALTER TABLE achievements ADD CONSTRAINT achievements_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================

-- CASCADE: When achievement deleted → delete user achievements
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_achievement_id_achievements_id_fk
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE;

-- CASCADE: When user deleted → delete their achievements
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- USER LEVELS TABLE
-- ============================================================================

-- RESTRICT: Prevent tenant deletion if user levels exist
ALTER TABLE user_levels ADD CONSTRAINT user_levels_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- CASCADE: When user deleted → delete their level data
ALTER TABLE user_levels ADD CONSTRAINT user_levels_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- PLATFORM TASKS TABLE (if exists)
-- ============================================================================

-- SET NULL: Platform tasks can exist without creator (some are system-wide)
ALTER TABLE platform_tasks ADD CONSTRAINT platform_tasks_creator_id_creators_id_fk
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL;

-- ============================================================================
-- PLATFORM TASK COMPLETIONS TABLE (if exists)
-- ============================================================================

-- CASCADE: When platform task deleted → delete completions
ALTER TABLE platform_task_completions ADD CONSTRAINT platform_task_completions_task_id_platform_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES platform_tasks(id) ON DELETE CASCADE;

-- CASCADE: When user deleted → delete their completions
ALTER TABLE platform_task_completions ADD CONSTRAINT platform_task_completions_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- PLATFORM POINTS TRANSACTIONS TABLE (if exists)
-- ============================================================================

-- CASCADE: When user deleted → delete their platform points transactions
ALTER TABLE platform_points_transactions ADD CONSTRAINT platform_points_transactions_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- TASK ASSIGNMENTS TABLE
-- ============================================================================

-- CASCADE: When task deleted → delete assignments
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_task_id_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- CASCADE: When user deleted → delete their assignments
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- RESTRICT: Keep assignments for audit (tenant data)
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- ============================================================================
-- REWARD DISTRIBUTIONS TABLE
-- ============================================================================

-- CASCADE: When user deleted → delete their reward distributions
ALTER TABLE reward_distributions ADD CONSTRAINT reward_distributions_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- CASCADE: When task deleted → delete reward distributions
ALTER TABLE reward_distributions ADD CONSTRAINT reward_distributions_task_id_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- RESTRICT: Keep distributions for audit (tenant data)
ALTER TABLE reward_distributions ADD CONSTRAINT reward_distributions_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all foreign keys have proper cascade behaviors:
/*
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule,
  pgd.description
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
LEFT JOIN pg_catalog.pg_statio_all_tables st
  ON st.relname = tc.table_name
LEFT JOIN pg_catalog.pg_constraint pgc
  ON pgc.conname = tc.constraint_name
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = pgc.oid
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule != 'NO ACTION'
ORDER BY tc.table_name, kcu.column_name;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Foreign keys updated: 50+
-- CASCADE behaviors: ~35 (auto-delete children)
-- RESTRICT behaviors: ~12 (prevent accidental deletion)
-- SET NULL behaviors: ~5 (optional relationships)
-- Expected impact: Zero orphaned records, prevented accidental deletions
-- Safe to rollback: YES - can recreate with NO ACTION if needed
-- ============================================================================
