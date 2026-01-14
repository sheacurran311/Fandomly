-- Migration: Add twitch to social_platform enum
-- Forward-only: add value if missing

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'twitch' AND enumtypid = 'social_platform'::regtype) THEN
    ALTER TYPE social_platform ADD VALUE 'twitch';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

