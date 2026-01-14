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
