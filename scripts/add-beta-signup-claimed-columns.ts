/**
 * Add claimed tracking columns to beta_signups table
 */

import { pool } from "../server/db";

const sql = `
-- Add claimed tracking columns to beta_signups
ALTER TABLE "beta_signups" 
  ADD COLUMN IF NOT EXISTS "claimed" BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "claimed_by_user_id" VARCHAR;
`;

async function addBetaSignupClaimedColumns() {
  try {
    console.log("Adding claimed tracking columns to beta_signups...");
    await pool.query(sql);
    console.log("✓ Columns added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding columns:", error);
    process.exit(1);
  }
}

addBetaSignupClaimedColumns();
