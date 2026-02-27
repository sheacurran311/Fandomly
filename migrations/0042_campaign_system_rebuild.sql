-- Campaign System Rebuild: Sponsors, Gating, Multipliers, Sequential Tasks, Deferred Verification
-- Non-destructive migration: adds columns with defaults, creates new tables. No data loss.

-- ============================================================================
-- 1. New columns on campaigns table
-- ============================================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS access_code_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS minimum_reputation_score INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_multiplier DECIMAL(10,2) DEFAULT 1.00;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completion_bonus_points INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completion_bonus_rewards JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS verification_mode TEXT DEFAULT 'immediate';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS verification_scheduled_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8B5CF6';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS enforce_sequential_tasks BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. New columns on task_assignments table
-- ============================================================================

ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS task_order INTEGER DEFAULT 0;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS depends_on_task_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS use_sponsor_handle BOOLEAN DEFAULT FALSE;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS sponsor_id VARCHAR;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS verification_timing TEXT DEFAULT 'immediate';
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS task_description_override TEXT;

-- ============================================================================
-- 3. New columns on campaign_participations table
-- ============================================================================

ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS tasks_completed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS tasks_pending_verification JSONB DEFAULT '[]'::jsonb;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS total_tasks_required INTEGER DEFAULT 0;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS campaign_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS campaign_completed_at TIMESTAMP;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS completion_bonus_awarded BOOLEAN DEFAULT FALSE;
ALTER TABLE campaign_participations ADD COLUMN IF NOT EXISTS progress_metadata JSONB;

-- ============================================================================
-- 4. New table: campaign_sponsors
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_sponsors (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  social_handles JSONB,
  display_order INTEGER DEFAULT 0,
  show_in_campaign_banner BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. New table: campaign_verification_queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_verification_queue (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_participants INTEGER DEFAULT 0,
  tasks_verified INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. New table: campaign_access_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_access_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_granted BOOLEAN NOT NULL,
  access_code_used TEXT,
  access_method TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. Add foreign key for task_assignments.sponsor_id
-- ============================================================================

ALTER TABLE task_assignments
  ADD CONSTRAINT fk_task_assignments_sponsor
  FOREIGN KEY (sponsor_id) REFERENCES campaign_sponsors(id) ON DELETE SET NULL;

-- ============================================================================
-- 8. Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaign_sponsors_campaign ON campaign_sponsors(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_verification_queue_status ON campaign_verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_verification_queue_scheduled ON campaign_verification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_access_logs_campaign ON campaign_access_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_access_logs_user ON campaign_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_sponsor ON task_assignments(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_order ON task_assignments(campaign_id, task_order);
CREATE INDEX IF NOT EXISTS idx_campaign_participations_completed ON campaign_participations(campaign_id, campaign_completed);
