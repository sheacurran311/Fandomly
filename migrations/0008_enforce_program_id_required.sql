-- Migration: Enforce program_id requirement for creator tasks and campaigns
-- Creator tasks MUST be associated with a program
-- Platform tasks can exist without a program
-- All campaigns MUST be associated with a program

-- Add check constraint for creator tasks to require program_id
ALTER TABLE tasks ADD CONSTRAINT creator_tasks_require_program 
CHECK (
  (ownership_level = 'platform') OR 
  (ownership_level = 'creator' AND program_id IS NOT NULL)
);

-- Add check constraint for campaigns to require program_id
ALTER TABLE campaigns ADD CONSTRAINT campaigns_require_program 
CHECK (program_id IS NOT NULL);

-- Add helpful comments
COMMENT ON CONSTRAINT creator_tasks_require_program ON tasks IS 
  'Ensures creator tasks have a program_id. Platform tasks can have NULL program_id.';

COMMENT ON CONSTRAINT campaigns_require_program ON campaigns IS 
  'All campaigns must be associated with a loyalty program.';

