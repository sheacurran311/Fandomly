-- Migration: Add authentication provider fields for replacing Dynamic with Google Auth + Social Logins
-- This migration adds fields needed for the new JWT-based auth system with Crossmint integration

-- Add new authentication fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_auth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_accounts JSONB;

-- Create index on google_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Create index on primary_auth_provider for analytics
CREATE INDEX IF NOT EXISTS idx_users_primary_auth_provider ON users(primary_auth_provider) WHERE primary_auth_provider IS NOT NULL;

-- Add index on email for account linking lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Create account_link_requests table for pending link confirmations
CREATE TABLE IF NOT EXISTS account_link_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_provider TEXT NOT NULL,
  target_provider_id TEXT NOT NULL,
  target_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected' | 'expired'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  
  -- Prevent duplicate pending requests
  CONSTRAINT unique_pending_link UNIQUE (source_user_id, target_provider, target_provider_id)
);

-- Index for finding pending link requests
CREATE INDEX IF NOT EXISTS idx_link_requests_status ON account_link_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_link_requests_source_user ON account_link_requests(source_user_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_expires ON account_link_requests(expires_at) WHERE status = 'pending';

-- Add refresh_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- Store hash of refresh token, not the actual token
  device_info JSONB, -- Optional: store device/browser info
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  
  -- Index for fast lookups
  CONSTRAINT idx_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Comment on columns
COMMENT ON COLUMN users.primary_auth_provider IS 'Primary authentication provider used by the user (google, twitter, etc.)';
COMMENT ON COLUMN users.google_id IS 'Google unique user ID (sub claim from Google OAuth)';
COMMENT ON COLUMN users.linked_accounts IS 'JSON array of linked authentication providers';
COMMENT ON TABLE account_link_requests IS 'Tracks pending requests to link a new auth provider to an existing account';
COMMENT ON TABLE refresh_tokens IS 'Stores refresh token hashes for secure session management';
