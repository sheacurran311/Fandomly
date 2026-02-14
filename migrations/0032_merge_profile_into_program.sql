-- Migration: Merge Profile Data into Program (Single Source of Truth)
-- 
-- This migration documents the data consolidation from creator profiles
-- into loyalty programs as the single source of truth for fan-facing data.
--
-- The loyaltyPrograms.pageConfig JSONB field now supports these additional keys:
--   - creatorDetails: {} (type-specific info like sport, position, genre, etc.)
--   - location: string (creator's location)
--
-- No schema changes needed since pageConfig is a JSONB column.
-- Data migration is handled by: scripts/migrate-profile-to-program.ts

-- Copy creator bio to program description where program description is empty
UPDATE loyalty_programs lp
SET description = c.bio, updated_at = NOW()
FROM creators c
WHERE lp.creator_id = c.id
  AND (lp.description IS NULL OR lp.description = '')
  AND c.bio IS NOT NULL
  AND c.bio != '';

-- Copy creator imageUrl to pageConfig.logo where logo is empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{logo}',
  to_jsonb(c.image_url)
),
updated_at = NOW()
FROM creators c
WHERE lp.creator_id = c.id
  AND c.image_url IS NOT NULL
  AND c.image_url != ''
  AND (lp.page_config IS NULL OR lp.page_config->>'logo' IS NULL OR lp.page_config->>'logo' = '');

-- Copy creator brandColors to pageConfig.brandColors where empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{brandColors}',
  c.brand_colors
),
updated_at = NOW()
FROM creators c
WHERE lp.creator_id = c.id
  AND c.brand_colors IS NOT NULL
  AND c.brand_colors != '{}'::jsonb
  AND (lp.page_config IS NULL OR lp.page_config->'brandColors' IS NULL);

-- Copy creator socialLinks to pageConfig.socialLinks where empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{socialLinks}',
  c.social_links
),
updated_at = NOW()
FROM creators c
WHERE lp.creator_id = c.id
  AND c.social_links IS NOT NULL
  AND c.social_links != '{}'::jsonb
  AND (lp.page_config IS NULL OR lp.page_config->'socialLinks' IS NULL);

-- Copy creator typeSpecificData to pageConfig.creatorDetails where empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{creatorDetails}',
  c.type_specific_data
),
updated_at = NOW()
FROM creators c
WHERE lp.creator_id = c.id
  AND c.type_specific_data IS NOT NULL
  AND c.type_specific_data != '{}'::jsonb
  AND (lp.page_config IS NULL OR lp.page_config->'creatorDetails' IS NULL);

-- Copy user banner image to pageConfig.headerImage where empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{headerImage}',
  to_jsonb(u.profile_data->>'bannerImage')
),
updated_at = NOW()
FROM creators c
JOIN users u ON c.user_id = u.id
WHERE lp.creator_id = c.id
  AND u.profile_data->>'bannerImage' IS NOT NULL
  AND u.profile_data->>'bannerImage' != ''
  AND (lp.page_config IS NULL OR lp.page_config->>'headerImage' IS NULL OR lp.page_config->>'headerImage' = '');

-- Copy user location to pageConfig.location where empty
UPDATE loyalty_programs lp
SET page_config = jsonb_set(
  COALESCE(lp.page_config, '{}'::jsonb),
  '{location}',
  to_jsonb(u.profile_data->>'location')
),
updated_at = NOW()
FROM creators c
JOIN users u ON c.user_id = u.id
WHERE lp.creator_id = c.id
  AND u.profile_data->>'location' IS NOT NULL
  AND u.profile_data->>'location' != ''
  AND (lp.page_config IS NULL OR lp.page_config->>'location' IS NULL OR lp.page_config->>'location' = '');
