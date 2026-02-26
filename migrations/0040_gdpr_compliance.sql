-- Migration: GDPR Compliance Support
-- Sprint 9: Data export, anonymization, and retention policies

-- ============================================
-- DATA EXPORT REQUEST TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('full_export', 'specific_data')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  requested_data_types TEXT[], -- e.g., ['profile', 'transactions', 'completions']
  export_format VARCHAR(10) NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'csv')),
  download_url VARCHAR(500),
  download_expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user 
ON data_export_requests (user_id, status);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_pending 
ON data_export_requests (status, requested_at) 
WHERE status = 'pending';

COMMENT ON TABLE data_export_requests IS 'GDPR Article 20 - Data portability requests';

-- ============================================
-- ACCOUNT DELETION REQUEST TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('full_deletion', 'anonymization')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  reason TEXT,
  confirmation_token VARCHAR(100) UNIQUE,
  confirmed_at TIMESTAMPTZ,
  scheduled_deletion_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user 
ON account_deletion_requests (user_id, status);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled 
ON account_deletion_requests (scheduled_deletion_at) 
WHERE status = 'confirmed';

COMMENT ON TABLE account_deletion_requests IS 'GDPR Article 17 - Right to erasure (right to be forgotten)';

-- ============================================
-- DATA RETENTION POLICIES
-- ============================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name VARCHAR(100) NOT NULL,
  retention_period_days INTEGER NOT NULL,
  retention_type VARCHAR(20) NOT NULL CHECK (retention_type IN ('hard_delete', 'soft_delete', 'anonymize')),
  filter_condition TEXT, -- SQL WHERE clause to identify deletable records
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name)
);

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_period_days, retention_type, filter_condition)
VALUES 
  ('audit_logs', 365, 'hard_delete', 'created_at < NOW() - INTERVAL ''365 days'''),
  ('notifications', 90, 'hard_delete', 'created_at < NOW() - INTERVAL ''90 days'' AND is_read = TRUE'),
  ('verification_attempts', 30, 'hard_delete', 'created_at < NOW() - INTERVAL ''30 days'' AND status != ''pending'''),
  ('point_expiration_notifications', 90, 'hard_delete', 'sent_at < NOW() - INTERVAL ''90 days''')
ON CONFLICT (table_name) DO NOTHING;

COMMENT ON TABLE data_retention_policies IS 'Configurable data retention rules for GDPR compliance';

-- ============================================
-- CONSENT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS user_consents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  is_granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user 
ON user_consents (user_id, consent_type);

-- Insert consent types
COMMENT ON TABLE user_consents IS 'GDPR consent tracking for various data processing activities';

-- ============================================
-- ANONYMIZATION HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION anonymize_user(target_user_id VARCHAR(36))
RETURNS BOOLEAN AS $$
DECLARE
  anonymized_id VARCHAR(36);
BEGIN
  -- Generate anonymized identifier
  anonymized_id := 'anon_' || substring(md5(target_user_id || NOW()::text) from 1 for 8);
  
  -- Anonymize user record
  UPDATE users SET
    username = anonymized_id,
    email = anonymized_id || '@anonymized.local',
    avatar = NULL,
    wallet_address = NULL,
    profile_data = '{}',
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Anonymize creator record if exists
  UPDATE creators SET
    display_name = 'Deleted Creator',
    bio = NULL,
    image_url = NULL,
    type_specific_data = '{}',
    public_fields = '{}',
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Clear social connections
  UPDATE social_connections SET
    access_token = 'REDACTED',
    refresh_token = 'REDACTED',
    platform_user_id = 'REDACTED',
    platform_username = anonymized_id,
    metadata = '{}'
  WHERE user_id = target_user_id;
  
  -- Clear fan platform handles
  UPDATE fan_platform_handles SET
    handle = anonymized_id,
    metadata = '{}'
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_user IS 'Anonymizes user data while preserving transaction history integrity';

-- ============================================
-- DATA EXPORT HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_user_export_data(target_user_id VARCHAR(36))
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', (SELECT row_to_json(u.*) FROM users u WHERE u.id = target_user_id),
    'creator', (SELECT row_to_json(c.*) FROM creators c WHERE c.user_id = target_user_id),
    'fan_programs', (SELECT jsonb_agg(row_to_json(fp.*)) FROM fan_programs fp WHERE fp.fan_id = target_user_id),
    'point_transactions', (
      SELECT jsonb_agg(row_to_json(pt.*)) 
      FROM point_transactions pt 
      INNER JOIN fan_programs fp ON pt.fan_program_id = fp.id 
      WHERE fp.fan_id = target_user_id
    ),
    'platform_points', (SELECT jsonb_agg(row_to_json(ppt.*)) FROM platform_points_transactions ppt WHERE ppt.user_id = target_user_id),
    'task_completions', (SELECT jsonb_agg(row_to_json(tc.*)) FROM task_completions tc WHERE tc.user_id = target_user_id),
    'reward_redemptions', (SELECT jsonb_agg(row_to_json(rr.*)) FROM reward_redemptions rr WHERE rr.user_id = target_user_id),
    'social_connections', (SELECT jsonb_agg(row_to_json(sc.*)) FROM social_connections sc WHERE sc.user_id = target_user_id),
    'consents', (SELECT jsonb_agg(row_to_json(uc.*)) FROM user_consents uc WHERE uc.user_id = target_user_id),
    'export_generated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_export_data IS 'Generates GDPR-compliant data export for a user';
