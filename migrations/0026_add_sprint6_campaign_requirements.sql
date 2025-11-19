-- Migration: Add Sprint 6 Campaign Builder Enhancements
-- Purpose: Support prerequisites, subscriber requirements, NFT/Badge requirements, and task dependencies

-- 1. Add Sprint 6 fields to campaigns table
DO $$ BEGIN
  -- Add requires_paid_subscription column (defaults to false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'requires_paid_subscription'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN requires_paid_subscription BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add required_subscriber_tier column (optional tier requirement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'required_subscriber_tier'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN required_subscriber_tier TEXT;
  END IF;

  -- Add required_nft_collection_ids (array of NFT collection IDs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'required_nft_collection_ids'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN required_nft_collection_ids JSONB DEFAULT '[]'::JSONB;
  END IF;

  -- Add required_badge_ids (array of badge template IDs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'required_badge_ids'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN required_badge_ids JSONB DEFAULT '[]'::JSONB;
  END IF;

  -- Add required_task_ids (specific tasks required, overrides all_tasks_required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'required_task_ids'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN required_task_ids JSONB DEFAULT '[]'::JSONB;
  END IF;

  -- Add task_dependencies (task completion order requirements)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'task_dependencies'
  ) THEN
    ALTER TABLE campaigns
    ADD COLUMN task_dependencies JSONB;
  END IF;
END $$;

-- 2. Add indexes for performance on new JSONB columns
CREATE INDEX IF NOT EXISTS idx_campaigns_required_nft_collections
ON campaigns USING GIN (required_nft_collection_ids);

CREATE INDEX IF NOT EXISTS idx_campaigns_required_badges
ON campaigns USING GIN (required_badge_ids);

CREATE INDEX IF NOT EXISTS idx_campaigns_required_tasks
ON campaigns USING GIN (required_task_ids);

CREATE INDEX IF NOT EXISTS idx_campaigns_task_dependencies
ON campaigns USING GIN (task_dependencies);

-- Index for paid subscription filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_requires_paid_subscription
ON campaigns(requires_paid_subscription) WHERE requires_paid_subscription = TRUE;

CREATE INDEX IF NOT EXISTS idx_campaigns_subscriber_tier
ON campaigns(required_subscriber_tier) WHERE required_subscriber_tier IS NOT NULL;

-- 3. Add comments for documentation
COMMENT ON COLUMN campaigns.requires_paid_subscription IS 'Sprint 6: Requires active paid subscription to participate';
COMMENT ON COLUMN campaigns.required_subscriber_tier IS 'Sprint 6: Specific subscriber tier required (e.g., premium, vip, platinum)';
COMMENT ON COLUMN campaigns.required_nft_collection_ids IS 'Sprint 6: Array of NFT collection IDs - fans must own NFT from these collections';
COMMENT ON COLUMN campaigns.required_badge_ids IS 'Sprint 6: Array of badge template IDs - fans must have earned these badges';
COMMENT ON COLUMN campaigns.required_task_ids IS 'Sprint 6: Specific task IDs required (overrides all_tasks_required if set)';
COMMENT ON COLUMN campaigns.task_dependencies IS 'Sprint 6: Array of {taskId, dependsOn[], isOptional} - defines task completion order';

-- 4. Create helper function to validate campaign prerequisites
CREATE OR REPLACE FUNCTION validate_campaign_prerequisites(
  p_user_id VARCHAR,
  p_campaign_id VARCHAR
) RETURNS TABLE (
  can_participate BOOLEAN,
  missing_prerequisites JSONB
) AS $$
DECLARE
  v_campaign RECORD;
  v_missing_campaigns TEXT[] := '{}';
  v_missing_nfts TEXT[] := '{}';
  v_missing_badges TEXT[] := '{}';
  v_has_subscription BOOLEAN;
  v_user_tier TEXT;
BEGIN
  -- Get campaign requirements
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, jsonb_build_object('error', 'Campaign not found');
    RETURN;
  END IF;

  -- Check prerequisite campaigns
  IF v_campaign.prerequisite_campaigns IS NOT NULL AND jsonb_array_length(v_campaign.prerequisite_campaigns) > 0 THEN
    SELECT ARRAY(
      SELECT prereq_id::TEXT
      FROM jsonb_array_elements_text(v_campaign.prerequisite_campaigns) AS prereq_id
      WHERE NOT EXISTS (
        SELECT 1 FROM campaign_participations cp
        WHERE cp.user_id = p_user_id
          AND cp.campaign_id = prereq_id::TEXT
          AND cp.is_completed = TRUE
      )
    ) INTO v_missing_campaigns;
  END IF;

  -- Check paid subscription requirement
  IF v_campaign.requires_paid_subscription THEN
    -- Placeholder: Replace with actual subscription check
    v_has_subscription := FALSE;
  ELSE
    v_has_subscription := TRUE;
  END IF;

  -- Check NFT collection requirements
  IF v_campaign.required_nft_collection_ids IS NOT NULL AND jsonb_array_length(v_campaign.required_nft_collection_ids) > 0 THEN
    SELECT ARRAY(
      SELECT collection_id::TEXT
      FROM jsonb_array_elements_text(v_campaign.required_nft_collection_ids) AS collection_id
      WHERE NOT EXISTS (
        SELECT 1 FROM nft_mints nm
        INNER JOIN nft_templates nt ON nm.template_id = nt.id
        WHERE nm.recipient_address = (SELECT wallet_address FROM users WHERE id = p_user_id)
          AND nt.collection_id = collection_id::TEXT
      )
    ) INTO v_missing_nfts;
  END IF;

  -- Check badge requirements
  IF v_campaign.required_badge_ids IS NOT NULL AND jsonb_array_length(v_campaign.required_badge_ids) > 0 THEN
    SELECT ARRAY(
      SELECT badge_id::TEXT
      FROM jsonb_array_elements_text(v_campaign.required_badge_ids) AS badge_id
      WHERE NOT EXISTS (
        SELECT 1 FROM nft_mints nm
        WHERE nm.recipient_address = (SELECT wallet_address FROM users WHERE id = p_user_id)
          AND nm.badge_template_id = badge_id::TEXT
      )
    ) INTO v_missing_badges;
  END IF;

  -- Return results
  RETURN QUERY SELECT
    (array_length(v_missing_campaigns, 1) IS NULL
      AND v_has_subscription
      AND array_length(v_missing_nfts, 1) IS NULL
      AND array_length(v_missing_badges, 1) IS NULL) AS can_participate,
    jsonb_build_object(
      'missingCampaigns', to_jsonb(v_missing_campaigns),
      'hasSubscription', v_has_subscription,
      'missingNfts', to_jsonb(v_missing_nfts),
      'missingBadges', to_jsonb(v_missing_badges)
    ) AS missing_prerequisites;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_campaign_prerequisites IS 'Sprint 6: Validates if user meets all campaign prerequisites (campaigns, subscription, NFTs, badges)';
