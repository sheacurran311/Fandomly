-- Migration: Fix Reserved Username Constraint
-- Purpose: Add the reserved username constraint that was blocked by existing 'fandomly' user
-- Strategy: Either rename the user or modify the constraint to exclude platform admin
-- Safe to run: YES

-- ============================================================================
-- OPTION 1: Rename the 'fandomly' user to 'fandomly-platform' (RECOMMENDED)
-- ============================================================================

-- Update the fandomly user to have a non-reserved username
UPDATE users 
SET username = 'fandomly-platform'
WHERE username = 'fandomly';

-- ============================================================================
-- OPTION 2: Add the reserved username constraint
-- ============================================================================

-- Now we can add the constraint since 'fandomly' is no longer in use
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

COMMENT ON CONSTRAINT check_username_not_reserved ON users IS
  'Username cannot be a reserved system word';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the user was renamed
/*
SELECT id, username, email, user_type 
FROM users 
WHERE username IN ('fandomly', 'fandomly-platform');
*/

-- Verify the constraint exists
/*
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'check_username_not_reserved'
  AND conrelid = 'users'::regclass;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Action taken: Renamed 'fandomly' user to 'fandomly-platform'
-- Constraint added: check_username_not_reserved
-- Impact: Prevents future users from registering with reserved system names
-- Safe to run: YES
-- Safe to re-run: YES (will not rename again if already renamed)
-- ============================================================================

