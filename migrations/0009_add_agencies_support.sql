-- Migration: Add agencies and agency_tenants tables for multi-brand/agency support
-- This enables brands and agencies to manage multiple tenants/brands

-- Agencies table for multi-brand management
CREATE TABLE "agencies" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "owner_user_id" varchar NOT NULL REFERENCES users(id),
  "website" text,
  
  -- Business Info
  "business_info" jsonb DEFAULT '{}',
  
  -- Data Access Control
  "allow_cross_brand_analytics" boolean DEFAULT false,
  "data_isolation_level" text DEFAULT 'strict', -- 'strict' | 'aggregated' | 'shared'
  
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Link agencies to their managed brands (tenants)
CREATE TABLE "agency_tenants" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "agency_id" varchar NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  "tenant_id" varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Relationship Details
  "relationship_type" text DEFAULT 'full_management', -- 'full_management' | 'white_label' | 'consulting'
  "start_date" timestamp DEFAULT now(),
  "end_date" timestamp,
  
  "created_at" timestamp DEFAULT now(),
  
  UNIQUE(agency_id, tenant_id)
);

-- Add brand/agency type tracking to users table
ALTER TABLE users ADD COLUMN brand_type text; -- 'single' | 'agency' | null (for non-brand users)
ALTER TABLE users ADD COLUMN agency_id varchar REFERENCES agencies(id);

-- Enhance tenant_memberships for agency managers
ALTER TABLE tenant_memberships ADD COLUMN is_agency_manager boolean DEFAULT false;
ALTER TABLE tenant_memberships ADD COLUMN managed_by varchar; -- Reference to agency owner user.id

-- Add indexes for performance
CREATE INDEX "agencies_owner_user_id_idx" ON "agencies" ("owner_user_id");
CREATE INDEX "agency_tenants_agency_id_idx" ON "agency_tenants" ("agency_id");
CREATE INDEX "agency_tenants_tenant_id_idx" ON "agency_tenants" ("tenant_id");
CREATE INDEX "tenant_memberships_is_agency_manager_idx" ON "tenant_memberships" ("is_agency_manager");
CREATE INDEX "users_brand_type_idx" ON "users" ("brand_type");
CREATE INDEX "users_agency_id_idx" ON "users" ("agency_id");

-- Comments for documentation
COMMENT ON TABLE "agencies" IS 'Agencies that manage multiple brand tenants. Enables centralized brand management for agencies and holding companies.';
COMMENT ON TABLE "agency_tenants" IS 'Links agencies to the brands/tenants they manage. Supports multi-brand management and data isolation.';
COMMENT ON COLUMN users.brand_type IS 'Type of brand user: single brand or agency managing multiple. NULL for non-brand users (fans/individual creators).';
COMMENT ON COLUMN users.agency_id IS 'Reference to agency if user is managing brands through an agency.';
COMMENT ON COLUMN tenant_memberships.is_agency_manager IS 'True if user is managing this tenant on behalf of a client/brand (agency use case).';
COMMENT ON COLUMN tenant_memberships.managed_by IS 'User ID of the agency owner managing this tenant membership.';

