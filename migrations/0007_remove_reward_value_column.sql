-- Migration: Remove duplicate reward_value column from tasks table
-- We only need points_to_reward, not both

-- Remove the reward_value column from tasks table
ALTER TABLE tasks DROP COLUMN IF EXISTS reward_value;

