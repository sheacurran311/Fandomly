-- Migration: Add missing task_type enum values for new social platforms
-- Forward-only: safely adds values if they do not already exist

DO $$ BEGIN
  -- Twitch
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'twitch_follow' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'twitch_follow';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'twitch_subscribe' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'twitch_subscribe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'twitch_watch' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'twitch_watch';
  END IF;

  -- Discord
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discord_join' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'discord_join';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discord_verify' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'discord_verify';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discord_react' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'discord_react';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discord_message' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'discord_message';
  END IF;

  -- Spotify
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'spotify_save_track' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'spotify_save_track';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'spotify_save_album' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'spotify_save_album';
  END IF;

  -- TikTok
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tiktok_duet' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'tiktok_duet';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tiktok_stitch' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'tiktok_stitch';
  END IF;

  -- YouTube
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'youtube_watch' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'youtube_watch';
  END IF;

  -- Facebook
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'facebook_share' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'facebook_share';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'facebook_join_group' AND enumtypid = 'task_type'::regtype) THEN
    ALTER TYPE task_type ADD VALUE 'facebook_join_group';
  END IF;

EXCEPTION
  WHEN duplicate_object THEN
    -- Ignore if another deploy added the same values concurrently
    NULL;
END $$;

