-- Add unique constraint on social_connections to prevent the same social account
-- from being linked to multiple users
-- 
-- This ensures that if a user logs in with Twitter account @foo, that Twitter
-- account can only be linked to one user in the system.

-- First, check for any existing duplicates and keep only the most recent one
-- (This is a safety measure in case duplicates already exist)
DELETE FROM social_connections a
USING social_connections b
WHERE a.id < b.id
  AND a.platform = b.platform
  AND a.platform_user_id = b.platform_user_id;

-- Now add the unique constraint
ALTER TABLE social_connections
ADD CONSTRAINT unique_platform_user_id 
UNIQUE (platform, platform_user_id);

-- Add an index to improve lookup performance for social auth
CREATE INDEX IF NOT EXISTS idx_social_connections_platform_user 
ON social_connections (platform, platform_user_id);
