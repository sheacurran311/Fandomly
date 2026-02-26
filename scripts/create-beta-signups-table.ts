/**
 * Create beta_signups table
 * Run this once to create the table without risking data loss from other schema changes
 */

import { pool } from "../server/db";

const sql = `
-- Beta Signups table for capturing email addresses during beta program
CREATE TABLE IF NOT EXISTS "beta_signups" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "user_type" TEXT DEFAULT 'unknown',
  "source" TEXT DEFAULT 'landing_page',
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS "beta_signups_email_idx" ON "beta_signups" ("email");
CREATE INDEX IF NOT EXISTS "beta_signups_created_at_idx" ON "beta_signups" ("created_at");
`;

async function createBetaSignupsTable() {
  try {
    console.log("Creating beta_signups table...");
    await pool.query(sql);
    console.log("✓ beta_signups table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating beta_signups table:", error);
    process.exit(1);
  }
}

createBetaSignupsTable();
