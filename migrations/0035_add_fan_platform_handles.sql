-- Migration: Add fan_platform_handles table for T3 manual verification
-- Part of Cross-Network Verification System Phase 1
-- This table stores fan-claimed handles for platforms where OAuth isn't available (T3 verification)

CREATE TABLE IF NOT EXISTS fan_platform_handles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  
  -- Handle data
  handle VARCHAR(100) NOT NULL,
  normalized_handle VARCHAR(100), -- lowercase, no @ prefix for easier matching
  
  -- Validation status
  format_valid BOOLEAN DEFAULT false, -- Passes regex validation for platform format
  manually_verified BOOLEAN DEFAULT false, -- Creator has manually verified this handle
  verified_at TIMESTAMP,
  verified_by VARCHAR REFERENCES users(id), -- Creator who verified
  
  -- Link to OAuth connection if they later connect via OAuth
  social_connection_id VARCHAR REFERENCES social_connections(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- One handle per platform per user
  CONSTRAINT fan_platform_handles_user_platform_unique UNIQUE(user_id, platform)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fan_platform_handles_user_id ON fan_platform_handles(user_id);
CREATE INDEX IF NOT EXISTS idx_fan_platform_handles_platform ON fan_platform_handles(platform);
CREATE INDEX IF NOT EXISTS idx_fan_platform_handles_normalized ON fan_platform_handles(normalized_handle);
CREATE INDEX IF NOT EXISTS idx_fan_platform_handles_pending_verification 
  ON fan_platform_handles(platform, manually_verified) 
  WHERE manually_verified = false;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fan_platform_handles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fan_platform_handles_updated_at_trigger ON fan_platform_handles;
CREATE TRIGGER fan_platform_handles_updated_at_trigger
  BEFORE UPDATE ON fan_platform_handles
  FOR EACH ROW
  EXECUTE FUNCTION update_fan_platform_handles_updated_at();
