--
-- PostgreSQL database dump
--

\restrict d2aJ0hDVXyfXR1el9S7BXhU9mLTOrTztRC2PACH7JqkCrZUqeMVNNQqlfpha55W

-- Dumped from database version 16.9 (415ebe8)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'verify',
    'unverify',
    'login',
    'logout',
    'export',
    'import',
    'grant_permission',
    'revoke_permission'
);


ALTER TYPE public.audit_action OWNER TO neondb_owner;

--
-- Name: audit_resource; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.audit_resource AS ENUM (
    'user',
    'creator',
    'program',
    'task',
    'reward',
    'physical_reward',
    'verification',
    'subscription',
    'payment',
    'admin_settings',
    'tenant',
    'nft_collection',
    'nft_template',
    'badge_template'
);


ALTER TYPE public.audit_resource OWNER TO neondb_owner;

--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.campaign_status AS ENUM (
    'active',
    'inactive',
    'draft',
    'archived',
    'pending_tasks'
);


ALTER TYPE public.campaign_status OWNER TO neondb_owner;

--
-- Name: TYPE campaign_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.campaign_status IS 'Campaign lifecycle statuses: draft (being created), pending_tasks (awaiting task assignment), active (live), inactive (paused), archived (ended)';


--
-- Name: campaign_trigger; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.campaign_trigger AS ENUM (
    'schedule_daily',
    'schedule_weekly',
    'schedule_monthly',
    'birthday',
    'anniversary',
    'purchase_transaction',
    'return_transaction',
    'internal_event',
    'custom_event',
    'achievement_earned',
    'redemption_code'
);


ALTER TYPE public.campaign_trigger OWNER TO neondb_owner;

--
-- Name: TYPE campaign_trigger; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.campaign_trigger IS 'Campaign trigger events (OpenLoyalty-inspired): schedule_* (time-based), birthday, anniversary, purchase_transaction, return_transaction, internal_event, custom_event, achievement_earned, redemption_code';


--
-- Name: campaign_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.campaign_type AS ENUM (
    'automation',
    'direct',
    'referral'
);


ALTER TYPE public.campaign_type OWNER TO neondb_owner;

--
-- Name: TYPE campaign_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.campaign_type IS 'Campaign types (OpenLoyalty-inspired): automation (triggered by events), direct (immediate rewards), referral (reward for referrals)';


--
-- Name: customer_tier; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.customer_tier AS ENUM (
    'basic',
    'premium',
    'vip'
);


ALTER TYPE public.customer_tier OWNER TO neondb_owner;

--
-- Name: TYPE customer_tier; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.customer_tier IS 'Customer tiers: basic (free tier), premium (paid tier), vip (highest tier)';


--
-- Name: multiplier_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.multiplier_type AS ENUM (
    'time_based',
    'streak_based',
    'tier_based',
    'event',
    'task_specific'
);


ALTER TYPE public.multiplier_type OWNER TO neondb_owner;

--
-- Name: nft_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.nft_category AS ENUM (
    'badge_credential',
    'digital_art',
    'collectible',
    'reward_perk',
    'event_ticket',
    'custom'
);


ALTER TYPE public.nft_category OWNER TO neondb_owner;

--
-- Name: TYPE nft_category; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.nft_category IS 'NFT categories: badge_credential (achievement badge), digital_art (artwork), collectible (trading card), reward_perk (loyalty reward), event_ticket (event access), custom (creator-defined)';


--
-- Name: nft_mint_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.nft_mint_status AS ENUM (
    'pending',
    'processing',
    'success',
    'failed'
);


ALTER TYPE public.nft_mint_status OWNER TO neondb_owner;

--
-- Name: TYPE nft_mint_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.nft_mint_status IS 'NFT minting statuses: pending (queued for minting), processing (Crossmint is processing), success (minted and delivered), failed (minting error)';


--
-- Name: nft_token_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.nft_token_type AS ENUM (
    'ERC721',
    'ERC1155',
    'SOLANA',
    'SOLANA_COMPRESSED'
);


ALTER TYPE public.nft_token_type OWNER TO neondb_owner;

--
-- Name: TYPE nft_token_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.nft_token_type IS 'NFT token standards: ERC721 (Ethereum unique NFT), ERC1155 (Ethereum multi-edition), SOLANA (Solana NFT), SOLANA_COMPRESSED (Compressed Solana NFT)';


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.notification_type AS ENUM (
    'points_earned',
    'task_completed',
    'campaign_new',
    'campaign_update',
    'creator_post',
    'creator_update',
    'reward_available',
    'reward_claimed',
    'achievement_unlocked',
    'level_up',
    'follower_milestone',
    'system',
    'marketing'
);


ALTER TYPE public.notification_type OWNER TO neondb_owner;

--
-- Name: TYPE notification_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.notification_type IS 'Notification types: points_earned, task_completed, campaign_new, campaign_update, creator_post, creator_update, reward_available, reward_claimed, achievement_unlocked, level_up, follower_milestone, system, marketing';


--
-- Name: referral_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.referral_status AS ENUM (
    'pending',
    'active',
    'completed',
    'expired',
    'cancelled'
);


ALTER TYPE public.referral_status OWNER TO neondb_owner;

--
-- Name: TYPE referral_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.referral_status IS 'Referral lifecycle statuses: pending (created but not yet used), active (referral code used), completed (reward distributed), expired (past expiration date), cancelled (manually cancelled)';


--
-- Name: reward_frequency; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.reward_frequency AS ENUM (
    'one_time',
    'daily',
    'weekly',
    'monthly'
);


ALTER TYPE public.reward_frequency OWNER TO neondb_owner;

--
-- Name: TYPE reward_frequency; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.reward_frequency IS 'Reward distribution frequency (Snag-inspired): one_time (single reward), daily (repeatable daily), weekly (repeatable weekly), monthly (repeatable monthly)';


--
-- Name: reward_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.reward_type AS ENUM (
    'points',
    'raffle',
    'nft',
    'badge',
    'multiplier'
);


ALTER TYPE public.reward_type OWNER TO neondb_owner;

--
-- Name: TYPE reward_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.reward_type IS 'Reward types: points (loyalty points), raffle (entry into prize drawing), nft (digital collectible), badge (achievement credential), multiplier (points multiplier)';


--
-- Name: social_platform; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.social_platform AS ENUM (
    'facebook',
    'instagram',
    'twitter',
    'tiktok',
    'youtube',
    'spotify',
    'apple_music',
    'discord',
    'telegram',
    'system'
);


ALTER TYPE public.social_platform OWNER TO neondb_owner;

--
-- Name: TYPE social_platform; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.social_platform IS 'Social media platforms: facebook, instagram, twitter, tiktok, youtube, spotify, apple_music, discord, telegram, system (for platform-generated tasks)';


--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.subscription_tier AS ENUM (
    'starter',
    'professional',
    'enterprise'
);


ALTER TYPE public.subscription_tier OWNER TO neondb_owner;

--
-- Name: TYPE subscription_tier; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.subscription_tier IS 'Subscription tiers: starter (basic features), professional (advanced features), enterprise (all features + white label)';


--
-- Name: task_ownership; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.task_ownership AS ENUM (
    'platform',
    'creator'
);


ALTER TYPE public.task_ownership OWNER TO neondb_owner;

--
-- Name: TYPE task_ownership; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.task_ownership IS 'Task ownership level: platform (Fandomly platform tasks), creator (creator-defined tasks)';


--
-- Name: task_section; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.task_section AS ENUM (
    'user_onboarding',
    'social_engagement',
    'community_building',
    'content_creation',
    'streaming_music',
    'token_activity',
    'custom'
);


ALTER TYPE public.task_section OWNER TO neondb_owner;

--
-- Name: TYPE task_section; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.task_section IS 'Task organization sections (Snag-inspired): user_onboarding (profile setup), social_engagement (social tasks), community_building (referrals, invites), content_creation (create content), streaming_music (music streaming), token_activity (Web3 actions), custom (creator-defined)';


--
-- Name: task_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.task_type AS ENUM (
    'twitter_follow',
    'twitter_mention',
    'twitter_retweet',
    'twitter_like',
    'twitter_include_name',
    'twitter_include_bio',
    'twitter_hashtag_post',
    'twitter_quote_tweet',
    'facebook_like_page',
    'facebook_like_photo',
    'facebook_like_post',
    'facebook_share_post',
    'facebook_share_page',
    'facebook_comment_post',
    'facebook_comment_photo',
    'instagram_follow',
    'instagram_like_post',
    'comment_code',
    'mention_story',
    'keyword_comment',
    'youtube_like',
    'youtube_subscribe',
    'youtube_share',
    'youtube_comment',
    'tiktok_follow',
    'tiktok_like',
    'tiktok_share',
    'tiktok_comment',
    'spotify_follow',
    'spotify_playlist',
    'spotify_album',
    'check_in',
    'follower_milestone',
    'complete_profile',
    'follow',
    'join',
    'repost',
    'referral'
);


ALTER TYPE public.task_type OWNER TO neondb_owner;

--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.tenant_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'trial'
);


ALTER TYPE public.tenant_status OWNER TO neondb_owner;

--
-- Name: TYPE tenant_status; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.tenant_status IS 'Tenant statuses: trial (free trial period), active (paid subscription), inactive (cancelled), suspended (payment issue or policy violation)';


--
-- Name: update_cadence; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.update_cadence AS ENUM (
    'immediate',
    'daily',
    'weekly',
    'monthly'
);


ALTER TYPE public.update_cadence OWNER TO neondb_owner;

--
-- Name: TYPE update_cadence; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.update_cadence IS 'Task update frequency (Snag-inspired): immediate (updates instantly), daily (updates once per day), weekly (updates once per week), monthly (updates once per month)';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'fandomly_admin',
    'customer_admin',
    'customer_end_user'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: TYPE user_role; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TYPE public.user_role IS 'User roles: fandomly_admin (platform admin), customer_admin (creator/brand owner), customer_end_user (fan)';


