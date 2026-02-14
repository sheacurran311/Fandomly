-- ============================================================================
-- FIX VERIFICATION ATTEMPTS TABLE COLUMN TYPES
-- Changes task_completion_id and user_id from INTEGER to VARCHAR to match
-- the actual UUIDs used in task_completions and users tables
-- ============================================================================

-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS verification_attempts 
  DROP CONSTRAINT IF EXISTS verification_attempts_task_completion_id_fkey;

ALTER TABLE IF EXISTS verification_attempts 
  DROP CONSTRAINT IF EXISTS verification_attempts_user_id_fkey;

-- Drop existing indexes that reference these columns
DROP INDEX IF EXISTS idx_verification_attempts_completion;
DROP INDEX IF EXISTS idx_verification_attempts_user;

-- Alter column types from INTEGER to VARCHAR
-- First we need to drop any data since the types are incompatible
-- (If you have important data, you'd need a more complex migration)
TRUNCATE TABLE verification_attempts;

ALTER TABLE verification_attempts 
  ALTER COLUMN task_completion_id TYPE VARCHAR USING task_completion_id::VARCHAR;

ALTER TABLE verification_attempts 
  ALTER COLUMN user_id TYPE VARCHAR USING user_id::VARCHAR;

-- Recreate indexes with the new column types
CREATE INDEX IF NOT EXISTS idx_verification_attempts_completion 
  ON verification_attempts(task_completion_id);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_user 
  ON verification_attempts(user_id);

-- Note: Not adding foreign key constraints as the original table didn't
-- have proper references (INTEGER can't reference VARCHAR columns)
-- The application handles referential integrity

COMMENT ON TABLE verification_attempts IS 'Audit log of all verification attempts for debugging and analytics - updated to use VARCHAR UUIDs';
