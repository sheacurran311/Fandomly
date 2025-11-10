-- Migration: Add Timestamp Auto-Update Triggers
-- Purpose: Automatically update updated_at column when records are modified
-- Impact: Maintains accurate change tracking without manual intervention
-- Safe to run: YES - Only adds triggers, doesn't modify data

-- ============================================================================
-- CREATE TRIGGER FUNCTION
-- ============================================================================

-- This function will be called by triggers to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS
  'Trigger function to automatically update updated_at column on row modification';

-- ============================================================================
-- CREATE TRIGGERS FOR ALL TABLES WITH updated_at
-- ============================================================================

-- Core Entity Tables

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Agency Tables

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_tenants_updated_at
  BEFORE UPDATE ON agency_tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Loyalty Program Tables

CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fan_programs_updated_at
  BEFORE UPDATE ON fan_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_point_transactions_updated_at
  BEFORE UPDATE ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_redemptions_updated_at
  BEFORE UPDATE ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Campaign Tables

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_rules_updated_at
  BEFORE UPDATE ON campaign_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_participations_updated_at
  BEFORE UPDATE ON campaign_participations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Task Tables

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_completions_updated_at
  BEFORE UPDATE ON task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Social Connection Tables

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_facebook_pages_updated_at
  BEFORE UPDATE ON creator_facebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_campaign_tasks_updated_at
  BEFORE UPDATE ON social_campaign_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notification Table

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- NFT Tables

CREATE TRIGGER update_nft_collections_updated_at
  BEFORE UPDATE ON nft_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nft_templates_updated_at
  BEFORE UPDATE ON nft_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nft_mints_updated_at
  BEFORE UPDATE ON nft_mints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nft_deliveries_updated_at
  BEFORE UPDATE ON nft_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Referral Tables

CREATE TRIGGER update_fan_referrals_updated_at
  BEFORE UPDATE ON fan_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_referrals_updated_at
  BEFORE UPDATE ON creator_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_task_referrals_updated_at
  BEFORE UPDATE ON creator_task_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Achievement Tables

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Platform Task Tables (if exist)

CREATE TRIGGER update_platform_tasks_updated_at
  BEFORE UPDATE ON platform_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_task_completions_updated_at
  BEFORE UPDATE ON platform_task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_points_transactions_updated_at
  BEFORE UPDATE ON platform_points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Reward Distribution Table

CREATE TRIGGER update_reward_distributions_updated_at
  BEFORE UPDATE ON reward_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OPTIMIZATION: Conditional Trigger Execution
-- ============================================================================

-- For high-traffic tables, we can optimize triggers to only fire when data actually changes
-- This prevents unnecessary timestamp updates when the same data is re-saved

CREATE OR REPLACE FUNCTION update_updated_at_column_if_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if actual data changed (not just timestamp columns)
  IF NEW IS DISTINCT FROM OLD THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column_if_changed IS
  'Optimized trigger function that only updates updated_at when actual data changes';

-- Example: Replace trigger on high-traffic tables
-- Uncomment these if you want the optimization for specific tables

/*
DROP TRIGGER IF EXISTS update_task_completions_updated_at ON task_completions;
CREATE TRIGGER update_task_completions_updated_at
  BEFORE UPDATE ON task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_if_changed();

DROP TRIGGER IF EXISTS update_point_transactions_updated_at ON point_transactions;
CREATE TRIGGER update_point_transactions_updated_at
  BEFORE UPDATE ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_if_changed();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_if_changed();
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all triggers on updated_at columns
/*
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;
*/

-- Test that triggers work correctly
/*
-- Create a test user
INSERT INTO users (id, username, email) VALUES
  ('test-trigger-123', 'triggertest', 'trigger@test.com');

-- Check initial timestamps (should be equal)
SELECT created_at, updated_at FROM users WHERE id = 'test-trigger-123';

-- Wait a moment, then update
SELECT pg_sleep(1);
UPDATE users SET username = 'triggertest-updated' WHERE id = 'test-trigger-123';

-- Check that updated_at changed (should be > created_at)
SELECT
  created_at,
  updated_at,
  updated_at > created_at as trigger_worked
FROM users
WHERE id = 'test-trigger-123';
-- trigger_worked should be TRUE

-- Clean up
DELETE FROM users WHERE id = 'test-trigger-123';
*/

-- ============================================================================
-- DISABLE/ENABLE TRIGGERS (for bulk operations)
-- ============================================================================

-- Sometimes you may want to disable triggers for bulk imports/updates
-- Here are helper functions to manage triggers

CREATE OR REPLACE FUNCTION disable_updated_at_triggers()
RETURNS void AS $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE '%updated_at%'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I',
      trigger_record.event_object_table,
      trigger_record.trigger_name
    );
  END LOOP;

  RAISE NOTICE 'All updated_at triggers disabled';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enable_updated_at_triggers()
RETURNS void AS $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE '%updated_at%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I',
      trigger_record.event_object_table,
      trigger_record.trigger_name
    );
  END LOOP;

  RAISE NOTICE 'All updated_at triggers enabled';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION disable_updated_at_triggers IS
  'Disable all updated_at triggers (for bulk operations). Usage: SELECT disable_updated_at_triggers()';

COMMENT ON FUNCTION enable_updated_at_triggers IS
  'Re-enable all updated_at triggers after bulk operations. Usage: SELECT enable_updated_at_triggers()';

-- Usage example for bulk operations:
/*
-- Before bulk import/update
SELECT disable_updated_at_triggers();

-- Perform bulk operation
UPDATE users SET some_field = 'value' WHERE condition;

-- Re-enable triggers
SELECT enable_updated_at_triggers();
*/

-- ============================================================================
-- MONITORING: Recently Updated Records
-- ============================================================================

-- Helper views to find recently updated records across tables

CREATE OR REPLACE VIEW recently_updated_users AS
SELECT id, username, email, updated_at, updated_at - created_at as age
FROM users
WHERE updated_at > created_at
ORDER BY updated_at DESC
LIMIT 100;

CREATE OR REPLACE VIEW recently_updated_creators AS
SELECT id, display_name, updated_at, updated_at - created_at as age
FROM creators
WHERE updated_at > created_at
ORDER BY updated_at DESC
LIMIT 100;

CREATE OR REPLACE VIEW recently_updated_tasks AS
SELECT id, name, updated_at, updated_at - created_at as age
FROM tasks
WHERE updated_at > created_at
ORDER BY updated_at DESC
LIMIT 100;

COMMENT ON VIEW recently_updated_users IS
  'Shows the 100 most recently updated users (excludes newly created)';

COMMENT ON VIEW recently_updated_creators IS
  'Shows the 100 most recently updated creators (excludes newly created)';

COMMENT ON VIEW recently_updated_tasks IS
  'Shows the 100 most recently updated tasks (excludes newly created)';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Triggers created: 35+
-- Tables covered: All tables with updated_at column
-- Trigger function: update_updated_at_column()
-- Optimized function: update_updated_at_column_if_changed() (optional)
-- Helper functions: disable_updated_at_triggers(), enable_updated_at_triggers()
-- Helper views: recently_updated_* (3 views)
-- Expected impact: Automatic timestamp tracking, accurate change history
-- Safe to run: YES - Only creates triggers, doesn't modify data
-- Rollback: DROP TRIGGER <trigger_name> ON <table_name>
-- ============================================================================