--
-- Name: anonymize_user_audit_logs(character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.anonymize_user_audit_logs(p_user_id character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  rows_affected integer;
BEGIN
  -- Anonymize user information in audit logs
  UPDATE audit_log
  SET
    changed_by_username = 'ANONYMIZED',
    changed_by_email = 'anonymized@example.com',
    -- Optionally anonymize parts of old_values/new_values that contain PII
    old_values = jsonb_set(
      COALESCE(old_values, '{}'::jsonb),
      '{email}',
      '"anonymized@example.com"'::jsonb,
      false
    ),
    new_values = jsonb_set(
      COALESCE(new_values, '{}'::jsonb),
      '{email}',
      '"anonymized@example.com"'::jsonb,
      false
    )
  WHERE changed_by = p_user_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  RAISE NOTICE 'Anonymized % audit log entries for user %', rows_affected, p_user_id;
  RETURN rows_affected;
END;
$$;


ALTER FUNCTION public.anonymize_user_audit_logs(p_user_id character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION anonymize_user_audit_logs(p_user_id character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.anonymize_user_audit_logs(p_user_id character varying) IS 'Anonymize audit logs for GDPR compliance. Call this after soft-deleting a user who requested data deletion.';


--
-- Name: archive_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.archive_old_audit_logs(p_days_to_keep integer DEFAULT 365) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  rows_archived integer;
BEGIN
  -- In a real implementation, you might move to an archive table
  -- For now, we'll just delete old logs (with proper GDPR considerations)

  -- Example: DELETE FROM audit_log WHERE changed_at < NOW() - (p_days_to_keep || ' days')::interval;
  -- Or: INSERT INTO audit_log_archive SELECT * FROM audit_log WHERE changed_at < ...;

  RAISE NOTICE 'Audit log archival is a manual process. Consider exporting logs older than % days', p_days_to_keep;
  RETURN 0;
END;
$$;


ALTER FUNCTION public.archive_old_audit_logs(p_days_to_keep integer) OWNER TO neondb_owner;

--
-- Name: FUNCTION archive_old_audit_logs(p_days_to_keep integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.archive_old_audit_logs(p_days_to_keep integer) IS 'Helper function for archiving old audit logs. Customize based on your retention policy.';


--
-- Name: clear_audit_context(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.clear_audit_context() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_user_id', NULL, true);
  PERFORM set_config('app.current_username', NULL, true);
  PERFORM set_config('app.current_user_email', NULL, true);
  PERFORM set_config('app.client_ip', NULL, true);
  PERFORM set_config('app.user_agent', NULL, true);
  PERFORM set_config('app.session_id', NULL, true);
  PERFORM set_config('app.request_id', NULL, true);
END;
$$;


ALTER FUNCTION public.clear_audit_context() OWNER TO neondb_owner;

--
-- Name: FUNCTION clear_audit_context(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.clear_audit_context() IS 'Clear audit context. Call this in error handlers or at the end of requests.';


--
-- Name: disable_audit_triggers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.disable_audit_triggers() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'audit_%'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I',
      trigger_record.event_object_table,
      trigger_record.trigger_name
    );
  END LOOP;

  RAISE NOTICE 'All audit triggers disabled. Remember to re-enable after bulk operation!';
END;
$$;


ALTER FUNCTION public.disable_audit_triggers() OWNER TO neondb_owner;

--
-- Name: FUNCTION disable_audit_triggers(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.disable_audit_triggers() IS 'Disable all audit triggers for bulk operations. Usage: SELECT disable_audit_triggers();';


--
-- Name: disable_updated_at_triggers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.disable_updated_at_triggers() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.disable_updated_at_triggers() OWNER TO neondb_owner;

--
-- Name: FUNCTION disable_updated_at_triggers(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.disable_updated_at_triggers() IS 'Disable all updated_at triggers (for bulk operations). Usage: SELECT disable_updated_at_triggers()';


--
-- Name: enable_audit_triggers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.enable_audit_triggers() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'audit_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I',
      trigger_record.event_object_table,
      trigger_record.trigger_name
    );
  END LOOP;

  RAISE NOTICE 'All audit triggers enabled';
END;
$$;


ALTER FUNCTION public.enable_audit_triggers() OWNER TO neondb_owner;

--
-- Name: FUNCTION enable_audit_triggers(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.enable_audit_triggers() IS 'Re-enable all audit triggers after bulk operations. Usage: SELECT enable_audit_triggers();';


--
-- Name: enable_updated_at_triggers(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.enable_updated_at_triggers() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.enable_updated_at_triggers() OWNER TO neondb_owner;

--
-- Name: FUNCTION enable_updated_at_triggers(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.enable_updated_at_triggers() IS 'Re-enable all updated_at triggers after bulk operations. Usage: SELECT enable_updated_at_triggers()';


--
-- Name: gdpr_hard_delete_user(character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.gdpr_hard_delete_user(user_id_to_delete character varying) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  deletion_summary jsonb;
BEGIN
  -- First soft-delete to preserve audit trail
  UPDATE users
  SET deleted_at = NOW(),
      deletion_reason = 'gdpr_right_to_be_forgotten'
  WHERE id = user_id_to_delete;

  -- Wait 30 days before hard delete (configurable)
  -- This gives time to reverse accidental deletions
  -- In production, schedule this with a cron job

  -- For immediate hard delete (USE WITH EXTREME CAUTION):
  -- DELETE FROM users WHERE id = user_id_to_delete;

  deletion_summary := jsonb_build_object(
    'user_id', user_id_to_delete,
    'soft_deleted_at', NOW(),
    'hard_delete_scheduled', NOW() + INTERVAL '30 days',
    'status', 'soft_deleted',
    'note', 'User will be hard-deleted in 30 days unless restored'
  );

  RETURN deletion_summary;
END;
$$;


ALTER FUNCTION public.gdpr_hard_delete_user(user_id_to_delete character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION gdpr_hard_delete_user(user_id_to_delete character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.gdpr_hard_delete_user(user_id_to_delete character varying) IS 'GDPR-compliant user deletion. Soft-deletes immediately, schedules hard delete for 30 days later. Usage: SELECT gdpr_hard_delete_user(''user-id'')';


--
-- Name: get_audit_history(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_audit_history(p_table_name character varying, p_record_id character varying, p_limit integer DEFAULT 100) RETURNS TABLE(changed_at timestamp without time zone, action character varying, changed_by_username character varying, changed_fields text[], old_values jsonb, new_values jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.changed_at,
    al.action,
    al.changed_by_username,
    al.changed_fields,
    al.old_values,
    al.new_values
  FROM audit_log al
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_audit_history(p_table_name character varying, p_record_id character varying, p_limit integer) OWNER TO neondb_owner;

--
-- Name: FUNCTION get_audit_history(p_table_name character varying, p_record_id character varying, p_limit integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.get_audit_history(p_table_name character varying, p_record_id character varying, p_limit integer) IS 'Get full audit history for a specific record. Usage: SELECT * FROM get_audit_history(''users'', ''user-123'', 50);';


--
-- Name: get_field_changes(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_field_changes(p_table_name character varying, p_field_name character varying, p_hours integer DEFAULT 24) RETURNS TABLE(changed_at timestamp without time zone, record_id character varying, old_value jsonb, new_value jsonb, changed_by_username character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.changed_at,
    al.record_id,
    al.old_values->p_field_name,
    al.new_values->p_field_name,
    al.changed_by_username
  FROM audit_log al
  WHERE al.table_name = p_table_name
    AND p_field_name = ANY(al.changed_fields)
    AND al.changed_at > NOW() - (p_hours || ' hours')::interval
  ORDER BY al.changed_at DESC;
END;
$$;


ALTER FUNCTION public.get_field_changes(p_table_name character varying, p_field_name character varying, p_hours integer) OWNER TO neondb_owner;

--
-- Name: FUNCTION get_field_changes(p_table_name character varying, p_field_name character varying, p_hours integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.get_field_changes(p_table_name character varying, p_field_name character varying, p_hours integer) IS 'Get all changes to a specific field. Usage: SELECT * FROM get_field_changes(''users'', ''email'', 168);';


--
-- Name: get_record_state_at_time(character varying, character varying, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_record_state_at_time(p_table_name character varying, p_record_id character varying, p_timestamp timestamp without time zone) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  record_state jsonb;
  change_record RECORD;
BEGIN
  -- Start with the most recent state before the target time
  SELECT new_values INTO record_state
  FROM audit_log
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND changed_at <= p_timestamp
    AND action IN ('INSERT', 'UPDATE')
  ORDER BY changed_at DESC
  LIMIT 1;

  -- If no state found, record didn't exist at that time
  IF record_state IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN record_state;
END;
$$;


ALTER FUNCTION public.get_record_state_at_time(p_table_name character varying, p_record_id character varying, p_timestamp timestamp without time zone) OWNER TO neondb_owner;

--
-- Name: FUNCTION get_record_state_at_time(p_table_name character varying, p_record_id character varying, p_timestamp timestamp without time zone); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.get_record_state_at_time(p_table_name character varying, p_record_id character varying, p_timestamp timestamp without time zone) IS 'Get the state of a record at a specific point in time. Usage: SELECT get_record_state_at_time(''users'', ''user-123'', ''2025-01-15 14:30:00'');';


--
-- Name: get_user_activity(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_user_activity(p_user_id character varying, p_hours integer DEFAULT 24, p_limit integer DEFAULT 100) RETURNS TABLE(changed_at timestamp without time zone, table_name character varying, record_id character varying, action character varying, changed_fields text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.changed_at,
    al.table_name,
    al.record_id,
    al.action,
    al.changed_fields
  FROM audit_log al
  WHERE al.changed_by = p_user_id
    AND al.changed_at > NOW() - (p_hours || ' hours')::interval
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_user_activity(p_user_id character varying, p_hours integer, p_limit integer) OWNER TO neondb_owner;

--
-- Name: FUNCTION get_user_activity(p_user_id character varying, p_hours integer, p_limit integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.get_user_activity(p_user_id character varying, p_hours integer, p_limit integer) IS 'Get recent activity by a user. Usage: SELECT * FROM get_user_activity(''user-123'', 24, 100);';


--
-- Name: is_deleted(text, character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.is_deleted(table_name text, record_id character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $_$
DECLARE
  result boolean;
BEGIN
  EXECUTE format(
    'SELECT deleted_at IS NOT NULL FROM %I WHERE id = $1',
    table_name
  ) USING record_id INTO result;
  RETURN COALESCE(result, false);
END;
$_$;


ALTER FUNCTION public.is_deleted(table_name text, record_id character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION is_deleted(table_name text, record_id character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.is_deleted(table_name text, record_id character varying) IS 'Check if a record is soft-deleted. Returns true if deleted, false if active or not found. Usage: SELECT is_deleted(''users'', ''user-id'')';


--
-- Name: refresh_all_analytics_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.refresh_all_analytics_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_metrics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY task_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY loyalty_program_health;
  REFRESH MATERIALIZED VIEW CONCURRENTLY referral_analytics;

  RAISE NOTICE 'All analytics views refreshed successfully at %', NOW();
END;
$$;


ALTER FUNCTION public.refresh_all_analytics_views() OWNER TO neondb_owner;

--
-- Name: FUNCTION refresh_all_analytics_views(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.refresh_all_analytics_views() IS 'Refresh all materialized views for analytics. Usage: SELECT refresh_all_analytics_views()';


--
-- Name: refresh_hourly_analytics_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.refresh_hourly_analytics_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY task_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_analytics;

  RAISE NOTICE 'Hourly analytics views refreshed at %', NOW();
END;
$$;


ALTER FUNCTION public.refresh_hourly_analytics_views() OWNER TO neondb_owner;

--
-- Name: FUNCTION refresh_hourly_analytics_views(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.refresh_hourly_analytics_views() IS 'Refresh high-frequency analytics views (tasks, campaigns). Usage: SELECT refresh_hourly_analytics_views()';


--
-- Name: restore_deleted(text, character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.restore_deleted(table_name text, record_id character varying) RETURNS void
    LANGUAGE plpgsql
    AS $_$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = $1',
    table_name
  ) USING record_id;
END;
$_$;


ALTER FUNCTION public.restore_deleted(table_name text, record_id character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION restore_deleted(table_name text, record_id character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.restore_deleted(table_name text, record_id character varying) IS 'Restore a soft-deleted record by clearing deleted_at. Usage: SELECT restore_deleted(''users'', ''user-id'')';


--
-- Name: set_audit_context(character varying, character varying, character varying, character varying, text, character varying, character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.set_audit_context(p_user_id character varying, p_username character varying DEFAULT NULL::character varying, p_email character varying DEFAULT NULL::character varying, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text, p_session_id character varying DEFAULT NULL::character varying, p_request_id character varying DEFAULT NULL::character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id, true);
  PERFORM set_config('app.current_username', p_username, true);
  PERFORM set_config('app.current_user_email', p_email, true);
  PERFORM set_config('app.client_ip', p_ip_address, true);
  PERFORM set_config('app.user_agent', p_user_agent, true);
  PERFORM set_config('app.session_id', p_session_id, true);
  PERFORM set_config('app.request_id', p_request_id, true);
END;
$$;


ALTER FUNCTION public.set_audit_context(p_user_id character varying, p_username character varying, p_email character varying, p_ip_address character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION set_audit_context(p_user_id character varying, p_username character varying, p_email character varying, p_ip_address character varying, p_user_agent text, p_session_id character varying, p_request_id character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.set_audit_context(p_user_id character varying, p_username character varying, p_email character varying, p_ip_address character varying, p_user_agent text, p_session_id character varying, p_request_id character varying) IS 'Set audit context for the current transaction. Call this in your API middleware before any database operations.';


--
-- Name: soft_delete(text, character varying, character varying, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.soft_delete(table_name text, record_id character varying, deleted_by_user_id character varying, reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $_$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1, deletion_reason = $2 WHERE id = $3',
    table_name
  ) USING deleted_by_user_id, reason, record_id;
END;
$_$;


ALTER FUNCTION public.soft_delete(table_name text, record_id character varying, deleted_by_user_id character varying, reason text) OWNER TO neondb_owner;

--
-- Name: FUNCTION soft_delete(table_name text, record_id character varying, deleted_by_user_id character varying, reason text); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.soft_delete(table_name text, record_id character varying, deleted_by_user_id character varying, reason text) IS 'Soft delete a record by setting deleted_at, deleted_by, and deletion_reason. Usage: SELECT soft_delete(''users'', ''user-id'', ''admin-id'', ''policy_violation'')';


--
-- Name: update_active_multipliers_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_active_multipliers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_active_multipliers_updated_at() OWNER TO neondb_owner;

--
-- Name: update_check_in_streaks_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_check_in_streaks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_check_in_streaks_updated_at() OWNER TO neondb_owner;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

--
-- Name: FUNCTION update_updated_at_column(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to automatically update updated_at column on row modification';


--
-- Name: update_updated_at_column_if_changed(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column_if_changed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only update timestamp if actual data changed (not just timestamp columns)
  IF NEW IS DISTINCT FROM OLD THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column_if_changed() OWNER TO neondb_owner;

--
-- Name: FUNCTION update_updated_at_column_if_changed(); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.update_updated_at_column_if_changed() IS 'Optimized trigger function that only updates updated_at when actual data changes';


--
-- Name: update_user_last_active(character varying); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_user_last_active(p_user_id character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE users
  SET last_active_at = NOW()
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION public.update_user_last_active(p_user_id character varying) OWNER TO neondb_owner;

--
-- Name: FUNCTION update_user_last_active(p_user_id character varying); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.update_user_last_active(p_user_id character varying) IS 'Update user last_active_at timestamp. Call from your API middleware after successful authentication. Usage: SELECT update_user_last_active(''user-id'')';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.achievements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying,
    name character varying NOT NULL,
    description character varying NOT NULL,
    icon character varying NOT NULL,
    category character varying NOT NULL,
    type character varying NOT NULL,
    points_required integer DEFAULT 0,
    action_required character varying,
    action_count integer DEFAULT 1,
    reward_points integer DEFAULT 0,
    reward_type character varying,
    reward_value character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.achievements OWNER TO neondb_owner;

--
-- Name: active_multipliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.active_multipliers (
    id character varying DEFAULT (gen_random_uuid())::character varying NOT NULL,
    tenant_id character varying,
    name text NOT NULL,
    description text,
    type public.multiplier_type NOT NULL,
    multiplier numeric(10,2) NOT NULL,
    conditions jsonb,
    stacking_type text DEFAULT 'multiplicative'::text,
    priority integer DEFAULT 0,
    can_stack_with_others boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by character varying,
    CONSTRAINT active_multipliers_multiplier_check CHECK ((multiplier >= 1.0)),
    CONSTRAINT active_multipliers_stacking_type_check CHECK ((stacking_type = ANY (ARRAY['additive'::text, 'multiplicative'::text])))
);


ALTER TABLE public.active_multipliers OWNER TO neondb_owner;

--
-- Name: TABLE active_multipliers; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.active_multipliers IS 'Defines active point multipliers (time-based, streak-based, tier-based, events)';


--
-- Name: COLUMN active_multipliers.conditions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.active_multipliers.conditions IS 'Flexible conditions: startDate, endDate, daysOfWeek, timeRanges, requiredStreak, requiredTier, etc.';


--
-- Name: COLUMN active_multipliers.stacking_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.active_multipliers.stacking_type IS 'How to combine with other multipliers: additive (sum) or multiplicative (product)';


--
-- Name: COLUMN active_multipliers.priority; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.active_multipliers.priority IS 'Higher priority multipliers are applied first';


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agencies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_user_id character varying NOT NULL,
    website text,
    business_info jsonb DEFAULT '{}'::jsonb,
    allow_cross_brand_analytics boolean DEFAULT false,
    data_isolation_level text DEFAULT 'strict'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agencies OWNER TO neondb_owner;

--
-- Name: TABLE agencies; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.agencies IS 'Agencies that manage multiple brand tenants. Enables centralized brand management for agencies and holding companies.';


--
-- Name: agency_tenants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agency_tenants (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    agency_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    relationship_type text DEFAULT 'full_management'::text,
    start_date timestamp without time zone DEFAULT now(),
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.agency_tenants OWNER TO neondb_owner;

--
-- Name: TABLE agency_tenants; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.agency_tenants IS 'Links agencies to the brands/tenants they manage. Supports multi-brand management and data isolation.';


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    user_role public.user_role,
    action public.audit_action NOT NULL,
    resource public.audit_resource NOT NULL,
    resource_id character varying,
    tenant_id character varying,
    changes jsonb,
    metadata jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO neondb_owner;

--
-- Name: campaign_participations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_participations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    member_id character varying NOT NULL,
    participation_count integer DEFAULT 1,
    last_participation timestamp without time zone DEFAULT now(),
    total_units_earned integer DEFAULT 0,
    participation_data jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaign_participations OWNER TO neondb_owner;

--
-- Name: campaign_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_rules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    rule_order integer DEFAULT 1 NOT NULL,
    conditions jsonb NOT NULL,
    effects jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaign_rules OWNER TO neondb_owner;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaigns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    creator_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer,
    campaign_type public.campaign_type NOT NULL,
    trigger public.campaign_trigger NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    status public.campaign_status DEFAULT 'draft'::public.campaign_status NOT NULL,
    visibility text DEFAULT 'everyone'::text NOT NULL,
    visibility_rules jsonb,
    custom_attributes jsonb,
    transaction_filters jsonb,
    global_budget integer,
    per_member_limit jsonb,
    total_issued integer DEFAULT 0,
    total_participants integer DEFAULT 0,
    campaign_types jsonb DEFAULT '["points"]'::jsonb,
    reward_structure jsonb,
    prerequisite_campaigns jsonb DEFAULT '[]'::jsonb,
    all_tasks_required boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    program_id character varying
);


ALTER TABLE public.campaigns OWNER TO neondb_owner;

--
-- Name: check_in_streaks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.check_in_streaks (
    id character varying DEFAULT (gen_random_uuid())::character varying NOT NULL,
    user_id character varying NOT NULL,
    task_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_check_ins integer DEFAULT 0,
    last_check_in timestamp without time zone,
    last_streak_reset timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.check_in_streaks OWNER TO neondb_owner;

--
-- Name: TABLE check_in_streaks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.check_in_streaks IS 'Tracks daily check-in streaks for users';


--
-- Name: COLUMN check_in_streaks.current_streak; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.check_in_streaks.current_streak IS 'Consecutive days of check-ins (resets if day missed)';


--
-- Name: COLUMN check_in_streaks.longest_streak; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.check_in_streaks.longest_streak IS 'Personal best streak for this user/task combo';


--
-- Name: COLUMN check_in_streaks.metadata; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.check_in_streaks.metadata IS 'Stores streakMilestones, missedDays, longestStreakAchievedAt';


--
-- Name: creator_facebook_pages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.creator_facebook_pages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    creator_id character varying NOT NULL,
    page_id character varying NOT NULL,
    name text NOT NULL,
    access_token text NOT NULL,
    followers_count integer DEFAULT 0,
    fan_count integer DEFAULT 0,
    instagram_business_account_id character varying,
    connected_instagram_account_id character varying,
    last_synced_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.creator_facebook_pages OWNER TO neondb_owner;

--
-- Name: creator_referrals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.creator_referrals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    referring_creator_id character varying NOT NULL,
    referred_creator_id character varying,
    referral_code character varying(50) NOT NULL,
    referral_url text NOT NULL,
    click_count integer DEFAULT 0,
    signup_date timestamp without time zone,
    first_paid_date timestamp without time zone,
    total_revenue_generated numeric(10,2) DEFAULT '0'::numeric,
    total_commission_earned numeric(10,2) DEFAULT '0'::numeric,
    commission_percentage numeric(5,2) DEFAULT 10.00,
    status public.referral_status DEFAULT 'active'::public.referral_status,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    commission_earned numeric(10,2) DEFAULT 0
);


ALTER TABLE public.creator_referrals OWNER TO neondb_owner;

--
-- Name: COLUMN creator_referrals.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.creator_referrals.deleted_at IS 'Soft delete for analytics. Keep referral history. NULL = active';


--
-- Name: COLUMN creator_referrals.commission_earned; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.creator_referrals.commission_earned IS 'Total commission earned from this referral in dollars/currency';


--
-- Name: creator_task_referrals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.creator_task_referrals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    creator_id character varying NOT NULL,
    task_id character varying,
    campaign_id character varying,
    referring_fan_id character varying NOT NULL,
    referred_fan_id character varying,
    referral_code character varying(100) NOT NULL,
    referral_url text NOT NULL,
    referral_type character varying(20) NOT NULL,
    click_count integer DEFAULT 0,
    signup_date timestamp without time zone,
    joined_creator_date timestamp without time zone,
    completed_task_date timestamp without time zone,
    total_creator_points_earned integer DEFAULT 0,
    share_percentage numeric(5,2) DEFAULT '0'::numeric,
    share_expires_at timestamp without time zone,
    status public.referral_status DEFAULT 'pending'::public.referral_status,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.creator_task_referrals OWNER TO neondb_owner;

--
-- Name: creators; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.creators (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    display_name text NOT NULL,
    bio text,
    category text NOT NULL,
    image_url text,
    follower_count integer DEFAULT 0,
    type_specific_data jsonb,
    brand_colors jsonb,
    social_links jsonb,
    is_verified boolean DEFAULT false,
    verification_data jsonb DEFAULT '{"profileComplete": false, "completionPercentage": 0, "requiredFieldsFilled": []}'::jsonb,
    public_page_settings jsonb DEFAULT '{"showAbout": true, "showTasks": true, "showRewards": true, "showAnalytics": false, "showCommunity": true, "showSocialPosts": true}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.creators OWNER TO neondb_owner;

--
-- Name: COLUMN creators.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.creators.deleted_at IS 'Soft delete timestamp. NULL = active creator, timestamp = deleted creator';


--
-- Name: COLUMN creators.updated_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.creators.updated_at IS 'Timestamp of last update. Auto-updated by trigger on row modification.';


--
-- Name: fan_programs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fan_programs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    fan_id character varying NOT NULL,
    program_id character varying NOT NULL,
    current_points integer DEFAULT 0,
    total_points_earned integer DEFAULT 0,
    current_tier text,
    joined_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.fan_programs OWNER TO neondb_owner;

--
-- Name: COLUMN fan_programs.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.fan_programs.deleted_at IS 'Soft delete timestamp. NULL = active membership. Can restore if user rejoins';


--
-- Name: fan_referrals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fan_referrals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    referring_fan_id character varying NOT NULL,
    referred_fan_id character varying,
    referral_code character varying(50) NOT NULL,
    referral_url text NOT NULL,
    click_count integer DEFAULT 0,
    signup_date timestamp without time zone,
    first_task_completed_at timestamp without time zone,
    profile_completed_at timestamp without time zone,
    total_points_referred_user_earned integer DEFAULT 0,
    total_points_referrer_earned integer DEFAULT 0,
    percentage_rewards_enabled boolean DEFAULT false,
    percentage_value numeric(5,2) DEFAULT '0'::numeric,
    percentage_expires_at timestamp without time zone,
    status public.referral_status DEFAULT 'pending'::public.referral_status,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text
);


ALTER TABLE public.fan_referrals OWNER TO neondb_owner;

--
-- Name: COLUMN fan_referrals.updated_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.fan_referrals.updated_at IS 'Timestamp of last update. Tracks referral status and reward changes.';


--
-- Name: COLUMN fan_referrals.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.fan_referrals.deleted_at IS 'Soft delete for analytics. Keep referral history. NULL = active';


--
-- Name: fandomly_badge_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fandomly_badge_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    requirement_type text NOT NULL,
    requirement_data jsonb,
    image_url text NOT NULL,
    badge_color text,
    nft_metadata jsonb,
    collection_id character varying,
    is_active boolean DEFAULT true,
    total_issued integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.fandomly_badge_templates OWNER TO neondb_owner;

--
-- Name: loyalty_programs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.loyalty_programs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    creator_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    points_name text DEFAULT 'Points'::text,
    tiers jsonb,
    created_at timestamp without time zone DEFAULT now(),
    page_config jsonb,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp without time zone,
    slug text,
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text
);


ALTER TABLE public.loyalty_programs OWNER TO neondb_owner;

--
-- Name: COLUMN loyalty_programs.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.loyalty_programs.deleted_at IS 'Soft delete timestamp. NULL = active program';


--
-- Name: nft_collections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.nft_collections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    creator_id character varying,
    tenant_id character varying NOT NULL,
    crossmint_collection_id text,
    name text NOT NULL,
    description text,
    symbol text,
    chain text NOT NULL,
    contract_address text,
    token_type public.nft_token_type DEFAULT 'ERC721'::public.nft_token_type NOT NULL,
    is_creator_owned boolean DEFAULT true,
    owner_wallet_address text,
    metadata jsonb,
    is_active boolean DEFAULT true,
    deployed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nft_collections OWNER TO neondb_owner;

--
-- Name: nft_deliveries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.nft_deliveries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    mint_id character varying NOT NULL,
    user_id character varying NOT NULL,
    collection_id character varying NOT NULL,
    token_id text NOT NULL,
    tx_hash text NOT NULL,
    chain text NOT NULL,
    contract_address text NOT NULL,
    metadata_snapshot jsonb NOT NULL,
    is_viewed boolean DEFAULT false,
    viewed_at timestamp without time zone,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp without time zone,
    delivered_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nft_deliveries OWNER TO neondb_owner;

--
-- Name: nft_mints; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.nft_mints (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    crossmint_action_id text NOT NULL,
    collection_id character varying NOT NULL,
    template_id character varying,
    badge_template_id character varying,
    recipient_user_id character varying NOT NULL,
    recipient_wallet_address text NOT NULL,
    recipient_chain text NOT NULL,
    mint_reason text NOT NULL,
    context_data jsonb,
    token_id text,
    tx_hash text,
    contract_address text,
    status public.nft_mint_status DEFAULT 'pending'::public.nft_mint_status NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nft_mints OWNER TO neondb_owner;

--
-- Name: nft_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.nft_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    collection_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    category public.nft_category DEFAULT 'custom'::public.nft_category NOT NULL,
    metadata jsonb NOT NULL,
    mint_price integer DEFAULT 0,
    max_supply integer,
    current_supply integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_draft boolean DEFAULT true,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nft_templates OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    tenant_id character varying,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    read boolean DEFAULT false,
    read_at timestamp without time zone,
    sent_via jsonb DEFAULT '{"sms": false, "push": true, "email": false}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: platform_points_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.platform_points_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    points integer NOT NULL,
    source character varying NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.platform_points_transactions OWNER TO neondb_owner;

--
-- Name: TABLE platform_points_transactions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.platform_points_transactions IS 'Platform-wide points transactions separate from creator loyalty programs';


--
-- Name: COLUMN platform_points_transactions.source; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.platform_points_transactions.source IS 'Source of points: task_completion, daily_bonus, referral, admin_grant, etc.';


--
-- Name: platform_task_completions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.platform_task_completions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    user_id character varying NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    points_awarded integer DEFAULT 0,
    completion_data jsonb,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.platform_task_completions OWNER TO neondb_owner;

--
-- Name: platform_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.platform_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    points integer DEFAULT 50 NOT NULL,
    required_fields jsonb DEFAULT '[]'::jsonb,
    social_platform text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    creator_id character varying
);


ALTER TABLE public.platform_tasks OWNER TO neondb_owner;

--
-- Name: COLUMN platform_tasks.creator_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.platform_tasks.creator_id IS 'Optional: Creator ID if this platform task is creator-specific. NULL for system-wide tasks.';


--
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.point_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    fan_program_id character varying NOT NULL,
    points integer NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.point_transactions OWNER TO neondb_owner;

--
-- Name: program_announcements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.program_announcements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    program_id character varying NOT NULL,
    creator_id character varying NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'update'::text NOT NULL,
    metadata jsonb,
    is_pinned boolean DEFAULT false,
    is_published boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.program_announcements OWNER TO neondb_owner;

--
-- Name: reward_distributions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reward_distributions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    task_id character varying NOT NULL,
    task_completion_id character varying,
    tenant_id character varying NOT NULL,
    reward_type text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'default'::text,
    reason text NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reward_distributions OWNER TO neondb_owner;

--
-- Name: reward_redemptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reward_redemptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    fan_id character varying NOT NULL,
    reward_id character varying NOT NULL,
    points_spent integer NOT NULL,
    status text DEFAULT 'pending'::text,
    redemption_data jsonb,
    redeemed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reward_redemptions OWNER TO neondb_owner;

--
-- Name: rewards; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rewards (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    program_id character varying NOT NULL,
    name text NOT NULL,
    description text,
    points_cost integer NOT NULL,
    reward_type text NOT NULL,
    reward_data jsonb,
    max_redemptions integer,
    current_redemptions integer DEFAULT 0,
    required_tier text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rewards OWNER TO neondb_owner;

--
-- Name: social_campaign_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.social_campaign_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    platform public.social_platform NOT NULL,
    task_type public.task_type NOT NULL,
    display_order integer DEFAULT 1,
    target_url text,
    hashtags jsonb,
    invite_code text,
    custom_instructions text,
    reward_type public.reward_type DEFAULT 'points'::public.reward_type NOT NULL,
    reward_metadata jsonb,
    requires_manual_verification boolean DEFAULT false,
    verification_instructions text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.social_campaign_tasks OWNER TO neondb_owner;

--
-- Name: social_connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.social_connections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    platform text NOT NULL,
    platform_user_id text,
    platform_username text,
    platform_display_name text,
    access_token text,
    refresh_token text,
    token_expires_at timestamp without time zone,
    profile_data jsonb,
    connected_at timestamp without time zone DEFAULT now(),
    last_synced_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.social_connections OWNER TO neondb_owner;

--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.task_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    task_id character varying NOT NULL,
    campaign_id character varying NOT NULL,
    display_order integer DEFAULT 1,
    is_active boolean DEFAULT true,
    custom_reward_value integer,
    custom_instructions text,
    assigned_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    user_id character varying
);


ALTER TABLE public.task_assignments OWNER TO neondb_owner;

--
-- Name: COLUMN task_assignments.user_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_assignments.user_id IS 'User ID to whom this task is assigned';


--
-- Name: task_completions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.task_completions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying NOT NULL,
    user_id character varying NOT NULL,
    tenant_id character varying NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    progress integer DEFAULT 0,
    completion_data jsonb,
    points_earned integer DEFAULT 0,
    total_rewards_earned integer DEFAULT 0,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    last_activity_at timestamp without time zone DEFAULT now(),
    verified_at timestamp without time zone,
    verification_method text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_completions OWNER TO neondb_owner;

--
-- Name: COLUMN task_completions.updated_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.task_completions.updated_at IS 'Timestamp of last update. Tracks progress updates and status changes.';


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.task_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'social'::text NOT NULL,
    platform public.social_platform NOT NULL,
    task_type public.task_type NOT NULL,
    default_config jsonb,
    is_global boolean DEFAULT true NOT NULL,
    tenant_id character varying,
    creator_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_templates OWNER TO neondb_owner;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ownership_level public.task_ownership DEFAULT 'creator'::public.task_ownership NOT NULL,
    tenant_id character varying,
    creator_id character varying,
    name text NOT NULL,
    description text NOT NULL,
    section public.task_section DEFAULT 'custom'::public.task_section NOT NULL,
    task_type public.task_type NOT NULL,
    platform public.social_platform NOT NULL,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    is_required boolean DEFAULT false,
    hide_from_ui boolean DEFAULT false,
    reward_type public.reward_type DEFAULT 'points'::public.reward_type NOT NULL,
    points_to_reward integer DEFAULT 50,
    point_currency text DEFAULT 'default'::text,
    multiplier_value numeric(4,2),
    currencies_to_apply jsonb,
    apply_to_existing_balance boolean DEFAULT false,
    update_cadence public.update_cadence DEFAULT 'immediate'::public.update_cadence NOT NULL,
    reward_frequency public.reward_frequency DEFAULT 'one_time'::public.reward_frequency NOT NULL,
    target_url text,
    hashtags jsonb,
    invite_code text,
    custom_instructions text,
    custom_settings jsonb,
    is_active boolean DEFAULT true,
    is_draft boolean DEFAULT false,
    total_completions integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    program_id character varying,
    campaign_id character varying,
    eligible_account_types jsonb DEFAULT '["fan"]'::jsonb,
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    base_multiplier numeric(10,2) DEFAULT 1.00,
    multiplier_config jsonb
);


ALTER TABLE public.tasks OWNER TO neondb_owner;

--
-- Name: COLUMN tasks.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.deleted_at IS 'Soft delete timestamp. NULL = active task. Query with WHERE deleted_at IS NULL';


--
-- Name: COLUMN tasks.base_multiplier; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.base_multiplier IS 'Task-specific base multiplier for points (e.g., 1.5x for premium tasks)';


--
-- Name: COLUMN tasks.multiplier_config; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tasks.multiplier_config IS 'Multiplier configuration: stackingType, maxMultiplier, allowEventMultipliers';


--
-- Name: tenant_memberships; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant_memberships (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying NOT NULL,
    user_id character varying NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    member_data jsonb DEFAULT '{"tier": "basic", "points": 0}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    joined_at timestamp without time zone DEFAULT now(),
    last_active_at timestamp without time zone DEFAULT now(),
    is_agency_manager boolean DEFAULT false,
    managed_by character varying,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_memberships OWNER TO neondb_owner;

--
-- Name: COLUMN tenant_memberships.is_agency_manager; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tenant_memberships.is_agency_manager IS 'True if user is managing this tenant on behalf of a client/brand (agency use case).';


--
-- Name: COLUMN tenant_memberships.managed_by; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tenant_memberships.managed_by IS 'User ID of the agency owner managing this tenant membership.';


--
-- Name: COLUMN tenant_memberships.created_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tenant_memberships.created_at IS 'Timestamp when the tenant membership was created';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenants (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(100) NOT NULL,
    name text NOT NULL,
    domain text,
    owner_id character varying NOT NULL,
    status public.tenant_status DEFAULT 'trial'::public.tenant_status NOT NULL,
    subscription_tier public.subscription_tier DEFAULT 'starter'::public.subscription_tier NOT NULL,
    subscription_status text DEFAULT 'trial'::text,
    branding jsonb,
    business_info jsonb,
    limits jsonb,
    usage jsonb DEFAULT '{"storageUsed": 0, "currentMembers": 0, "currentRewards": 0, "currentCampaigns": 0, "apiCallsThisMonth": 0}'::jsonb,
    billing_info jsonb,
    settings jsonb DEFAULT '{"currency": "USD", "language": "en", "timezone": "UTC", "nilCompliance": false, "publicProfile": true, "allowRegistration": true, "enableSocialLogin": true, "requireEmailVerification": false}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text
);


ALTER TABLE public.tenants OWNER TO neondb_owner;

--
-- Name: COLUMN tenants.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.tenants.deleted_at IS 'Soft delete timestamp. Prevents accidental tenant deletion. NULL = active tenant';


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_achievements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    achievement_id character varying,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    claimed boolean DEFAULT false,
    claimed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    updated_at timestamp without time zone DEFAULT now(),
    earned_at timestamp without time zone
);


ALTER TABLE public.user_achievements OWNER TO neondb_owner;

--
-- Name: COLUMN user_achievements.earned_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.user_achievements.earned_at IS 'Timestamp when the achievement was earned/completed';


--
-- Name: user_levels; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_levels (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    tenant_id character varying,
    current_level integer DEFAULT 1,
    total_points integer DEFAULT 0,
    level_points integer DEFAULT 0,
    next_level_threshold integer DEFAULT 1000,
    achievements_unlocked integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_levels OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    dynamic_user_id text,
    email text,
    username text NOT NULL,
    avatar text,
    wallet_address text,
    wallet_chain text,
    user_type text DEFAULT 'fan'::text NOT NULL,
    profile_data jsonb,
    current_tenant_id character varying,
    role public.user_role DEFAULT 'customer_end_user'::public.user_role NOT NULL,
    customer_tier public.customer_tier DEFAULT 'basic'::public.customer_tier,
    onboarding_state jsonb DEFAULT '{"totalSteps": 5, "currentStep": 0, "isCompleted": false, "completedSteps": []}'::jsonb,
    admin_permissions jsonb,
    customer_admin_data jsonb,
    notification_preferences jsonb DEFAULT '{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    brand_type text,
    agency_id character varying,
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deletion_reason text,
    updated_at timestamp without time zone DEFAULT now(),
    last_active_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: COLUMN users.brand_type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.brand_type IS 'Type of brand user: single brand or agency managing multiple. NULL for non-brand users (fans/individual creators).';


--
-- Name: COLUMN users.agency_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.agency_id IS 'Reference to agency if user is managing brands through an agency.';


--
-- Name: COLUMN users.deleted_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.deleted_at IS 'Soft delete timestamp. NULL = active user, timestamp = deleted user';


--
-- Name: COLUMN users.deleted_by; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.deleted_by IS 'User ID who performed the deletion (admin, self-delete, etc.)';


--
-- Name: COLUMN users.deletion_reason; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.deletion_reason IS 'Reason for deletion: account_closure, gdpr_request, policy_violation, spam, etc.';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.updated_at IS 'Timestamp of last update. Auto-updated by trigger on row modification.';


--
-- Name: COLUMN users.last_active_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.last_active_at IS 'Timestamp of last user activity (login, action, etc.). Updated by application.';


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.achievements (id, tenant_id, name, description, icon, category, type, points_required, action_required, action_count, reward_points, reward_type, reward_value, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: active_multipliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.active_multipliers (id, tenant_id, name, description, type, multiplier, conditions, stacking_type, priority, can_stack_with_others, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agencies (id, name, owner_user_id, website, business_info, allow_cross_brand_analytics, data_isolation_level, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agency_tenants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agency_tenants (id, agency_id, tenant_id, relationship_type, start_date, end_date, created_at) FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_log (id, user_id, user_role, action, resource, resource_id, tenant_id, changes, metadata, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: campaign_participations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaign_participations (id, tenant_id, campaign_id, member_id, participation_count, last_participation, total_units_earned, participation_data, created_at) FROM stdin;
\.


--
-- Data for Name: campaign_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaign_rules (id, campaign_id, rule_order, conditions, effects, created_at) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaigns (id, tenant_id, creator_id, name, description, display_order, campaign_type, trigger, start_date, end_date, status, visibility, visibility_rules, custom_attributes, transaction_filters, global_budget, per_member_limit, total_issued, total_participants, campaign_types, reward_structure, prerequisite_campaigns, all_tasks_required, created_at, updated_at, program_id) FROM stdin;
\.


--
-- Data for Name: check_in_streaks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.check_in_streaks (id, user_id, task_id, tenant_id, current_streak, longest_streak, total_check_ins, last_check_in, last_streak_reset, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: creator_facebook_pages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.creator_facebook_pages (id, creator_id, page_id, name, access_token, followers_count, fan_count, instagram_business_account_id, connected_instagram_account_id, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: creator_referrals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.creator_referrals (id, referring_creator_id, referred_creator_id, referral_code, referral_url, click_count, signup_date, first_paid_date, total_revenue_generated, total_commission_earned, commission_percentage, status, expires_at, created_at, updated_at, deleted_at, deleted_by, deletion_reason, commission_earned) FROM stdin;
8d723352-8c71-48dd-80c7-e74a4572e8f0	34407d33-d12a-45c9-bd66-89581ba67879	\N	CREATOR9YQUDIYJD	https://fandomly.ai?ref=creator9yqudiyjd	0	\N	\N	0.00	0.00	10.00	active	\N	2025-10-17 16:25:56.220133	2025-10-17 16:25:56.220133	\N	\N	\N	0.00
8738b0c7-5158-46a4-b193-eb1a5c3d4f55	50429930-9264-405f-9c14-49c72a1a5ccc	\N	CREATOR1CVI3C0WT	https://fandomly.ai?ref=creator1cvi3c0wt	0	\N	\N	0.00	0.00	10.00	active	\N	2025-11-03 20:39:06.688428	2025-11-03 20:39:06.688428	\N	\N	\N	0.00
\.


--
-- Data for Name: creator_task_referrals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.creator_task_referrals (id, creator_id, task_id, campaign_id, referring_fan_id, referred_fan_id, referral_code, referral_url, referral_type, click_count, signup_date, joined_creator_date, completed_task_date, total_creator_points_earned, share_percentage, share_expires_at, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: creators; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.creators (id, user_id, tenant_id, display_name, bio, category, image_url, follower_count, type_specific_data, brand_colors, social_links, is_verified, verification_data, public_page_settings, created_at, deleted_at, deleted_by, deletion_reason, updated_at) FROM stdin;
80405fdd-1f92-48dc-8ba8-6e711330a3ff	d80739c2-086a-40aa-995e-69826ec73b99	aab20692-6a4b-463b-98ea-bb984c635cdc	Nike		brand	\N	0	{"brand": {"brandName": "Nike", "brandType": "single", "brandWebsite": "www.nike.com", "brandDescription": "", "brandIdentifiers": ["technology", "gaming", "bitches", "hoes"]}}	{"accent": "#10B981", "primary": "#8B5CF6", "secondary": "#06B6D4"}	{}	f	{"profileComplete": false, "completionPercentage": 0, "requiredFieldsFilled": []}	{"showAbout": true, "showTasks": true, "showRewards": true, "showAnalytics": false, "showCommunity": true, "showSocialPosts": true}	2025-11-08 23:41:54.301042	\N	\N	\N	2025-11-10 21:23:02.531221
34407d33-d12a-45c9-bd66-89581ba67879	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	5d1d9492-948d-430c-a6df-d16df09f299a	Shea Curran	Greatest footballer to ever exist on this planet! Welcome to my Fandomly page!	athlete	/api/storage/avatars/c4f29d45-fbbe-4553-9b12-edd637f0d8a5/1760496463988.jpg	23451	{"athlete": {"sport": "Soccer", "position": "Forward", "education": {"grade": "junior", "level": "high_school", "school": "University of Cincinnati"}, "personalLinks": [], "currentSponsors": []}}	{"accent": "#0af570", "primary": "#ff4dde", "secondary": "#000000"}	{}	f	{"missingFields": ["socialMedia (at least 1 required)"], "profileComplete": false, "completionPercentage": 86, "requiredFieldsFilled": ["displayName", "bio", "imageUrl", "category", "sport", "education"]}	{"showAbout": true, "showTasks": true, "showRewards": true, "showAnalytics": false, "showCommunity": true, "showSocialPosts": true}	2025-10-11 02:56:05.056401	\N	\N	\N	2025-11-10 21:23:02.531221
50429930-9264-405f-9c14-49c72a1a5ccc	82fc8b43-71f0-43b1-986c-d33351b4e2b8	bba5f07e-cee1-4dfd-8285-e1c2e4271728	Shane Sucks (JK)	asdasd	athlete	\N	0	{"athlete": {"sport": "Skateboarding", "ageRange": "unknown", "position": "Forward", "education": {"grade": "senior", "level": "college_d2", "school": "University of Cincinnati"}, "nilCompliant": false, "currentSponsors": ["Nike"]}}	{"accent": "#f59e0b", "primary": "#6366f1", "secondary": "#10b981"}	{}	f	{"profileComplete": false, "completionPercentage": 0, "requiredFieldsFilled": []}	{"showAbout": true, "showTasks": true, "showRewards": true, "showAnalytics": false, "showCommunity": true, "showSocialPosts": true}	2025-11-03 20:33:52.255004	\N	\N	\N	2025-11-10 21:23:02.531221
373ac899-19b8-4ef6-84dd-9393b7eaa7e1	55c7a160-b626-4eab-b51c-0df9ff72975b	ceda613b-b563-41df-bef4-0d45212824a4	App Land		content_creator	\N	0	{"contentCreator": {"platforms": ["Instagram", "OnlyFans", "TikTok", "Snapchat"], "totalViews": "unknown", "contentType": [""], "sponsorships": [""], "topicsOfFocus": ["blogs", "journalism", "creative-writing", "guides-how-tos", "academics"]}}	{"accent": "#f59e0b", "primary": "#6366f1", "secondary": "#10b981"}	{}	f	{"profileComplete": false, "completionPercentage": 0, "requiredFieldsFilled": []}	{"showAbout": true, "showTasks": true, "showRewards": true, "showAnalytics": false, "showCommunity": true, "showSocialPosts": true}	2025-11-04 23:36:31.742919	\N	\N	\N	2025-11-10 21:23:02.531221
\.


--
-- Data for Name: fan_programs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fan_programs (id, tenant_id, fan_id, program_id, current_points, total_points_earned, current_tier, joined_at, deleted_at, deleted_by, deletion_reason, updated_at) FROM stdin;
9abde669-8903-4d70-8fc1-426286803f58	5d1d9492-948d-430c-a6df-d16df09f299a	210dd995-04df-4beb-be98-62f11e8250b0	5e81956b-0691-454f-9cea-acbf91acf515	0	0	\N	2025-11-06 17:27:41.01265	\N	\N	\N	2025-11-10 21:23:02.828464
cd25b9a4-07e7-48dd-b55b-ab0d24af7fed	bba5f07e-cee1-4dfd-8285-e1c2e4271728	210dd995-04df-4beb-be98-62f11e8250b0	6a3f127f-49ce-45d7-b62d-8e26658aebab	0	0	\N	2025-11-06 18:43:48.988005	\N	\N	\N	2025-11-10 21:23:02.828464
d62470de-03ff-40e5-b9f8-37b5d6c83c2a	ceda613b-b563-41df-bef4-0d45212824a4	210dd995-04df-4beb-be98-62f11e8250b0	07cb4814-0c35-4852-ab1b-7f6011ad5a27	0	0	\N	2025-11-06 23:47:25.44863	\N	\N	\N	2025-11-10 21:23:02.828464
\.


--
-- Data for Name: fan_referrals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fan_referrals (id, referring_fan_id, referred_fan_id, referral_code, referral_url, click_count, signup_date, first_task_completed_at, profile_completed_at, total_points_referred_user_earned, total_points_referrer_earned, percentage_rewards_enabled, percentage_value, percentage_expires_at, status, created_at, updated_at, deleted_at, deleted_by, deletion_reason) FROM stdin;
3884fbb5-35c3-40e8-9c26-33aea1154699	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	\N	FANWTX8I3O84	https://fandomly.ai?fanref=fanwtx8i3o84	0	\N	\N	\N	0	0	t	5.00	2025-11-14 02:45:06.916	pending	2025-10-15 02:45:06.949671	2025-10-15 02:45:06.949671	\N	\N	\N
83f18dad-a80e-483c-a764-8bd838a664f8	2260625f-61f4-4a78-b335-cb413cc26aed	\N	FANPTX3LEV0D	https://fandomly.ai?fanref=fanptx3lev0d	0	\N	\N	\N	0	0	t	5.00	2025-11-26 18:57:05.345	pending	2025-10-27 18:57:05.381036	2025-10-27 18:57:05.381036	\N	\N	\N
9114571b-e9a0-40d6-93c2-5e6c02af4249	210dd995-04df-4beb-be98-62f11e8250b0	\N	FANM4RPNHP27	https://fandomly.ai?fanref=fanm4rpnhp27	0	\N	\N	\N	0	0	t	5.00	2025-11-27 17:42:25.567	pending	2025-10-28 17:42:25.601533	2025-10-28 17:42:25.601533	\N	\N	\N
\.


--
-- Data for Name: fandomly_badge_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fandomly_badge_templates (id, name, description, category, requirement_type, requirement_data, image_url, badge_color, nft_metadata, collection_id, is_active, total_issued, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: loyalty_programs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.loyalty_programs (id, tenant_id, creator_id, name, description, is_active, points_name, tiers, created_at, page_config, status, published_at, slug, updated_at, deleted_at, deleted_by, deletion_reason) FROM stdin;
6a3f127f-49ce-45d7-b62d-8e26658aebab	bba5f07e-cee1-4dfd-8285-e1c2e4271728	50429930-9264-405f-9c14-49c72a1a5ccc	Shane's AWESOME points		f	AWESOME	\N	2025-11-03 20:35:58.002916	\N	draft	\N	shane-s-awesome-points	2025-11-03 20:35:58.002916	\N	\N	\N
07cb4814-0c35-4852-ab1b-7f6011ad5a27	ceda613b-b563-41df-bef4-0d45212824a4	373ac899-19b8-4ef6-84dd-9393b7eaa7e1	App Land's Loyalty Program	Loyalty to your app LAND!	f	LAND	\N	2025-11-04 23:37:26.498521	{"logo": "/api/storage/avatars/55c7a160-b626-4eab-b51c-0df9ff72975b/1762299497739.png", "brandColors": {"accent": "#F59E0B", "primary": "#8B5CF6", "secondary": "#EC4899"}, "headerImage": "/api/storage/banners/55c7a160-b626-4eab-b51c-0df9ff72975b/1762299486323.jpg"}	draft	\N	app-land-s-loyalty-program	2025-11-04 23:38:51.564	\N	\N	\N
8fee3a4b-0fcc-4d5a-882b-917d90cd0c3b	aab20692-6a4b-463b-98ea-bb984c635cdc	80405fdd-1f92-48dc-8ba8-6e711330a3ff	Nike Loyalty & Rewards	Nike loyalty and rewards program	f	Nike Points	\N	2025-11-08 23:46:56.508882	\N	draft	\N	nike-loyalty-rewards	2025-11-08 23:46:56.508882	\N	\N	\N
5e81956b-0691-454f-9cea-acbf91acf515	5d1d9492-948d-430c-a6df-d16df09f299a	34407d33-d12a-45c9-bd66-89581ba67879	Nay Nay Nanners	Loyalty rewards for being my fan! BOATS N HOES	t	Nay-Nay Points	\N	2025-10-14 18:32:53.596762	{"logo": "/api/storage/avatars/c4f29d45-fbbe-4553-9b12-edd637f0d8a5/1760573369433.png", "theme": {"mode": "dark", "textColor": "#ffffff", "backgroundColor": "#0f172a"}, "visibility": {"showTasks": true, "profileData": {"showBio": true, "showTiers": true, "showSocialLinks": true, "showVerificationBadge": true}, "showProfile": true, "showRewards": false, "showCampaigns": false, "showFanWidget": true, "showLeaderboard": false, "showActivityFeed": true}, "brandColors": {"accent": "#f0abfc", "primary": "#a855f7", "secondary": "#d946ef"}, "headerImage": "/api/storage/banners/c4f29d45-fbbe-4553-9b12-edd637f0d8a5/1760573354192.jpg"}	published	2025-10-14 18:33:42.523	shea-test	2025-11-15 03:04:23.821302	\N	\N	\N
\.


--
-- Data for Name: nft_collections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.nft_collections (id, creator_id, tenant_id, crossmint_collection_id, name, description, symbol, chain, contract_address, token_type, is_creator_owned, owner_wallet_address, metadata, is_active, deployed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nft_deliveries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.nft_deliveries (id, mint_id, user_id, collection_id, token_id, tx_hash, chain, contract_address, metadata_snapshot, is_viewed, viewed_at, notification_sent, notification_sent_at, delivered_at, created_at) FROM stdin;
\.


--
-- Data for Name: nft_mints; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.nft_mints (id, crossmint_action_id, collection_id, template_id, badge_template_id, recipient_user_id, recipient_wallet_address, recipient_chain, mint_reason, context_data, token_id, tx_hash, contract_address, status, error_message, retry_count, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: nft_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.nft_templates (id, collection_id, tenant_id, name, description, category, metadata, mint_price, max_supply, current_supply, is_active, is_draft, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, tenant_id, type, title, message, metadata, read, read_at, sent_via, created_at) FROM stdin;
\.


--
-- Data for Name: platform_points_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.platform_points_transactions (id, user_id, points, source, description, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: platform_task_completions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.platform_task_completions (id, task_id, user_id, status, points_awarded, completion_data, started_at, completed_at, verified_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: platform_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.platform_tasks (id, name, description, type, category, points, required_fields, social_platform, is_active, created_at, updated_at, deleted_at, deleted_by, deletion_reason, creator_id) FROM stdin;
db0b6ae1-1c16-46c9-b327-4d1245fea4d1	Connect Instagram	Reward fans for connecting their Instagram account	social	Social Connection	100	[]	instagram	t	2025-10-28 23:36:41.42	2025-10-28 23:36:41.452939	\N	\N	\N	\N
39d30c58-55a1-4fac-b772-4790aa6cc873	Connect Spotify	Reward fans for connecting their Spotify account	social	Social Connection	100	[]	spotify	t	2025-10-28 23:36:51.464	2025-10-28 23:36:51.49809	\N	\N	\N	\N
4273d84d-5b2e-417d-bafd-de7eb6358410	Add Profile Photo	Reward fans for adding a profile photo	profile	Profile Completion	50	["profile_photo"]	\N	t	2025-10-28 23:36:58.291	2025-10-28 23:36:58.32496	\N	\N	\N	\N
2907db52-82be-4e9c-8a11-625aa65b16f7	Connect Twitter	Reward fans for connecting their Twitter account	social	Social Connection	100	[]	twitter	t	2025-10-28 23:37:04.166	2025-10-28 23:37:04.199719	\N	\N	\N	\N
9a2d7712-0c31-4559-84d6-aa2aa53f3d99	Connect Facebook	Reward fans for connecting their Facebook account	social	Social Connection	100	[]	facebook	t	2025-10-28 23:37:09.919	2025-10-28 23:37:09.953	\N	\N	\N	\N
c4cff19f-2fd5-472e-b2f2-3466279480ed	Complete First Task	Reward fans for completing their first task	engagement	Engagement	200	[]	\N	t	2025-10-28 23:37:14.891	2025-10-28 23:37:14.924797	\N	\N	\N	\N
2e7f4c8b-18af-4ae2-8a61-f4e4dbcdea2b	Follow Fandomly on Instagram	Reward users for following Fandomly's Instagram account	social	Platform Engagement	50	[]	instagram	t	2025-10-29 21:34:26.612	2025-10-29 21:34:26.647004	\N	\N	\N	\N
\.


--
-- Data for Name: point_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.point_transactions (id, tenant_id, fan_program_id, points, type, source, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: program_announcements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.program_announcements (id, program_id, creator_id, title, content, type, metadata, is_pinned, is_published, created_at, updated_at) FROM stdin;
fbe6335c-0228-4b5f-a8cb-5013711c5ab5	5e81956b-0691-454f-9cea-acbf91acf515	34407d33-d12a-45c9-bd66-89581ba67879	I AM ABOUT TO SHIT MY PANTS!	We are going to THE TOP!	update	\N	t	t	2025-10-16 00:02:25.618219	2025-10-16 00:02:25.618219
328faa97-769b-476f-8db8-015c6ff0a530	5e81956b-0691-454f-9cea-acbf91acf515	34407d33-d12a-45c9-bd66-89581ba67879	NEW SPONSORSHIP	I am happy to announce I have been sponsored by Bass Pro Shops!	update	\N	t	t	2025-10-16 00:43:31.271374	2025-10-16 00:43:31.271374
\.


--
-- Data for Name: reward_distributions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reward_distributions (id, user_id, task_id, task_completion_id, tenant_id, reward_type, amount, currency, reason, description, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: reward_redemptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reward_redemptions (id, tenant_id, fan_id, reward_id, points_spent, status, redemption_data, redeemed_at) FROM stdin;
\.


--
-- Data for Name: rewards; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rewards (id, tenant_id, program_id, name, description, points_cost, reward_type, reward_data, max_redemptions, current_redemptions, required_tier, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: social_campaign_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.social_campaign_tasks (id, tenant_id, campaign_id, platform, task_type, display_order, target_url, hashtags, invite_code, custom_instructions, reward_type, reward_metadata, requires_manual_verification, verification_instructions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: social_connections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.social_connections (id, user_id, platform, platform_user_id, platform_username, platform_display_name, access_token, refresh_token, token_expires_at, profile_data, connected_at, last_synced_at, is_active, created_at, updated_at) FROM stdin;
bc65c080-3555-4520-885d-5752a688944f	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	youtube	UCu96nWT4tO1sHn6Nh6k40YQ	@sheacurran	Shea Curran	ya29.a0ATi6K2uSHdOSla4LCVor2QJQI0i-t3bus9RC56ftK3IM7omXQWDBi0Mcw6Nf8pE2CYX7Q_Jkvc8qfSaoNhRU0CDuxdLNAvFV3IHhATyDgZr1fP4x6VH9kiyg4Y1HdSNcQgrMfFFTmmHtiejpNNc6JXdUg-1swD3qlw8ftK_8_ksXmfsagVnNnwKWqFfv4uzpDLKsOIgaCgYKAX0SARQSFQHGX2MiqcTpK1VabSay-LXV4GKogg0206	1//05csROiVmjN3LCgYIARAAGAUSNwF-L9Irm6bsKGzbHs8Ay7MJAlvhOnKVm97y1yStmdFqv9bzbFccDzYI7ImG0RGvmAx6ahj3PaU	2025-10-25 19:36:20.236	{"id": "UCu96nWT4tO1sHn6Nh6k40YQ", "name": "Shea Curran", "title": "Shea Curran", "verified": false, "followers": 10, "description": "Master Dabbler", "channelTitle": "Shea Curran", "follower_count": 10, "subscriberCount": 10, "profilePictureUrl": "https://yt3.ggpht.com/ytc/AIdro_mR1ppHDeaVOtEjs8MTn34-Rb6bAiVNgSSnatGq68mEnkI=s88-c-k-c0x00ffffff-no-rj"}	2025-10-25 18:15:48.575642	2025-10-25 18:36:20.508	t	2025-10-25 18:15:48.575642	2025-10-25 18:36:20.508
7617b597-ae6d-4eeb-b194-d96fec12d6ec	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	spotify	31ih4hq7wnfbcjg5yjbdohlhhbje	31ih4hq7wnfbcjg5yjbdohlhhbje	Shea Curran	BQBrFIozlep2FrtEL7z7WMHmkDJnX5sc6SgR32i8lBMSAcFq75U5U0kI8eOg2vNLxmodpoZKL0QYPwNEFAtYhOWw_74zvcpLIRuJbF_apJnEgnw3z0j8ZoeyorawJn8eCFCec6qYGSw2bjs4AO5HzV93zWT1ib0OCNvL0aZN9u_lX_YkvEIrKBr0k-tG6fgxkJsqEoPnKIveo7vQnkPHlpFGxJhePKxVEV5boQzvLqNUXMFpzLzhUHQdcY4xnUzJ7RNUp8tsEQRnSnTwrnQiNim1asC23zc	AQCe6x9M_3ow_sHCGa2EHxSCuPYrDouRTFIlkhYIQmP4DttfL7tcTrcA3wFwyH-v3gqchdZk6PwkT97JH91Zv4zDfras0OWaLPs8xaVW8uTzibdpuA62HJywJPcwoBZuMUo	2025-10-25 19:36:31.11	{"id": "31ih4hq7wnfbcjg5yjbdohlhhbje", "name": "Shea Curran", "email": "shea@atgconsulting.io", "country": "US", "product": "free", "username": "31ih4hq7wnfbcjg5yjbdohlhhbje", "verified": false, "followers": 0, "display_name": "Shea Curran", "follower_count": 0}	2025-10-25 18:16:03.0187	2025-10-25 18:36:30.381	t	2025-10-25 18:16:03.0187	2025-10-25 18:36:30.381
1c74d0df-cc95-4f60-9e86-d49de108b55d	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	tiktok	-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs	sheanaynay	sheanaynay	act.JuP8PsarbyQTEEcZBjpSdZYFavf1ckVlbWGpELAWueYADVtjr64VRdGBI478!6439.u1	rft.iAEqkIfwSTx86uzjRlOk85YXud6UVG65RTZDGN71NcAqutM7ioCWjbAjIasR!6369.u1	2025-10-26 18:58:32.893	{"open_id": "-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs", "username": "sheanaynay", "verified": false, "followers": 1, "following": 0, "display_name": "sheanaynay", "follower_count": 1, "profilePictureUrl": "https://p16-common-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/8ed5c9eba068cfe0b4ddab1566ffdf41~tplv-tiktokx-cropcenter:168:168.jpeg?dr=9638&refresh_token=2b9e4baa&x-expires=1761588000&x-signature=FgkIQK9rrHbzvmyMeE6EYr7fLY0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=useast5"}	2025-10-25 18:16:12.877034	2025-10-25 18:58:32.151	t	2025-10-25 18:16:12.877034	2025-10-25 18:58:32.151
5250ed06-c091-4871-8ad1-e0a7adf9ee16	210dd995-04df-4beb-be98-62f11e8250b0	youtube	UCu96nWT4tO1sHn6Nh6k40YQ	@sheacurran	Shea Curran	ya29.a0ATi6K2v_cZ_KLsFiy-C25EtZkSDDYwTJx2ZPQg4JcUSmmEDmgsiXd7CuerNcrXvMGW2WCQ8BhLNQcu7DF7peikxuWll9rMRdubZ3SFZH6_-zWVleF9W65OY_EpA_HY1_ckNgtrQrfDze7yw6Yc0Ht2HkViQ0Xf61YMNFvs9Q0oMfSKmkN0xZQ50TX4rBFa7_mwqrgZ0aCgYKAdESARQSFQHGX2MibJftXHjovzLjn3kWh00UzQ0206	1//0501JTXR1mfcGCgYIARAAGAUSNwF-L9Ir8qXQqU37UYGkhQ-kdVZjKQi9VC4BBnAzGkcYdZB1buWkZ1iaEWysdEmESF0BXl0Zae4	2025-10-29 00:16:28.021	{"id": "UCu96nWT4tO1sHn6Nh6k40YQ", "name": "Shea Curran", "title": "Shea Curran", "verified": false, "followers": 10, "description": "Master Dabbler", "channelTitle": "Shea Curran", "follower_count": 10, "subscriberCount": 10, "profilePictureUrl": "https://yt3.ggpht.com/ytc/AIdro_mR1ppHDeaVOtEjs8MTn34-Rb6bAiVNgSSnatGq68mEnkI=s88-c-k-c0x00ffffff-no-rj"}	2025-10-28 23:16:28.487155	2025-10-28 23:16:28.453	t	2025-10-28 23:16:28.487155	2025-10-28 23:16:28.487155
150ddffa-1e4e-42c0-9cef-3a9d59f0d956	210dd995-04df-4beb-be98-62f11e8250b0	spotify	31ih4hq7wnfbcjg5yjbdohlhhbje	31ih4hq7wnfbcjg5yjbdohlhhbje	Shea Curran	BQAjbV1FOM9UlsMQK1B-Jw8cc-sqEV8rYK0iHXk-mi2PhCeZi1TFitG3Ut67TLzxg-RTOkhXbdAQRLQwb_xSHfQDjaTUvMyTqSNhkAVL1HTIkKaemDOTWTNmNXdJSdRfzPhMCXV1vPQpszCBOJumGVaXAdH6IHxM0OU9Eyn65oDpvho8ZOE3vTqqrZl6FKFpHNHbql1jy8YLFKZ4FehaIqCCkZiW9JuYB96EWsQPuI_2TGwgUD7p1DaOpHEPLzHbJ-T5RHdZf7NXW2y57PlcT6in9tTsx7Y	AQASS3w4AUG9RCfzY82NEfZXwmDebTgwVZYKMCBOvlFHQVprPNobRPvXQ5fTnwXrKRQ74uG7Era06rsw89a61buCPmYJ2XQjE0QDi75A9DiD_GDB-UbhSBpi1sQdVtrKGsE	2025-10-29 00:17:07.649	{"id": "31ih4hq7wnfbcjg5yjbdohlhhbje", "name": "Shea Curran", "email": "shea@atgconsulting.io", "country": "US", "product": "free", "username": "31ih4hq7wnfbcjg5yjbdohlhhbje", "verified": false, "followers": 0, "display_name": "Shea Curran", "follower_count": 0}	2025-10-28 23:17:07.11426	2025-10-28 23:17:07.079	t	2025-10-28 23:17:07.11426	2025-10-28 23:17:07.11426
d0fc9e05-7fd6-44f7-9138-19d8cc08a9da	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	instagram	31530322709945990	fandomly_ai	Fandomly	IGAAQdHUcEhkFBZAFRHdE8zTjBPcnZA4MGtHcGlGbHduNHBkTFREQmQ2UzZATc0l1OHVCUk5zUFJSWURtVzBSc1N6ZATFMX1JFRDA4a3U0OFNHcEdCLWZAEZAnQzcmNLSTRNb04wOVNYWVBGSDdpWl9EWFVudzJpTVJ5ZA01VQUxHbGlsMklWSGlOd1E2YURxb3paeWpDZA251VgZDZD	\N	\N	{"followers": 3, "profilePictureUrl": "https://scontent-fml1-1.cdninstagram.com/v/t51.82787-19/551965074_17851879539550255_8165079439710870791_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=102&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDI0LkMzIn0%3D&_nc_ohc=vhujuHfZ4xsQ7kNvwH9eKZT&_nc_oc=AdkOgyODIgYNla3JwjaS6t4asjlxLwLBKl5MmZzafS6Zfv9V8VC58_Kt84G2BegzBFc&_nc_zt=24&_nc_ht=scontent-fml1-1.cdninstagram.com&edm=AP4hL3IEAAAA&_nc_gid=Ngq18VsCvLeUq0rR7YJO3Q&_nc_tpa=Q5bMBQGFCNgWO5zuGwlIobmRrTt_kp9EJtYQqNsQXMgGiY5HIb6zrFwrLCpU3ACfHIPpDAnhWr08WLBLVA&oh=00_AfhbafGLIS0otfj75lTzjsOwkFrul6AAkTmboqudDTmPYw&oe=690EB435"}	2025-10-25 18:17:15.482131	2025-11-03 18:44:14.265	t	2025-10-25 18:17:15.482131	2025-11-03 18:44:14.265
bed12957-cd1e-4c44-adce-2bb32a627847	210dd995-04df-4beb-be98-62f11e8250b0	tiktok	-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs	sheanaynay	sheanaynay	act.3HXgsyFlgHDjLbLDCrIfjkLxkdDO996Fymn0Qu7o4xmRZDa9Yd7E5bpLte1q!6365.u1	rft.RiRjARpkSReOL6fyaOw87edN1ZNj6124juyAzRWUJWzrbaZW7pQhowUZgo9p!6393.u1	2025-10-29 23:18:47.21	{"open_id": "-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs", "username": "sheanaynay", "verified": false, "followers": 1, "following": 0, "display_name": "sheanaynay", "follower_count": 1, "profilePictureUrl": "https://p16-common-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/8ed5c9eba068cfe0b4ddab1566ffdf41~tplv-tiktokx-cropcenter:168:168.jpeg?dr=9638&refresh_token=54ff42c9&x-expires=1761865200&x-signature=ot8hleLOyajZ7VSOY%2BqZ9wUzS0E%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=useast5"}	2025-10-28 23:16:05.661617	2025-10-28 23:18:46.638	t	2025-10-28 23:16:05.661617	2025-10-28 23:18:46.638
e2ab9bf0-7b44-49e8-9433-a248a7c0d7e7	fddd3425-6b6f-42b1-84c0-9feeab3a77ea	youtube	UCu96nWT4tO1sHn6Nh6k40YQ	@sheacurran	Shea Curran	ya29.a0ATi6K2s-qNio-yp4tfJNHtTomtvJs9SfgPcp6iYgg2PBAMD7c8aHMjga8DITURAg4i-SppqrCxQw0lY8_AL--fPxLFgBmbZTEv8bmGJ6qMY1lKfegEnbqZwp2pUQvLxobxiLJ8Re-PPinfJtmYQQ4kb5qlKlxMjRcydIiKQaVxBK4C-5SaFBnFEDAV12B1eoYMTS030aCgYKAWASARQSFQHGX2Mi2w_JKqnJo4SLnb8EophJIA0206	1//05wFchLwSuEFCCgYIARAAGAUSNwF-L9Ir3mVImWUEgGnG5naxWwJyfMqZ_rT4wYfI9XmbW5U7GV9apFukLt5yuvfaYttR12qZrpI	2025-10-29 23:57:34.941	{"id": "UCu96nWT4tO1sHn6Nh6k40YQ", "name": "Shea Curran", "title": "Shea Curran", "verified": false, "followers": 10, "description": "Master Dabbler", "channelTitle": "Shea Curran", "follower_count": 10, "subscriberCount": 10, "profilePictureUrl": "https://yt3.ggpht.com/ytc/AIdro_mR1ppHDeaVOtEjs8MTn34-Rb6bAiVNgSSnatGq68mEnkI=s88-c-k-c0x00ffffff-no-rj"}	2025-10-29 22:57:36.170979	2025-10-29 22:57:36.137	t	2025-10-29 22:57:36.170979	2025-10-29 22:57:36.170979
f76168bd-6e89-4d52-b0eb-0f29bc58f90b	fddd3425-6b6f-42b1-84c0-9feeab3a77ea	spotify	31ih4hq7wnfbcjg5yjbdohlhhbje	31ih4hq7wnfbcjg5yjbdohlhhbje	Shea Curran	BQD0oPsyp_ueu23IVivAbbux8kJXU4TPaI3Fwcu-ewopGxaJ35uklhMqFhjil8HM44uLX3rqUlDJWGjsU8JTmqM4wPgzF3znwerA7DGqOYLvRn5mAL8WME6c88knC6UjL3ggNQmCnEaiPycs7cGDS92Z3e4-8uGjjps7dboAd5IjJvWGbtdYr5lWVsGZ-fyVe4oyEAy9k5-_2pIJvgALVeVSXyGFXGkvLdPOfzQaJXVRaskFTcaC37skLOJNNkBHjT8NxY2MuQV-TeEmpoi_uzX0BXfAnao	AQA_HMeOakPImy0rPAUVKKOowBAberyff19YKMhSxHXpLgdBtGLOidMpWX5ozlbpsGzc_DEbXjTKVmnDo6JmeHp64UUwUaxk-vMvTNibBQZykLr5XA_jxGmr-xCOtCUKwaA	2025-10-29 23:57:44.462	{"id": "31ih4hq7wnfbcjg5yjbdohlhhbje", "name": "Shea Curran", "email": "shea@atgconsulting.io", "country": "US", "product": "free", "username": "31ih4hq7wnfbcjg5yjbdohlhhbje", "verified": false, "followers": 0, "display_name": "Shea Curran", "follower_count": 0}	2025-10-29 22:57:44.687565	2025-10-29 22:57:44.654	t	2025-10-29 22:57:44.687565	2025-10-29 22:57:44.687565
d076abb6-df37-4f96-9ffe-6399e88b69ac	fddd3425-6b6f-42b1-84c0-9feeab3a77ea	instagram	31530322709945990	fandomly_ai	Fandomly	IGAAQdHUcEhkFBZAFM0WERRYURsY3NBSnQycWdvbllja1g5LVJMZAi12WnlxWDlSNFhXOXYxWUUtbTk3dFlTRmtxR0IySlNJVWNoejFsN0h5WENaTUx0ZAThKNkVnYWpkTG8wZAVJKeU01MS1JeDJfT0JQMnpkZADdLOGptcTlrMTZAETDB6WmZAjU1hFRU05a3lEWnhBeFB4egZDZD	\N	\N	{"followers": 3, "profilePictureUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.82787-19/551965074_17851879539550255_8165079439710870791_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=102&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDI0LkMzIn0%3D&_nc_ohc=psO2awu10OoQ7kNvwEaXl3Z&_nc_oc=Adnp91L50xj4qoDon7jgiFjv3DYQSRY_Jg_uCX-p8KfSiAhXcJros7ufz1UElkgkb-w&_nc_zt=24&_nc_ht=scontent-den2-1.cdninstagram.com&edm=AP4hL3IEAAAA&_nc_gid=xJXrOHky0cDg14QtSF28UQ&_nc_tpa=Q5bMBQF7JAg1ZUN81jaVuAbmiWURcFiAOquxndFh2TyPpBnup3fK6Hx3tc2IrGL6stht1JPmAyHX-YhF5w&oh=00_Afc6Ml-ThomE2jW42_gxLs0ZRoVnbZYbh-dZjfjmp_Fz6Q&oe=690854F5"}	2025-10-29 22:55:12.744438	2025-10-29 22:55:12.71	t	2025-10-29 22:55:12.744438	2025-10-29 22:55:12.744438
27aa51be-5e6d-4be8-92a9-edd0d2571b51	fddd3425-6b6f-42b1-84c0-9feeab3a77ea	tiktok	-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs	sheanaynay	sheanaynay	act.3HXgsyFlgHDjLbLDCrIfjkLxkdDO996Fymn0Qu7o4xmRZDa9Yd7E5bpLte1q!6365.u1	rft.RiRjARpkSReOL6fyaOw87edN1ZNj6124juyAzRWUJWzrbaZW7pQhowUZgo9p!6393.u1	2025-10-30 22:57:18.382	{"open_id": "-000uWltpyNa055MVz-SoTJTkvYuWAFBwTZs", "username": "sheanaynay", "verified": false, "followers": 1, "following": 0, "display_name": "sheanaynay", "follower_count": 1, "profilePictureUrl": "https://p16-common-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/8ed5c9eba068cfe0b4ddab1566ffdf41~tplv-tiktokx-cropcenter:168:168.jpeg?dr=9638&refresh_token=db349ec3&x-expires=1761948000&x-signature=OLXkrlhJddrgAweGIYjE1%2BOWlQo%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=8aecc5ac&idc=useast5"}	2025-10-29 22:57:18.620612	2025-10-29 22:57:18.581	t	2025-10-29 22:57:18.620612	2025-10-29 22:57:18.620612
d829c04e-7bdc-4a1b-bd5c-69d141244e76	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	twitter	24255299	sheacurran	Shea	\N	\N	\N	{"user": {"id": "24255299", "name": "Shea", "username": "sheacurran", "followersCount": 2482, "profileImageUrl": "https://pbs.twimg.com/profile_images/1965451700614868992/J5OR8551_normal.jpg"}, "connectedAt": "2025-11-03T18:01:18.668Z"}	2025-11-03 18:01:18.084057	2025-11-03 18:01:18.049	t	2025-11-03 18:01:18.084057	2025-11-03 18:01:18.049
5472eaef-6e70-4a7c-8545-76bcdf02c898	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	facebook	10227888126819405	Shea Curran	Shea Curran	\N	\N	\N	{"id": "10227888126819405", "name": "Shea Curran", "email": "sheacurran10@gmail.com", "pages": [{"id": "780572935129933", "name": "Fandomly", "access_token": "EAAXqqJnjtksBPzxuCDt6kX7lekIVxC7xnfRy10xZA6xx00jom5MpexxENdCJ2qt9Yb9FBgtGhFZBApc7gHeDYWuwT3pZCR3UI6WOI6P8yeB82dJnEqTkGe6MXvHyECqAkBRZCCfnLSndWb7dONZCidNhxULMheZCnpRLy8JxLRSU6CCdwF76z5vBf2mXOLCHCDtz1h6AnmAm2W9VZCUJyMCKrSr9Mfkc6ahZAF2A7mzTELJRFBq6F92U"}, {"id": "1615190975204443", "name": "cannektme", "access_token": "EAAXqqJnjtksBP7M4o4XApNkhh3KK1aLr2zZB6Uv25k3ZAZAEidkQe2MfcvxetoDZAuaZBJwE0NZB0nvledlmBAsDgYmcTcvnreyYaZCeZBdF99JiKvIWuT5uZBY2XtZCXi27JZAJZBfW4sdtjfcUx2XHirkzoPodPugKBeOKznePxMC067iPeGuGJPJ4Istl9jke7QsMtfAfy0nomzUNeNJydOSOoa53XaQdjI1PNZB1eznmbOS3oWR4Jn9M7"}], "picture": {"data": {"url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10227888126819405&height=200&width=200&ext=1764788953&hash=AT-jcmoAbYshUB1uDROvuoaG", "width": 200, "height": 200, "is_silhouette": false}}}	2025-11-03 19:09:14.347254	2025-11-03 19:09:14.312	t	2025-11-03 19:09:14.347254	2025-11-03 19:09:14.347254
5f78e893-0cf1-41d4-a4bb-1c74f75ab1de	82fc8b43-71f0-43b1-986c-d33351b4e2b8	twitter	24255299	sheacurran	Shea	\N	\N	\N	{"user": {"id": "24255299", "name": "Shea", "username": "sheacurran", "followersCount": 2484, "profileImageUrl": "https://pbs.twimg.com/profile_images/1965451700614868992/J5OR8551_normal.jpg"}, "connectedAt": "2025-11-03T20:34:50.018Z"}	2025-11-03 20:34:49.432222	2025-11-03 20:34:49.398	t	2025-11-03 20:34:49.432222	2025-11-03 20:34:49.398
82b5856c-9f72-43a9-aff3-de7428f149a2	55c7a160-b626-4eab-b51c-0df9ff72975b	instagram	25315572821379328	sheathedabbler	Shea Curran	IGAAQdHUcEhkFBZAFJmcHk2QlR1dmJRNi1xUjg5MF82Vks0cHhJdDh5YVd3aHpxUjNVQlVQdHZABRG1rMGxzS3gzNGJEUi1jVlN4eU9UVG9uVERLNDJFTl94d25CdVpiWXdKQnh2cUoyVDQ3LXhhTmRzNmZAFRnJuNUtZAVHRHSVVJb3F3YWpfcWowZAzZAiQ1NZAVXFnb2stawZDZD	\N	\N	{"followers": 902, "profilePictureUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/356389018_980788550036317_5474148547039886937_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=100&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy43MjAuQzMifQ%3D%3D&_nc_ohc=pFUgXdeutnwQ7kNvwFiM7xQ&_nc_oc=AdlttKFsuoC1KsdMQ1cvJjRQ7lyCqrPH-qip2w8Xg5Gfp4IMzS2Tjx6E1cKvQhsMh6c&_nc_zt=24&_nc_ht=scontent-den2-1.cdninstagram.com&edm=AP4hL3IEAAAA&_nc_tpa=Q5bMBQELt6wDFKzjr-3Oz098xJlIG0K85gf1lK4ZsEjSnlWsIp63iRgzmu6zrcSyGyp3f0JPj3mrvqkEAw&oh=00_Afg0SHj7kXQd_W1s7r7W3ZyzJKmQdwdnsKpOTzE3tjFGcA&oe=691065CF"}	2025-11-05 00:40:06.320125	2025-11-05 00:41:25.718	t	2025-11-05 00:40:06.320125	2025-11-05 00:41:25.718
96b309d5-65e0-47f7-9044-e3d52a552a91	210dd995-04df-4beb-be98-62f11e8250b0	twitter	1951187681087541249	FandomlyAI	Fandomly	\N	\N	\N	{"user": {"id": "1951187681087541249", "name": "Fandomly", "username": "FandomlyAI", "followersCount": 3, "profileImageUrl": "https://pbs.twimg.com/profile_images/1986998332099850240/y7zvVLiH_normal.jpg"}, "connectedAt": "2025-11-16T05:27:58.646Z"}	2025-11-16 05:27:58.859059	2025-11-16 05:27:58.825	t	2025-11-16 05:27:58.859059	2025-11-16 05:27:58.825
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_assignments (id, tenant_id, task_id, campaign_id, display_order, is_active, custom_reward_value, custom_instructions, assigned_at, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: task_completions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_completions (id, task_id, user_id, tenant_id, status, progress, completion_data, points_earned, total_rewards_earned, started_at, completed_at, last_activity_at, verified_at, verification_method, created_at, updated_at) FROM stdin;
16efe2df-b842-40c0-83da-321eda61a9f7	49a44aab-6b1b-432a-844c-97a4f4975907	210dd995-04df-4beb-be98-62f11e8250b0	5d1d9492-948d-430c-a6df-d16df09f299a	in_progress	0	{}	0	0	2025-11-16 03:46:09.61619	\N	2025-11-16 03:46:09.61619	\N	\N	2025-11-16 03:46:09.583	2025-11-16 03:46:09.583
\.


--
-- Data for Name: task_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_templates (id, name, description, category, platform, task_type, default_config, is_global, tenant_id, creator_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tasks (id, ownership_level, tenant_id, creator_id, name, description, section, task_type, platform, start_time, end_time, is_required, hide_from_ui, reward_type, points_to_reward, point_currency, multiplier_value, currencies_to_apply, apply_to_existing_balance, update_cadence, reward_frequency, target_url, hashtags, invite_code, custom_instructions, custom_settings, is_active, is_draft, total_completions, created_at, updated_at, program_id, campaign_id, eligible_account_types, deleted_at, deleted_by, deletion_reason, base_multiplier, multiplier_config) FROM stdin;
49a44aab-6b1b-432a-844c-97a4f4975907	creator	5d1d9492-948d-430c-a6df-d16df09f299a	34407d33-d12a-45c9-bd66-89581ba67879	Follow SHEA on Twitter	Follow our Twitter account to stay updated!	custom	twitter_follow	twitter	\N	\N	f	f	points	69	default	\N	\N	f	immediate	one_time	\N	\N	\N	\N	{"username": "sheacurran", "verificationMethod": "api"}	t	f	0	2025-11-08 02:46:33.462107	2025-11-11 03:01:28.865533	5e81956b-0691-454f-9cea-acbf91acf515	\N	["fan"]	\N	\N	\N	1.00	\N
3e6ada15-0805-47a0-a93e-86bc38541e24	creator	5d1d9492-948d-430c-a6df-d16df09f299a	34407d33-d12a-45c9-bd66-89581ba67879	Like MY Facebook Page	Like MY Facebook page to stay connected!	custom	facebook_like_page	facebook	\N	\N	f	f	points	501	default	\N	\N	f	immediate	one_time	\N	\N	\N	\N	{"verificationMethod": "manual"}	t	f	0	2025-11-10 02:06:52.747963	2025-11-11 03:01:29.733785	5e81956b-0691-454f-9cea-acbf91acf515	\N	["fan"]	\N	\N	\N	1.00	\N
7fb84ace-9710-401a-8f6b-f43019251690	creator	5d1d9492-948d-430c-a6df-d16df09f299a	34407d33-d12a-45c9-bd66-89581ba67879	Comment on MYInstagram Post	Comment with your unique code on our Instagram post!	custom	comment_code	instagram	\N	\N	f	f	points	192	default	\N	\N	f	immediate	one_time	\N	\N	\N	\N	{"contentId": "DQx87qIDGAH", "contentUrl": "https://www.instagram.com/p/DQx87qIDGAH/", "verificationMethod": "smart_detection"}	t	f	0	2025-11-10 02:08:39.9157	2025-11-11 03:01:59.852715	5e81956b-0691-454f-9cea-acbf91acf515	\N	["fan"]	\N	\N	\N	1.00	\N
\.


--
-- Data for Name: tenant_memberships; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenant_memberships (id, tenant_id, user_id, role, member_data, status, joined_at, last_active_at, is_agency_manager, managed_by, updated_at, created_at) FROM stdin;
5ea5e329-4990-4d38-9aec-9d2947fb2693	5d1d9492-948d-430c-a6df-d16df09f299a	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	owner	{"tier": "basic", "points": 0}	active	2025-10-11 02:53:24.399	2025-10-11 02:53:24.399	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
5a996c80-9dd2-43c2-ba70-ce2bfc92e49d	ceda613b-b563-41df-bef4-0d45212824a4	55c7a160-b626-4eab-b51c-0df9ff72975b	owner	{"tier": "basic", "points": 0}	active	2025-10-16 00:48:50.475	2025-10-16 00:48:50.475	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
611c0e15-5cfc-498b-a367-e7a4e4b0bc73	5d1d9492-948d-430c-a6df-d16df09f299a	2260625f-61f4-4a78-b335-cb413cc26aed	member	{"tier": "basic", "points": 0}	active	2025-10-22 20:52:36.749	2025-10-22 20:52:36.749	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
48bcdcfa-b395-4b7d-a68b-27d79d4ba684	5d1d9492-948d-430c-a6df-d16df09f299a	210dd995-04df-4beb-be98-62f11e8250b0	member	{"tier": "basic", "points": 0}	active	2025-10-28 17:41:06.353	2025-10-28 17:41:06.353	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
1e8c0811-356a-4154-b38c-f99eb910a2da	bba5f07e-cee1-4dfd-8285-e1c2e4271728	82fc8b43-71f0-43b1-986c-d33351b4e2b8	owner	{"tier": "basic", "points": 0}	active	2025-11-03 20:31:59.295	2025-11-03 20:31:59.295	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
6f91229f-faa7-4c7b-9aca-9861f3c74159	5d1d9492-948d-430c-a6df-d16df09f299a	210dd995-04df-4beb-be98-62f11e8250b0	member	{"tier": "basic", "points": 0}	active	2025-11-06 17:27:45.631	2025-11-06 17:27:45.631	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
a6537341-387f-4877-a6ad-41dc5af35479	aab20692-6a4b-463b-98ea-bb984c635cdc	d80739c2-086a-40aa-995e-69826ec73b99	owner	{"tier": "basic", "points": 0}	active	2025-11-08 23:10:49.768	2025-11-08 23:10:49.768	f	\N	2025-11-10 21:23:02.666725	2025-11-10 21:49:12.596252
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenants (id, slug, name, domain, owner_id, status, subscription_tier, subscription_status, branding, business_info, limits, usage, billing_info, settings, created_at, updated_at, deleted_at, deleted_by, deletion_reason) FROM stdin;
5d1d9492-948d-430c-a6df-d16df09f299a	sheatester	sheatester	\N	c4f29d45-fbbe-4553-9b12-edd637f0d8a5	trial	starter	trial	{"accentColor": "#0af570", "primaryColor": "#ff4dde", "secondaryColor": "#000000"}	{"businessType": "athlete"}	{"maxMembers": 100, "maxRewards": 10, "whiteLabel": false, "maxApiCalls": 1000, "customDomain": false, "maxCampaigns": 3, "storageLimit": 100, "advancedAnalytics": false}	{"storageUsed": 0, "currentMembers": 0, "currentRewards": 0, "currentCampaigns": 0, "apiCallsThisMonth": 0}	{"subscriptionId": null, "stripeCustomerId": null}	{"currency": "USD", "language": "en", "timezone": "UTC", "nilCompliance": true, "publicProfile": true, "allowRegistration": true, "enableSocialLogin": true, "requireEmailVerification": false}	2025-10-11 02:53:24.307	2025-10-11 02:56:04.86	\N	\N	\N
bba5f07e-cee1-4dfd-8285-e1c2e4271728	user-y8mwzn-b4e2b8	User_y8mwzn's Store	\N	82fc8b43-71f0-43b1-986c-d33351b4e2b8	trial	starter	trial	{"accentColor": "#f59e0b", "primaryColor": "#6366f1", "secondaryColor": "#10b981"}	{"businessType": "athlete"}	{"maxMembers": 100, "maxRewards": 10, "whiteLabel": false, "maxApiCalls": 1000, "customDomain": false, "maxCampaigns": 3, "storageLimit": 100, "advancedAnalytics": false}	{"storageUsed": 0, "currentMembers": 0, "currentRewards": 0, "currentCampaigns": 0, "apiCallsThisMonth": 0}	\N	{"currency": "USD", "language": "en", "timezone": "UTC", "nilCompliance": false, "publicProfile": true, "allowRegistration": true, "enableSocialLogin": true, "requireEmailVerification": false}	2025-11-03 20:31:59.207	2025-11-03 20:33:52.063	\N	\N	\N
ceda613b-b563-41df-bef4-0d45212824a4	user-72975b	User's Store	\N	55c7a160-b626-4eab-b51c-0df9ff72975b	trial	starter	trial	{"accentColor": "#f59e0b", "primaryColor": "#6366f1", "secondaryColor": "#10b981"}	{"businessType": "content_creator"}	{"maxMembers": 100, "maxRewards": 10, "whiteLabel": false, "maxApiCalls": 1000, "customDomain": false, "maxCampaigns": 3, "storageLimit": 100, "advancedAnalytics": false}	{"storageUsed": 0, "currentMembers": 0, "currentRewards": 0, "currentCampaigns": 0, "apiCallsThisMonth": 0}	\N	{"currency": "USD", "language": "en", "timezone": "UTC", "nilCompliance": false, "publicProfile": true, "allowRegistration": true, "enableSocialLogin": true, "requireEmailVerification": false}	2025-10-16 00:48:50.393	2025-11-04 23:36:31.559	\N	\N	\N
aab20692-6a4b-463b-98ea-bb984c635cdc	user-c73b99	Nike	\N	d80739c2-086a-40aa-995e-69826ec73b99	trial	starter	trial	{"accentColor": "#10B981", "primaryColor": "#8B5CF6", "secondaryColor": "#06B6D4"}	{"companyName": "Nike", "businessType": "brand"}	{"maxMembers": 100, "maxRewards": 10, "whiteLabel": false, "maxApiCalls": 1000, "customDomain": false, "maxCampaigns": 3, "storageLimit": 100, "advancedAnalytics": false}	{"storageUsed": 0, "currentMembers": 0, "currentRewards": 0, "currentCampaigns": 0, "apiCallsThisMonth": 0}	\N	{"currency": "USD", "language": "en", "timezone": "UTC", "nilCompliance": false, "publicProfile": true, "allowRegistration": true, "enableSocialLogin": true, "requireEmailVerification": false}	2025-11-08 23:10:49.69	2025-11-08 23:41:54.095	\N	\N	\N
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_achievements (id, user_id, achievement_id, progress, completed, completed_at, claimed, claimed_at, created_at, deleted_at, deleted_by, deletion_reason, updated_at, earned_at) FROM stdin;
\.


--
-- Data for Name: user_levels; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_levels (id, user_id, tenant_id, current_level, total_points, level_points, next_level_threshold, achievements_unlocked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, dynamic_user_id, email, username, avatar, wallet_address, wallet_chain, user_type, profile_data, current_tenant_id, role, customer_tier, onboarding_state, admin_permissions, customer_admin_data, notification_preferences, created_at, brand_type, agency_id, deleted_at, deleted_by, deletion_reason, updated_at, last_active_at) FROM stdin;
55c7a160-b626-4eab-b51c-0df9ff72975b	62bc049a-97c3-4fe2-993e-a2e7bdf49e73	\N	appland	\N	0x0F7A9901c6b694e882322edA82085C09f219056d	eip155	creator	{"bio": "", "name": "App Land", "location": "Colorado, United States", "platforms": ["Instagram", "OnlyFans", "TikTok", "Snapchat"], "topicsOfFocus": ["blogs", "journalism", "creative-writing", "guides-how-tos", "academics"], "socialConnections": [{"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"25315572821379328\\",\\"username\\":\\"sheathedabbler\\",\\"name\\":\\"Shea Curran\\",\\"profilePictureUrl\\":\\"https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/356389018_980788550036317_5474148547039886937_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=100&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy43MjAuQzMifQ%3D%3D&_nc_ohc=pFUgXdeutnwQ7kNvwFiM7xQ&_nc_oc=AdlttKFsuoC1KsdMQ1cvJjRQ7lyCqrPH-qip2w8Xg5Gfp4IMzS2Tjx6E1cKvQhsMh6c&_nc_zt=24&_nc_ht=scontent-den2-1.cdninstagram.com&edm=AP4hL3IEAAAA&_nc_tpa=Q5bMBQELt6wDFKzjr-3Oz098xJlIG0K85gf1lK4ZsEjSnlWsIp63iRgzmu6zrcSyGyp3f0JPj3mrvqkEAw&oh=00_Afg0SHj7kXQd_W1s7r7W3ZyzJKmQdwdnsKpOTzE3tjFGcA&oe=691065CF\\",\\"followers\\":902},\\"id\\":\\"25315572821379328\\",\\"username\\":\\"sheathedabbler\\",\\"name\\":\\"Shea Curran\\",\\"displayName\\":\\"Shea Curran\\",\\"followersCount\\":0}", "platform": "instagram", "username": "sheathedabbler", "followers": 0, "profileUrl": "https://twitter.com/sheathedabbler", "connectedAt": "2025-11-05T00:41:25.940Z", "displayName": "Shea Curran", "platformUserId": "25315572821379328"}]}	ceda613b-b563-41df-bef4-0d45212824a4	customer_admin	basic	{"totalSteps": 3, "currentStep": 3, "isCompleted": true, "completedSteps": ["1", "2", "3"]}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-10-16 00:48:50.338632	\N	\N	\N	\N	\N	2025-11-10 21:49:12.279569	2025-10-16 00:48:50.338632
2260625f-61f4-4a78-b335-cb413cc26aed	0503f4b6-4136-404d-8b60-5d2931c84414	\N	biggest_fan_shea	\N	0x968f9B30746b2C6bD4Fbc1E15C3dAC58Da0237EF	eip155	fan	{"age": 18, "name": "Shea"}	\N	customer_end_user	basic	{"totalSteps": 3, "currentStep": 2, "isCompleted": true, "completedSteps": ["profile", "choose_creators"], "lastOnboardingRoute": "/fan-onboarding/choose-creators"}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-10-22 20:52:13.384483	\N	\N	\N	\N	\N	2025-11-10 21:49:12.279569	2025-10-22 20:52:13.384483
c4f29d45-fbbe-4553-9b12-edd637f0d8a5	1c3fb9ae-0b9f-454a-b1ef-49d969977fcc	\N	sheabutter	\N	9JvSDzw5cNxCz7qgg3Zs9anzD27jWMAuuV6YLqBBhUN1	solana	creator	{"bio": "Greatest footballer to ever exist on this planet! Welcome to my Fandomly page!", "name": "Shea Curran", "sport": "Soccer", "avatar": "/api/storage/avatars/c4f29d45-fbbe-4553-9b12-edd637f0d8a5/1760496463988.jpg", "location": "Colorado, United States", "position": "Forward", "education": {"grade": "junior", "level": "high_school", "school": "University of Cincinnati"}, "platforms": [], "artistType": "", "musicGenre": [], "bannerImage": "/api/storage/banners/c4f29d45-fbbe-4553-9b12-edd637f0d8a5/1760496447930.jpg", "contentType": [], "socialTokens": {"twitter": {"scope": "tweet.write users.read tweet.read offline.access", "expires_at": 1762200017104, "expires_in": 7200, "token_type": "bearer", "received_at": 1762192877104, "access_token": "aG56cWxfaWpvSU9jTTFSa216VjhPY3VkNFduNkhURUthcmhGZW8tUGdUbjRqOjE3NjIxOTI4NzcwOTI6MToxOmF0OjE", "refresh_token": "66b7c59ca8f4630b49001581:d9af08aed152f96b8c7cd688d96ae011:4d096caf5da383521e92655bda933201c9268e587905f9f3058013256bf5d19b9747a44c7a34bcc76d34b177848ca96561a9a152b89b5eb64de7e0a891d725f3546402ab823ea76150e7474ecb61650a4fad8d7f5149a67dccdaaf"}}, "socialConnections": [{"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"24255299\\",\\"username\\":\\"sheacurran\\",\\"name\\":\\"Shea\\",\\"profileImageUrl\\":\\"https://pbs.twimg.com/profile_images/1965451700614868992/J5OR8551_normal.jpg\\",\\"followersCount\\":2482},\\"connectedAt\\":\\"2025-11-03T18:01:18.668Z\\"}", "platform": "twitter", "username": "sheacurran", "followers": 2482, "profileUrl": "https://twitter.com/sheacurran", "connectedAt": "2025-11-03T18:01:17.817Z", "displayName": "Shea", "platformUserId": "24255299"}, {"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"31530322709945990\\",\\"username\\":\\"fandomly_ai\\",\\"name\\":\\"Fandomly\\",\\"profilePictureUrl\\":\\"https://scontent-fml1-1.cdninstagram.com/v/t51.82787-19/551965074_17851879539550255_8165079439710870791_n.jpg?stp=dst-jpg_s206x206_tt6&_nc_cat=102&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDI0LkMzIn0%3D&_nc_ohc=vhujuHfZ4xsQ7kNvwH9eKZT&_nc_oc=AdkOgyODIgYNla3JwjaS6t4asjlxLwLBKl5MmZzafS6Zfv9V8VC58_Kt84G2BegzBFc&_nc_zt=24&_nc_ht=scontent-fml1-1.cdninstagram.com&edm=AP4hL3IEAAAA&_nc_gid=Ngq18VsCvLeUq0rR7YJO3Q&_nc_tpa=Q5bMBQGFCNgWO5zuGwlIobmRrTt_kp9EJtYQqNsQXMgGiY5HIb6zrFwrLCpU3ACfHIPpDAnhWr08WLBLVA&oh=00_AfhbafGLIS0otfj75lTzjsOwkFrul6AAkTmboqudDTmPYw&oe=690EB435\\",\\"followers\\":3},\\"id\\":\\"31530322709945990\\",\\"username\\":\\"fandomly_ai\\",\\"name\\":\\"Fandomly\\",\\"displayName\\":\\"Fandomly\\",\\"followersCount\\":0}", "platform": "instagram", "username": "fandomly_ai", "followers": 0, "profileUrl": "https://twitter.com/fandomly_ai", "connectedAt": "2025-11-03T18:44:14.506Z", "displayName": "Fandomly", "platformUserId": "31530322709945990"}, {"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"10227888126819405\\",\\"username\\":\\"Shea Curran\\",\\"name\\":\\"Shea Curran\\",\\"email\\":\\"sheacurran10@gmail.com\\",\\"picture\\":{\\"data\\":{\\"height\\":200,\\"is_silhouette\\":false,\\"url\\":\\"https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10227888126819405&height=200&width=200&ext=1764788953&hash=AT-jcmoAbYshUB1uDROvuoaG\\",\\"width\\":200}},\\"pages\\":[{\\"id\\":\\"780572935129933\\",\\"name\\":\\"Fandomly\\",\\"access_token\\":\\"EAAXqqJnjtksBPzxuCDt6kX7lekIVxC7xnfRy10xZA6xx00jom5MpexxENdCJ2qt9Yb9FBgtGhFZBApc7gHeDYWuwT3pZCR3UI6WOI6P8yeB82dJnEqTkGe6MXvHyECqAkBRZCCfnLSndWb7dONZCidNhxULMheZCnpRLy8JxLRSU6CCdwF76z5vBf2mXOLCHCDtz1h6AnmAm2W9VZCUJyMCKrSr9Mfkc6ahZAF2A7mzTELJRFBq6F92U\\"},{\\"id\\":\\"1615190975204443\\",\\"name\\":\\"cannektme\\",\\"access_token\\":\\"EAAXqqJnjtksBP7M4o4XApNkhh3KK1aLr2zZB6Uv25k3ZAZAEidkQe2MfcvxetoDZAuaZBJwE0NZB0nvledlmBAsDgYmcTcvnreyYaZCeZBdF99JiKvIWuT5uZBY2XtZCXi27JZAJZBfW4sdtjfcUx2XHirkzoPodPugKBeOKznePxMC067iPeGuGJPJ4Istl9jke7QsMtfAfy0nomzUNeNJydOSOoa53XaQdjI1PNZB1eznmbOS3oWR4Jn9M7\\"}]},\\"id\\":\\"10227888126819405\\",\\"username\\":\\"Shea Curran\\",\\"name\\":\\"Shea Curran\\",\\"displayName\\":\\"Shea Curran\\",\\"followersCount\\":0}", "platform": "facebook", "username": "Shea Curran", "followers": 0, "profileUrl": "https://twitter.com/Shea Curran", "connectedAt": "2025-11-03T19:09:14.559Z", "displayName": "Shea Curran", "platformUserId": "10227888126819405"}]}	5d1d9492-948d-430c-a6df-d16df09f299a	customer_admin	basic	{"totalSteps": 5, "currentStep": 5, "isCompleted": true, "completedSteps": ["1", "2", "3", "4", "5"]}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-10-11 02:53:24.252986	\N	\N	\N	\N	\N	2025-11-10 21:49:12.279569	2025-10-11 02:53:24.252986
210dd995-04df-4beb-be98-62f11e8250b0	887a2102-a39d-4090-b55a-b1c6f16de9fd	\N	sheafantester	/api/storage/avatars/210dd995-04df-4beb-be98-62f11e8250b0/1761679625534.png	0x7C719A4881C46C5928d4119E513f0F9d3cE0c1b3	eip155	fan	{"age": 9, "name": "Shea Fandomly", "phone": "", "avatar": "/api/storage/avatars/210dd995-04df-4beb-be98-62f11e8250b0/1761679625534.png", "gender": "prefer-not-to-say", "location": "Denver, CO", "interests": [], "bannerImage": "/api/storage/banners/210dd995-04df-4beb-be98-62f11e8250b0/1761679644957.jpg", "dateOfBirth": "1987-09-14", "phoneNumber": "", "preferences": {"marketingEmails": true, "smsNotifications": true, "pushNotifications": true, "emailNotifications": true}, "socialLinks": {"tiktok": "", "twitter": "", "youtube": "", "instagram": ""}, "customTopics": [], "socialTokens": {"twitter": {"scope": "tweet.write users.read tweet.read offline.access", "expires_at": 1763278017923, "expires_in": 7200, "token_type": "bearer", "received_at": 1763270877923, "access_token": "QzZfVk1tbExYWmN6dHBZbFYtZmdPbTZZWVFYck1SSDk1bU84TFF3TXVhSHBHOjE3NjMyNzA4Nzc5MDk6MTowOmF0OjE", "refresh_token": "abb79707846541d2fba1aaa6:c9926d8b9c74bba370c0c841ab1dc08d:c97ef6f971d46748e6262ace15a5110e2b77b103f1f97d743eb3f18f27a210362b723b0ab57a489bd3783bfb8e0e907db065ad7c2a37173ed2123f32ba1ed8de4f3e43c4497f2e8e055c8bc61fa2b299707d5b1c9fbe02b09cd6f6"}}, "topicsOfFocus": ["sports", "sports-betting", "investing", "music", "blockchain-crypto"], "socialConnections": [{"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"1951187681087541249\\",\\"username\\":\\"FandomlyAI\\",\\"name\\":\\"Fandomly\\",\\"profileImageUrl\\":\\"https://pbs.twimg.com/profile_images/1986998332099850240/y7zvVLiH_normal.jpg\\",\\"followersCount\\":3},\\"connectedAt\\":\\"2025-11-16T05:27:58.646Z\\"}", "platform": "twitter", "username": "FandomlyAI", "followers": 3, "profileUrl": "https://twitter.com/FandomlyAI", "connectedAt": "2025-11-16T05:27:58.603Z", "displayName": "Fandomly", "platformUserId": "1951187681087541249"}], "creatorTypeInterests": [], "interestSubcategories": {"athletes": [], "musicians": [], "content_creators": []}}	\N	customer_end_user	basic	{"totalSteps": 3, "currentStep": 2, "isCompleted": true, "completedSteps": ["profile", "choose_creators"], "lastOnboardingRoute": "/fan-onboarding/choose-creators"}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-10-28 17:40:32.803736	\N	\N	\N	\N	\N	2025-11-16 05:27:58.636248	2025-10-28 17:40:32.803736
d80739c2-086a-40aa-995e-69826ec73b99	a438e475-c40c-4178-85ab-33f1e3cc3d69	\N	nike-starter	\N	0xD7b31F7780d02643361a9a26b8Fe6f15f8Dbea21	eip155	creator	{"bio": "", "name": "Nike", "location": "Denver, Colorado", "brandName": "Nike", "brandWebsite": "www.nike.com"}	aab20692-6a4b-463b-98ea-bb984c635cdc	customer_admin	basic	{"totalSteps": 3, "currentStep": 3, "isCompleted": true, "completedSteps": ["1", "2", "3"]}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-11-08 23:10:49.633512	single	\N	\N	\N	\N	2025-11-10 21:49:12.279569	2025-11-08 23:10:49.633512
82fc8b43-71f0-43b1-986c-d33351b4e2b8	bd349e62-8071-479b-a05c-8ec4d9bfeb12	\N	shanesucks	\N	6o4uVPkysmuM6nhdsU5PwBLo4LENMLbXt9QyCQ2rWqVP	solana	creator	{"bio": "asdasd", "name": "Shane Sucks (JK)", "sport": "Skateboarding", "location": "Utah, United States", "position": "Forward", "education": {"grade": "senior", "level": "college_d2", "school": "University of Cincinnati"}, "platforms": [], "socialTokens": {"twitter": {"scope": "tweet.write users.read tweet.read offline.access", "expires_at": 1762209228480, "expires_in": 7200, "token_type": "bearer", "received_at": 1762202088480, "access_token": "Sy1GRHdzanVsYXB1MzU3OWxUUTQ4M0lLcW9qc3FtanliWDdlZnhCOW1XbXJKOjE3NjIyMDIwODg0NTI6MToxOmF0OjE", "refresh_token": "aef014e549dbe1eaaeb1a893:dcc80571018e48e2ca93b53f608dbdbb:4f379235f143bc1c0b161d0421ee1a32cfd7dd54e8db5a405f57ab8030b27604bf98522512ef00d82bf2ad320ae0ea19e2ec317ff127673dc22f3fb86b1d7bdf18e6f133c26e5c20f2d994e494bf9539747c5f45b8345a269b3852"}}, "topicsOfFocus": [], "socialConnections": [{"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"24255299\\",\\"username\\":\\"sheacurran\\",\\"name\\":\\"Shea\\",\\"profileImageUrl\\":\\"https://pbs.twimg.com/profile_images/1965451700614868992/J5OR8551_normal.jpg\\",\\"followersCount\\":2484},\\"connectedAt\\":\\"2025-11-03T20:34:50.018Z\\"}", "platform": "twitter", "username": "sheacurran", "followers": 2484, "profileUrl": "https://twitter.com/sheacurran", "connectedAt": "2025-11-03T20:34:49.174Z", "displayName": "Shea", "platformUserId": "24255299"}]}	bba5f07e-cee1-4dfd-8285-e1c2e4271728	customer_admin	basic	{"totalSteps": 3, "currentStep": 3, "isCompleted": true, "completedSteps": ["1", "2", "3"]}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-11-03 20:31:59.149873	\N	\N	\N	\N	\N	2025-11-10 21:49:12.279569	2025-11-03 20:31:59.149873
fddd3425-6b6f-42b1-84c0-9feeab3a77ea	8346873d-a9da-4ac7-9546-c352aa4dee92	shea@atgconsulting.io	fandomly-platform	\N	\N	\N	creator	{"bio": "", "name": "Fandomly Admin", "platforms": ["Instagram", "Twitter/X", "TikTok", "Facebook", "YouTube"], "socialTokens": {"twitter": {"scope": "tweet.write users.read tweet.read offline.access", "expires_at": 1761785554106, "expires_in": 7200, "token_type": "bearer", "received_at": 1761778414106, "access_token": "a1QxdDhPQWc4TUV3RjhFdVJTMDFKaTBiekxCR2JLdmtHWHItb2U0SFB3SjRkOjE3NjE3Nzg0MTQwOTk6MToxOmF0OjE", "refresh_token": "26b86a5b3cf80466c1c32f77:2d1ed825bad3b653837b54f812d98109:6be7bc995cb54a22dd943d6384dfd0a1b03bde8073aacd25475c1c4c46383104c6ebf9f38212d71a285afe4f7db2b1d1dcd080172dc3d35318e21010d0e56888bb9067dd210121e0a299ffa4200ad7974549387b9257115f1fc4ee"}}, "topicsOfFocus": [], "socialConnections": [{"isActive": true, "metadata": "{\\"user\\":{\\"id\\":\\"24255299\\",\\"username\\":\\"sheacurran\\",\\"name\\":\\"Shea\\",\\"profileImageUrl\\":\\"https://pbs.twimg.com/profile_images/1965451700614868992/J5OR8551_normal.jpg\\",\\"followersCount\\":2495},\\"connectedAt\\":\\"2025-10-29T22:53:36.650Z\\"}", "platform": "twitter", "username": "sheacurran", "followers": 2495, "profileUrl": "https://twitter.com/sheacurran", "connectedAt": "2025-10-29T22:53:36.771Z", "displayName": "Shea", "platformUserId": "24255299"}]}	\N	fandomly_admin	basic	{"totalSteps": 3, "currentStep": 3, "isCompleted": true, "completedSteps": ["1", "2", "3"]}	\N	\N	{"newTasks": {"sms": false, "push": true, "email": true}, "marketing": {"sms": false, "push": true, "email": true}, "newRewards": {"sms": false, "push": true, "email": true}, "weeklyDigest": false, "monthlyReport": false, "creatorUpdates": {"sms": false, "push": true, "email": false}, "campaignUpdates": {"sms": false, "push": true, "email": true}, "achievementAlerts": {"sms": false, "push": true, "email": false}}	2025-10-28 23:27:05.146	\N	\N	\N	\N	\N	2025-11-10 21:54:39.894048	2025-10-28 23:27:05.146
\.


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: active_multipliers active_multipliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.active_multipliers
    ADD CONSTRAINT active_multipliers_pkey PRIMARY KEY (id);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: agency_tenants agency_tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agency_tenants
    ADD CONSTRAINT agency_tenants_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: campaign_participations campaign_participations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_participations
    ADD CONSTRAINT campaign_participations_pkey PRIMARY KEY (id);


--
-- Name: campaign_rules campaign_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_rules
    ADD CONSTRAINT campaign_rules_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: check_in_streaks check_in_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.check_in_streaks
    ADD CONSTRAINT check_in_streaks_pkey PRIMARY KEY (id);


--
-- Name: creator_facebook_pages creator_facebook_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_facebook_pages
    ADD CONSTRAINT creator_facebook_pages_pkey PRIMARY KEY (id);


--
-- Name: creator_referrals creator_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_referrals
    ADD CONSTRAINT creator_referrals_pkey PRIMARY KEY (id);


--
-- Name: creator_referrals creator_referrals_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_referrals
    ADD CONSTRAINT creator_referrals_referral_code_unique UNIQUE (referral_code);


--
-- Name: creator_task_referrals creator_task_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_pkey PRIMARY KEY (id);


--
-- Name: creator_task_referrals creator_task_referrals_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_referral_code_unique UNIQUE (referral_code);


--
-- Name: creators creators_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creators
    ADD CONSTRAINT creators_pkey PRIMARY KEY (id);


--
-- Name: fan_programs fan_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_programs
    ADD CONSTRAINT fan_programs_pkey PRIMARY KEY (id);


--
-- Name: fan_referrals fan_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_referrals
    ADD CONSTRAINT fan_referrals_pkey PRIMARY KEY (id);


--
-- Name: fan_referrals fan_referrals_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_referrals
    ADD CONSTRAINT fan_referrals_referral_code_unique UNIQUE (referral_code);


--
-- Name: fandomly_badge_templates fandomly_badge_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fandomly_badge_templates
    ADD CONSTRAINT fandomly_badge_templates_pkey PRIMARY KEY (id);


--
-- Name: loyalty_programs loyalty_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.loyalty_programs
    ADD CONSTRAINT loyalty_programs_pkey PRIMARY KEY (id);


--
-- Name: nft_collections nft_collections_crossmint_collection_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_collections
    ADD CONSTRAINT nft_collections_crossmint_collection_id_unique UNIQUE (crossmint_collection_id);


--
-- Name: nft_collections nft_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_collections
    ADD CONSTRAINT nft_collections_pkey PRIMARY KEY (id);


--
-- Name: nft_deliveries nft_deliveries_mint_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_deliveries
    ADD CONSTRAINT nft_deliveries_mint_id_unique UNIQUE (mint_id);


--
-- Name: nft_deliveries nft_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_deliveries
    ADD CONSTRAINT nft_deliveries_pkey PRIMARY KEY (id);


--
-- Name: nft_mints nft_mints_crossmint_action_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_crossmint_action_id_unique UNIQUE (crossmint_action_id);


--
-- Name: nft_mints nft_mints_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_pkey PRIMARY KEY (id);


--
-- Name: nft_templates nft_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_templates
    ADD CONSTRAINT nft_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: platform_points_transactions platform_points_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_points_transactions
    ADD CONSTRAINT platform_points_transactions_pkey PRIMARY KEY (id);


--
-- Name: platform_task_completions platform_task_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_task_completions
    ADD CONSTRAINT platform_task_completions_pkey PRIMARY KEY (id);


--
-- Name: platform_tasks platform_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_tasks
    ADD CONSTRAINT platform_tasks_pkey PRIMARY KEY (id);


--
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);


--
-- Name: program_announcements program_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_pkey PRIMARY KEY (id);


--
-- Name: reward_distributions reward_distributions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_distributions
    ADD CONSTRAINT reward_distributions_pkey PRIMARY KEY (id);


--
-- Name: reward_redemptions reward_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: social_campaign_tasks social_campaign_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_campaign_tasks
    ADD CONSTRAINT social_campaign_tasks_pkey PRIMARY KEY (id);


--
-- Name: social_connections social_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_completions task_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tenant_memberships tenant_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_domain_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_domain_unique UNIQUE (domain);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: check_in_streaks unique_user_task_check_in; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.check_in_streaks
    ADD CONSTRAINT unique_user_task_check_in UNIQUE (user_id, task_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_levels user_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_pkey PRIMARY KEY (id);


--
-- Name: user_levels user_levels_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_user_id_unique UNIQUE (user_id);


--
-- Name: users users_dynamic_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_dynamic_user_id_unique UNIQUE (dynamic_user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_active_multipliers_platform_wide; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_active_multipliers_platform_wide ON public.active_multipliers USING btree (id) WHERE ((tenant_id IS NULL) AND (is_active = true));


--
-- Name: idx_active_multipliers_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_active_multipliers_priority ON public.active_multipliers USING btree (priority DESC) WHERE (is_active = true);


--
-- Name: idx_active_multipliers_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_active_multipliers_tenant ON public.active_multipliers USING btree (tenant_id) WHERE (is_active = true);


--
-- Name: idx_active_multipliers_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_active_multipliers_type ON public.active_multipliers USING btree (type) WHERE (is_active = true);


--
-- Name: idx_check_in_streaks_current_streak; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_check_in_streaks_current_streak ON public.check_in_streaks USING btree (current_streak DESC);


--
-- Name: idx_check_in_streaks_last_check_in; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_check_in_streaks_last_check_in ON public.check_in_streaks USING btree (last_check_in DESC);


--
-- Name: idx_check_in_streaks_task; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_check_in_streaks_task ON public.check_in_streaks USING btree (task_id);


--
-- Name: idx_check_in_streaks_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_check_in_streaks_user ON public.check_in_streaks USING btree (user_id);


--
-- Name: active_multipliers trigger_update_active_multipliers_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trigger_update_active_multipliers_updated_at BEFORE UPDATE ON public.active_multipliers FOR EACH ROW EXECUTE FUNCTION public.update_active_multipliers_updated_at();


--
-- Name: check_in_streaks trigger_update_check_in_streaks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trigger_update_check_in_streaks_updated_at BEFORE UPDATE ON public.check_in_streaks FOR EACH ROW EXECUTE FUNCTION public.update_check_in_streaks_updated_at();


--
-- Name: achievements update_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agencies update_agencies_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agency_tenants update_agency_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_agency_tenants_updated_at BEFORE UPDATE ON public.agency_tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaign_participations update_campaign_participations_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_campaign_participations_updated_at BEFORE UPDATE ON public.campaign_participations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaign_rules update_campaign_rules_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_campaign_rules_updated_at BEFORE UPDATE ON public.campaign_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creator_facebook_pages update_creator_facebook_pages_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_creator_facebook_pages_updated_at BEFORE UPDATE ON public.creator_facebook_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creator_referrals update_creator_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_creator_referrals_updated_at BEFORE UPDATE ON public.creator_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creator_task_referrals update_creator_task_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_creator_task_referrals_updated_at BEFORE UPDATE ON public.creator_task_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creators update_creators_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fan_programs update_fan_programs_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_fan_programs_updated_at BEFORE UPDATE ON public.fan_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fan_referrals update_fan_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_fan_referrals_updated_at BEFORE UPDATE ON public.fan_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loyalty_programs update_loyalty_programs_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nft_collections update_nft_collections_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_nft_collections_updated_at BEFORE UPDATE ON public.nft_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nft_deliveries update_nft_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_nft_deliveries_updated_at BEFORE UPDATE ON public.nft_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nft_mints update_nft_mints_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_nft_mints_updated_at BEFORE UPDATE ON public.nft_mints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nft_templates update_nft_templates_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_nft_templates_updated_at BEFORE UPDATE ON public.nft_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_points_transactions update_platform_points_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_platform_points_transactions_updated_at BEFORE UPDATE ON public.platform_points_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_task_completions update_platform_task_completions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_platform_task_completions_updated_at BEFORE UPDATE ON public.platform_task_completions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_tasks update_platform_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_platform_tasks_updated_at BEFORE UPDATE ON public.platform_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: point_transactions update_point_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_point_transactions_updated_at BEFORE UPDATE ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reward_distributions update_reward_distributions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_reward_distributions_updated_at BEFORE UPDATE ON public.reward_distributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reward_redemptions update_reward_redemptions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON public.reward_redemptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rewards update_rewards_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_campaign_tasks update_social_campaign_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_social_campaign_tasks_updated_at BEFORE UPDATE ON public.social_campaign_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_connections update_social_connections_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON public.social_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_assignments update_task_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_completions update_task_completions_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_task_completions_updated_at BEFORE UPDATE ON public.task_completions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_templates update_task_templates_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_memberships update_tenant_memberships_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_tenant_memberships_updated_at BEFORE UPDATE ON public.tenant_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_achievements update_user_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_user_achievements_updated_at BEFORE UPDATE ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_levels update_user_levels_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievements achievements_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: active_multipliers active_multipliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.active_multipliers
    ADD CONSTRAINT active_multipliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: active_multipliers active_multipliers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.active_multipliers
    ADD CONSTRAINT active_multipliers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: agencies agencies_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: agency_tenants agency_tenants_agency_id_agencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agency_tenants
    ADD CONSTRAINT agency_tenants_agency_id_agencies_id_fk FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;


--
-- Name: agency_tenants agency_tenants_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agency_tenants
    ADD CONSTRAINT agency_tenants_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_participations campaign_participations_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_participations
    ADD CONSTRAINT campaign_participations_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_participations campaign_participations_member_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_participations
    ADD CONSTRAINT campaign_participations_member_id_users_id_fk FOREIGN KEY (member_id) REFERENCES public.users(id);


--
-- Name: campaign_participations campaign_participations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_participations
    ADD CONSTRAINT campaign_participations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: campaign_rules campaign_rules_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_rules
    ADD CONSTRAINT campaign_rules_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT campaigns_creator_id_creators_id_fk ON campaigns; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT campaigns_creator_id_creators_id_fk ON public.campaigns IS 'CASCADE: Campaigns deleted when creator is deleted';


--
-- Name: campaigns campaigns_program_id_loyalty_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_program_id_loyalty_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id) ON DELETE RESTRICT;


--
-- Name: CONSTRAINT campaigns_program_id_loyalty_programs_id_fk ON campaigns; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT campaigns_program_id_loyalty_programs_id_fk ON public.campaigns IS 'RESTRICT: Cannot delete program if campaigns exist';


--
-- Name: campaigns campaigns_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: check_in_streaks check_in_streaks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.check_in_streaks
    ADD CONSTRAINT check_in_streaks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: check_in_streaks check_in_streaks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.check_in_streaks
    ADD CONSTRAINT check_in_streaks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: check_in_streaks check_in_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.check_in_streaks
    ADD CONSTRAINT check_in_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: creator_facebook_pages creator_facebook_pages_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_facebook_pages
    ADD CONSTRAINT creator_facebook_pages_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id);


--
-- Name: creator_referrals creator_referrals_referred_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_referrals
    ADD CONSTRAINT creator_referrals_referred_creator_id_creators_id_fk FOREIGN KEY (referred_creator_id) REFERENCES public.creators(id);


--
-- Name: creator_referrals creator_referrals_referring_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_referrals
    ADD CONSTRAINT creator_referrals_referring_creator_id_creators_id_fk FOREIGN KEY (referring_creator_id) REFERENCES public.creators(id);


--
-- Name: creator_task_referrals creator_task_referrals_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: creator_task_referrals creator_task_referrals_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id);


--
-- Name: creator_task_referrals creator_task_referrals_referred_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_referred_fan_id_users_id_fk FOREIGN KEY (referred_fan_id) REFERENCES public.users(id);


--
-- Name: creator_task_referrals creator_task_referrals_referring_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_referring_fan_id_users_id_fk FOREIGN KEY (referring_fan_id) REFERENCES public.users(id);


--
-- Name: creator_task_referrals creator_task_referrals_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creator_task_referrals
    ADD CONSTRAINT creator_task_referrals_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: creators creators_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creators
    ADD CONSTRAINT creators_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: CONSTRAINT creators_tenant_id_tenants_id_fk ON creators; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT creators_tenant_id_tenants_id_fk ON public.creators IS 'RESTRICT: Cannot delete tenant if creators exist';


--
-- Name: creators creators_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.creators
    ADD CONSTRAINT creators_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT creators_user_id_users_id_fk ON creators; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT creators_user_id_users_id_fk ON public.creators IS 'CASCADE: Creator profile deleted when user is deleted';


--
-- Name: fan_programs fan_programs_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_programs
    ADD CONSTRAINT fan_programs_fan_id_users_id_fk FOREIGN KEY (fan_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT fan_programs_fan_id_users_id_fk ON fan_programs; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT fan_programs_fan_id_users_id_fk ON public.fan_programs IS 'CASCADE: Fan program memberships deleted when user is deleted';


--
-- Name: fan_programs fan_programs_program_id_loyalty_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_programs
    ADD CONSTRAINT fan_programs_program_id_loyalty_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT fan_programs_program_id_loyalty_programs_id_fk ON fan_programs; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT fan_programs_program_id_loyalty_programs_id_fk ON public.fan_programs IS 'CASCADE: Fan memberships deleted when loyalty program is deleted';


--
-- Name: fan_programs fan_programs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_programs
    ADD CONSTRAINT fan_programs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: fan_referrals fan_referrals_referred_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_referrals
    ADD CONSTRAINT fan_referrals_referred_fan_id_users_id_fk FOREIGN KEY (referred_fan_id) REFERENCES public.users(id);


--
-- Name: fan_referrals fan_referrals_referring_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fan_referrals
    ADD CONSTRAINT fan_referrals_referring_fan_id_users_id_fk FOREIGN KEY (referring_fan_id) REFERENCES public.users(id);


--
-- Name: fandomly_badge_templates fandomly_badge_templates_collection_id_nft_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fandomly_badge_templates
    ADD CONSTRAINT fandomly_badge_templates_collection_id_nft_collections_id_fk FOREIGN KEY (collection_id) REFERENCES public.nft_collections(id);


--
-- Name: loyalty_programs loyalty_programs_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.loyalty_programs
    ADD CONSTRAINT loyalty_programs_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT loyalty_programs_creator_id_creators_id_fk ON loyalty_programs; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT loyalty_programs_creator_id_creators_id_fk ON public.loyalty_programs IS 'CASCADE: Loyalty programs deleted when creator is deleted';


--
-- Name: loyalty_programs loyalty_programs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.loyalty_programs
    ADD CONSTRAINT loyalty_programs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: nft_collections nft_collections_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_collections
    ADD CONSTRAINT nft_collections_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id);


--
-- Name: nft_collections nft_collections_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_collections
    ADD CONSTRAINT nft_collections_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: nft_deliveries nft_deliveries_collection_id_nft_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_deliveries
    ADD CONSTRAINT nft_deliveries_collection_id_nft_collections_id_fk FOREIGN KEY (collection_id) REFERENCES public.nft_collections(id);


--
-- Name: nft_deliveries nft_deliveries_mint_id_nft_mints_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_deliveries
    ADD CONSTRAINT nft_deliveries_mint_id_nft_mints_id_fk FOREIGN KEY (mint_id) REFERENCES public.nft_mints(id);


--
-- Name: nft_deliveries nft_deliveries_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_deliveries
    ADD CONSTRAINT nft_deliveries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: nft_mints nft_mints_badge_template_id_fandomly_badge_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_badge_template_id_fandomly_badge_templates_id_fk FOREIGN KEY (badge_template_id) REFERENCES public.fandomly_badge_templates(id);


--
-- Name: nft_mints nft_mints_collection_id_nft_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_collection_id_nft_collections_id_fk FOREIGN KEY (collection_id) REFERENCES public.nft_collections(id);


--
-- Name: nft_mints nft_mints_recipient_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_recipient_user_id_users_id_fk FOREIGN KEY (recipient_user_id) REFERENCES public.users(id);


--
-- Name: nft_mints nft_mints_template_id_nft_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_mints
    ADD CONSTRAINT nft_mints_template_id_nft_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.nft_templates(id);


--
-- Name: nft_templates nft_templates_collection_id_nft_collections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_templates
    ADD CONSTRAINT nft_templates_collection_id_nft_collections_id_fk FOREIGN KEY (collection_id) REFERENCES public.nft_collections(id);


--
-- Name: nft_templates nft_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nft_templates
    ADD CONSTRAINT nft_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: notifications notifications_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_points_transactions platform_points_transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_points_transactions
    ADD CONSTRAINT platform_points_transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: platform_task_completions platform_task_completions_task_id_platform_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_task_completions
    ADD CONSTRAINT platform_task_completions_task_id_platform_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.platform_tasks(id) ON DELETE CASCADE;


--
-- Name: platform_task_completions platform_task_completions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.platform_task_completions
    ADD CONSTRAINT platform_task_completions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: point_transactions point_transactions_fan_program_id_fan_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_fan_program_id_fan_programs_id_fk FOREIGN KEY (fan_program_id) REFERENCES public.fan_programs(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT point_transactions_fan_program_id_fan_programs_id_fk ON point_transactions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT point_transactions_fan_program_id_fan_programs_id_fk ON public.point_transactions IS 'CASCADE: Transactions deleted when fan program membership is deleted';


--
-- Name: point_transactions point_transactions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: CONSTRAINT point_transactions_tenant_id_tenants_id_fk ON point_transactions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT point_transactions_tenant_id_tenants_id_fk ON public.point_transactions IS 'RESTRICT: Keep point transactions for financial audit trail';


--
-- Name: program_announcements program_announcements_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;


--
-- Name: program_announcements program_announcements_program_id_loyalty_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_program_id_loyalty_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id) ON DELETE CASCADE;


--
-- Name: reward_distributions reward_distributions_task_completion_id_task_completions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_distributions
    ADD CONSTRAINT reward_distributions_task_completion_id_task_completions_id_fk FOREIGN KEY (task_completion_id) REFERENCES public.task_completions(id) ON DELETE CASCADE;


--
-- Name: reward_distributions reward_distributions_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_distributions
    ADD CONSTRAINT reward_distributions_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: reward_distributions reward_distributions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_distributions
    ADD CONSTRAINT reward_distributions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: reward_distributions reward_distributions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_distributions
    ADD CONSTRAINT reward_distributions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_fan_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_fan_id_users_id_fk FOREIGN KEY (fan_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_reward_id_rewards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_reward_id_rewards_id_fk FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE RESTRICT;


--
-- Name: CONSTRAINT reward_redemptions_reward_id_rewards_id_fk ON reward_redemptions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT reward_redemptions_reward_id_rewards_id_fk ON public.reward_redemptions IS 'RESTRICT: Cannot delete reward if redemptions exist (handle redemptions first)';


--
-- Name: reward_redemptions reward_redemptions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: CONSTRAINT reward_redemptions_tenant_id_tenants_id_fk ON reward_redemptions; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT reward_redemptions_tenant_id_tenants_id_fk ON public.reward_redemptions IS 'RESTRICT: Keep redemptions for financial audit trail';


--
-- Name: rewards rewards_program_id_loyalty_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_program_id_loyalty_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT rewards_program_id_loyalty_programs_id_fk ON rewards; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT rewards_program_id_loyalty_programs_id_fk ON public.rewards IS 'CASCADE: Rewards deleted when loyalty program is deleted';


--
-- Name: rewards rewards_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: social_campaign_tasks social_campaign_tasks_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_campaign_tasks
    ADD CONSTRAINT social_campaign_tasks_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: social_campaign_tasks social_campaign_tasks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_campaign_tasks
    ADD CONSTRAINT social_campaign_tasks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: social_connections social_connections_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: task_completions task_completions_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_completions task_completions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: task_completions task_completions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_completions
    ADD CONSTRAINT task_completions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id);


--
-- Name: task_templates task_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tasks tasks_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT tasks_campaign_id_campaigns_id_fk ON tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT tasks_campaign_id_campaigns_id_fk ON public.tasks IS 'SET NULL: Task can exist without campaign (campaign is optional)';


--
-- Name: tasks tasks_creator_id_creators_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_creator_id_creators_id_fk FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT tasks_creator_id_creators_id_fk ON tasks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT tasks_creator_id_creators_id_fk ON public.tasks IS 'CASCADE: Tasks deleted when creator is deleted';


--
-- Name: tasks tasks_program_id_loyalty_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_program_id_loyalty_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.loyalty_programs(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: tenant_memberships tenant_memberships_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk ON tenant_memberships; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk ON public.tenant_memberships IS 'CASCADE: Memberships deleted when tenant is deleted';


--
-- Name: tenant_memberships tenant_memberships_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT tenant_memberships_user_id_users_id_fk ON tenant_memberships; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON CONSTRAINT tenant_memberships_user_id_users_id_fk ON public.tenant_memberships IS 'CASCADE: Memberships deleted when user is deleted';


--
-- Name: user_achievements user_achievements_achievement_id_achievements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_achievements_id_fk FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);


--
-- Name: user_levels user_levels_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict d2aJ0hDVXyfXR1el9S7BXhU9mLTOrTztRC2PACH7JqkCrZUqeMVNNQqlfpha55W

