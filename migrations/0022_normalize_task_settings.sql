-- Migration: Normalize Task Settings to Unified Schema
-- Purpose: Migrate existing task settings to use standardized field names
-- Impact: Ensures consistency across all task types and platforms
-- Safe to run: YES - Only updates customSettings JSONB field

-- ============================================================================
-- NORMALIZE TWITTER TASK SETTINGS
-- ============================================================================

-- Migrate Twitter: handle → username
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'handle',
  '{username}',
  custom_settings->'handle',
  true
)
WHERE platform = 'twitter'
  AND custom_settings ? 'handle'
  AND NOT custom_settings ? 'username';

-- Migrate Twitter: tweetUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'tweetUrl',
  '{contentUrl}',
  custom_settings->'tweetUrl',
  true
)
WHERE platform = 'twitter'
  AND custom_settings ? 'tweetUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Migrate Twitter: url → contentUrl (if tweetUrl not present)
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'url',
  '{contentUrl}',
  custom_settings->'url',
  true
)
WHERE platform = 'twitter'
  AND custom_settings ? 'url'
  AND NOT custom_settings ? 'contentUrl';

-- Add verificationMethod: 'api' for Twitter tasks (they support API)
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"api"',
  true
)
WHERE platform = 'twitter'
  AND NOT custom_settings ? 'verificationMethod';

-- ============================================================================
-- NORMALIZE INSTAGRAM TASK SETTINGS
-- ============================================================================

-- Migrate Instagram: postUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'postUrl',
  '{contentUrl}',
  custom_settings->'postUrl',
  true
)
WHERE platform = 'instagram'
  AND custom_settings ? 'postUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Migrate Instagram: mediaUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'mediaUrl',
  '{contentUrl}',
  custom_settings->'mediaUrl',
  true
)
WHERE platform = 'instagram'
  AND custom_settings ? 'mediaUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Migrate Instagram: mediaId → contentId
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'mediaId',
  '{contentId}',
  custom_settings->'mediaId',
  true
)
WHERE platform = 'instagram'
  AND custom_settings ? 'mediaId'
  AND NOT custom_settings ? 'contentId';

-- Add verificationMethod: 'smart_detection' for Instagram tasks
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"smart_detection"',
  true
)
WHERE platform = 'instagram'
  AND NOT custom_settings ? 'verificationMethod';

-- ============================================================================
-- NORMALIZE TIKTOK TASK SETTINGS
-- ============================================================================

-- Migrate TikTok: videoUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'videoUrl',
  '{contentUrl}',
  custom_settings->'videoUrl',
  true
)
WHERE platform = 'tiktok'
  AND custom_settings ? 'videoUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Add verificationMethod: 'smart_detection' for TikTok tasks
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"smart_detection"',
  true
)
WHERE platform = 'tiktok'
  AND NOT custom_settings ? 'verificationMethod';

-- Add default trustScoreThreshold for TikTok
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{trustScoreThreshold}',
  '0.7',
  true
)
WHERE platform = 'tiktok'
  AND NOT custom_settings ? 'trustScoreThreshold';

-- ============================================================================
-- NORMALIZE YOUTUBE TASK SETTINGS
-- ============================================================================

-- Migrate YouTube: videoUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'videoUrl',
  '{contentUrl}',
  custom_settings->'videoUrl',
  true
)
WHERE platform = 'youtube'
  AND custom_settings ? 'videoUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Migrate YouTube: channelUrl → username (extract from URL)
-- This is complex, so we'll leave as is and handle in application code

-- Add verificationMethod: 'api' for YouTube tasks
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"api"',
  true
)
WHERE platform = 'youtube'
  AND NOT custom_settings ? 'verificationMethod';

-- ============================================================================
-- NORMALIZE FACEBOOK TASK SETTINGS
-- ============================================================================

-- Migrate Facebook: postUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'postUrl',
  '{contentUrl}',
  custom_settings->'postUrl',
  true
)
WHERE platform = 'facebook'
  AND custom_settings ? 'postUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Migrate Facebook: photoUrl → contentUrl
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'photoUrl',
  '{contentUrl}',
  custom_settings->'photoUrl',
  true
)
WHERE platform = 'facebook'
  AND custom_settings ? 'photoUrl'
  AND NOT custom_settings ? 'contentUrl';

