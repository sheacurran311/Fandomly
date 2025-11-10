-- Migration: Add comment task types to task_type enum
-- Date: 2025-11-06
-- Description: Adds twitter_quote_tweet, comment_code, mention_story, keyword_comment, youtube_comment, and tiktok_comment to the task_type enum

-- Add new task types to the enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'twitter_quote_tweet';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'comment_code';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'mention_story';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'keyword_comment';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'youtube_comment';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'tiktok_comment';

