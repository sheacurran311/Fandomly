-- Add 'interactive' to social_platform enum for poll, quiz, and website_visit tasks
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'interactive';