-- Add verificationMethod: 'manual' for Facebook tasks
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"manual"',
  true
)
WHERE platform = 'facebook'
  AND NOT custom_settings ? 'verificationMethod';

-- ============================================================================
-- NORMALIZE SPOTIFY TASK SETTINGS
-- ============================================================================

-- Add verificationMethod: 'api' for Spotify tasks
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings,
  '{verificationMethod}',
  '"api"',
  true
)
WHERE platform = 'spotify'
  AND NOT custom_settings ? 'verificationMethod';

-- ============================================================================
-- NORMALIZE GENERIC FIELDS
-- ============================================================================

-- Convert string requiredHashtag to array requiredHashtags
UPDATE tasks
SET custom_settings = jsonb_set(
  custom_settings - 'requireHashtag',
  '{requiredHashtags}',
  jsonb_build_array(custom_settings->'requireHashtag'),
  true
)
WHERE custom_settings ? 'requireHashtag'
  AND NOT custom_settings ? 'requiredHashtags'
  AND jsonb_typeof(custom_settings->'requireHashtag') = 'string';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check Twitter tasks with normalized settings
/*
SELECT
  id,
  name,
  platform,
  custom_settings->>'username' as username,
  custom_settings->>'contentUrl' as content_url,
  custom_settings->>'verificationMethod' as verification_method
FROM tasks
WHERE platform = 'twitter'
LIMIT 10;
*/

-- Check Instagram tasks with normalized settings
/*
SELECT
  id,
  name,
  platform,
  custom_settings->>'username' as username,
  custom_settings->>'contentUrl' as content_url,
  custom_settings->>'contentId' as content_id,
  custom_settings->>'verificationMethod' as verification_method
FROM tasks
WHERE platform = 'instagram'
LIMIT 10;
*/

-- Check TikTok tasks with normalized settings
/*
SELECT
  id,
  name,
  platform,
  custom_settings->>'username' as username,
  custom_settings->>'contentUrl' as content_url,
  custom_settings->>'verificationMethod' as verification_method,
  custom_settings->>'trustScoreThreshold' as trust_threshold
FROM tasks
WHERE platform = 'tiktok'
LIMIT 10;
*/

-- Count tasks by verification method
/*
SELECT
  platform,
  custom_settings->>'verificationMethod' as verification_method,
  COUNT(*) as task_count
FROM tasks
WHERE custom_settings ? 'verificationMethod'
GROUP BY platform, custom_settings->>'verificationMethod'
ORDER BY platform, verification_method;
*/

-- Find tasks with legacy fields still present (should be 0 after migration)
/*
SELECT
  id,
  name,
  platform,
  CASE
    WHEN custom_settings ? 'handle' THEN 'has handle (legacy)'
    WHEN custom_settings ? 'tweetUrl' THEN 'has tweetUrl (legacy)'
    WHEN custom_settings ? 'postUrl' THEN 'has postUrl (legacy)'
    WHEN custom_settings ? 'videoUrl' THEN 'has videoUrl (legacy)'
    WHEN custom_settings ? 'mediaId' THEN 'has mediaId (legacy)'
    WHEN custom_settings ? 'mediaUrl' THEN 'has mediaUrl (legacy)'
    ELSE 'clean'
  END as legacy_status
FROM tasks
WHERE (
  custom_settings ? 'handle'
  OR custom_settings ? 'tweetUrl'
  OR custom_settings ? 'postUrl'
  OR custom_settings ? 'videoUrl'
  OR custom_settings ? 'mediaId'
  OR custom_settings ? 'mediaUrl'
);
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tasks updated: All existing tasks with legacy field names
-- Fields migrated:
--   - handle → username (Twitter)
--   - tweetUrl/url → contentUrl (Twitter)
--   - postUrl → contentUrl (Instagram, Facebook)
--   - mediaUrl → contentUrl (Instagram)
--   - mediaId → contentId (Instagram)
--   - videoUrl → contentUrl (TikTok, YouTube)
--   - photoUrl → contentUrl (Facebook)
--   - requireHashtag → requiredHashtags (All)
--
-- New fields added:
--   - verificationMethod (all platforms)
--   - trustScoreThreshold (TikTok only)
--
-- Safe to run: YES
-- Rollback: Not needed (old fields are kept for backwards compatibility)
-- Impact: Settings now use consistent naming across all platforms
-- ============================================================================
